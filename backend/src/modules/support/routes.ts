import {
  entityIdSchema,
  feedbackHistoryQuerySchema,
  feedbackReplyRequestSchema,
  feedbackRequestSchema,
} from '@uniclife/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../common/auth/session.js';
import { AppError, assertApp, errorCode } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase } from '../../db/client.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';
import { appendAudit } from '../audit/service.js';
import {
  createFeedbackRecord,
  createFeedbackReply,
  getFeedbackThread,
  listFeedbackRecords,
  markFeedbackDelivered,
  markFeedbackFailed,
  markFeedbackMessageDelivered,
  markFeedbackMessageFailed,
  markFeedbackMessagesRead,
  submitFeedback,
} from './service.js';

type SupportRouteOptions = {
  notifier?: FeedbackNotifier;
};

export const registerSupportRoutes: FastifyPluginAsync<SupportRouteOptions> = async (
  app,
  options,
) => {
  app.get('/feedback', async (request) => {
    const user = await requireAuth(request);
    const { limit } = feedbackHistoryQuerySchema.parse(request.query);
    const items = await listFeedbackRecords(requireDatabase(), user.id, limit);
    return ok({ items });
  });

  app.get<{ Params: { feedbackId: string } }>('/feedback/:feedbackId', async (request) => {
    const user = await requireAuth(request);
    const feedbackId = entityIdSchema.parse(request.params.feedbackId);
    const thread = await getFeedbackThread(requireDatabase(), {
      audience: 'user',
      feedbackId,
      userId: user.id,
    });
    assertApp(thread, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');
    return ok(thread);
  });

  app.post<{ Params: { feedbackId: string } }>(
    '/feedback/:feedbackId/read',
    { config: { rateLimit: { max: 100, timeWindow: '1 minute' } } },
    async (request) => {
      const user = await requireAuth(request);
      const feedbackId = entityIdSchema.parse(request.params.feedbackId);
      const markedReadCount = await markFeedbackMessagesRead(requireDatabase(), {
        audience: 'user',
        feedbackId,
        userId: user.id,
      });
      assertApp(markedReadCount >= 0, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');
      return ok({ markedReadCount });
    },
  );

  app.post<{ Params: { feedbackId: string } }>(
    '/feedback/:feedbackId/messages',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const user = await requireAuth(request);
      const feedbackId = entityIdSchema.parse(request.params.feedbackId);
      const input = feedbackReplyRequestSchema.parse(request.body);
      const database = requireDatabase();
      const current = await getFeedbackThread(database, {
        audience: 'user',
        feedbackId,
        userId: user.id,
      });
      assertApp(current, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');

      let message;
      try {
        message = await createFeedbackReply(database, {
          content: input.content,
          feedbackId,
          sender: 'user',
          senderDisplayName: user.displayName,
          senderUserId: user.id,
          userId: user.id,
        });
      } catch (error) {
        await appendAudit(database, {
          action: 'support.feedback_replied',
          actorId: user.id,
          result: 'failure',
          reasonCode: errorCode(error),
          targetId: feedbackId,
          targetType: 'feedback',
        });
        throw error;
      }
      try {
        await markFeedbackMessagesRead(database, { audience: 'user', feedbackId, userId: user.id });
      } catch (readError) {
        request.log.warn(
          { err: readError, feedbackId, userId: user.id },
          'feedback support-message read state update failed',
        );
      }

      let emailDelivered = false;
      try {
        if (!options.notifier?.sendUserReply) throw new Error('FEEDBACK_EMAIL_UNAVAILABLE');
        await options.notifier.sendUserReply({
          content: message.content,
          createdAt: message.createdAt,
          feedbackId,
          title: current.title,
          type: current.type,
          user: { displayName: user.displayName, email: user.email, id: user.id },
        });
        await markFeedbackMessageDelivered(database, message.id);
        emailDelivered = true;
      } catch (error) {
        await markFeedbackMessageFailed(database, message.id, errorCode(error));
        request.log.warn(
          { feedbackId, messageId: message.id, userId: user.id },
          'feedback reply email delivery failed',
        );
      }

      try {
        await appendAudit(database, {
          action: 'support.feedback_replied',
          actorId: user.id,
          metadata: { emailDelivered },
          result: 'success',
          targetId: feedbackId,
          targetType: 'feedback',
        });
      } catch (auditError) {
        request.log.warn(
          { err: auditError, feedbackId, userId: user.id },
          'feedback reply audit storage failed',
        );
      }
      const thread = await getFeedbackThread(database, {
        audience: 'user',
        feedbackId,
        userId: user.id,
      });
      assertApp(thread, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');
      return reply.status(201).send(ok({ thread }, '回复已发送'));
    },
  );

  app.post(
    '/feedback',
    {
      bodyLimit: 11 * 1024 * 1024,
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const user = await requireAuth(request);
      const feedback = feedbackRequestSchema.parse(request.body);
      const database = requireDatabase();
      const submissionId = createEntityId('feedback');
      const initialMessageId = createEntityId('feedback-message');
      const submittedAt = new Date().toISOString();
      await createFeedbackRecord(database, {
        feedback,
        initialMessageId,
        submissionId,
        submittedAt,
        user,
      });

      if (!options.notifier) {
        await markFeedbackFailed(
          database,
          submissionId,
          initialMessageId,
          'FEEDBACK_UNAVAILABLE',
        );
        try {
          await appendAudit(database, {
            action: 'support.feedback_submitted',
            actorId: user.id,
            metadata: { imageCount: feedback.images.length, type: feedback.type },
            reasonCode: 'FEEDBACK_UNAVAILABLE',
            result: 'failure',
            targetId: submissionId,
            targetType: 'feedback',
          });
        } catch {
          // Preserve the unavailable response when audit storage is unavailable.
        }
        throw new AppError(503, 'FEEDBACK_UNAVAILABLE', '反馈服务暂时不可用');
      }

      let result: { submissionId: string; submittedAt: string };
      try {
        result = await submitFeedback({
          feedback,
          notifier: options.notifier,
          submissionId,
          submittedAt,
          user,
        });
      } catch (error) {
        try {
          await markFeedbackFailed(database, submissionId, initialMessageId, errorCode(error));
        } catch (recordError) {
          request.log.warn(
            { err: recordError, submissionId, userId: user.id },
            'feedback failure status storage failed',
          );
        }
        try {
          await appendAudit(database, {
            action: 'support.feedback_submitted',
            actorId: user.id,
            metadata: { imageCount: feedback.images.length, type: feedback.type },
            reasonCode: errorCode(error),
            result: 'failure',
            targetId: submissionId,
            targetType: 'feedback',
          });
        } catch {
          // Preserve the mail delivery failure when audit storage is unavailable.
        }
        request.log.error(
          { err: error, submissionId, userId: user.id },
          'feedback delivery failed',
        );
        throw new AppError(502, 'FEEDBACK_SEND_FAILED', '反馈发送失败，请稍后重试');
      }

      try {
        await markFeedbackDelivered(
          database,
          submissionId,
          initialMessageId,
          new Date().toISOString(),
        );
      } catch (recordError) {
        request.log.warn(
          { err: recordError, submissionId, userId: user.id },
          'feedback delivery status storage failed',
        );
      }
      try {
        await appendAudit(database, {
          action: 'support.feedback_submitted',
          actorId: user.id,
          metadata: { imageCount: feedback.images.length, type: feedback.type },
          result: 'success',
          targetId: submissionId,
          targetType: 'feedback',
        });
      } catch (auditError) {
        request.log.warn(
          { err: auditError, submissionId, userId: user.id },
          'feedback audit storage failed',
        );
      }
      const thread = await getFeedbackThread(database, {
        audience: 'user',
        feedbackId: submissionId,
        userId: user.id,
      });
      return reply.status(201).send(ok({ ...result, thread }, '反馈已提交'));
    },
  );
};
