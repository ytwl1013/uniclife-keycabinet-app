import {
  adminFeedbackQuerySchema,
  entityIdSchema,
  feedbackReplyRequestSchema,
} from '@uniclife/shared';
import type { FastifyInstance } from 'fastify';

import { assertApp, errorCode } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { requireDatabase } from '../../db/client.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';
import { appendAudit } from '../audit/service.js';
import type { RealtimePublisher } from '../realtime/hub.js';
import {
  createFeedbackReply,
  getFeedbackThread,
  listFeedbackThreads,
  markFeedbackMessageDelivered,
  markFeedbackMessageFailed,
  markFeedbackMessagesRead,
} from '../support/service.js';

export type AdminSupportRouteOptions = {
  notifier?: FeedbackNotifier;
  realtime: RealtimePublisher;
};

export async function registerAdminSupportRoutes(
  app: FastifyInstance,
  options: AdminSupportRouteOptions,
): Promise<void> {
  app.get('/feedback', async (request) => {
    const query = adminFeedbackQuerySchema.parse(request.query);
    const result = await listFeedbackThreads(requireDatabase(), {
      audience: 'support',
      limit: query.limit,
      offset: query.offset,
      query: query.query,
      status: query.status,
    });
    return ok({ ...result, limit: query.limit, offset: query.offset });
  });

  app.get<{ Params: { feedbackId: string } }>('/feedback/:feedbackId', async (request) => {
    const feedbackId = entityIdSchema.parse(request.params.feedbackId);
    const thread = await getFeedbackThread(requireDatabase(), {
      audience: 'support',
      feedbackId,
    });
    assertApp(thread, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');
    return ok(thread);
  });

  app.post<{ Params: { feedbackId: string } }>(
    '/feedback/:feedbackId/read',
    async (request) => {
      const feedbackId = entityIdSchema.parse(request.params.feedbackId);
      const database = requireDatabase();
      const thread = await getFeedbackThread(database, { audience: 'support', feedbackId });
      assertApp(thread, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');
      const markedReadCount = await markFeedbackMessagesRead(database, {
        audience: 'support',
        feedbackId,
      });
      return ok({ markedReadCount });
    },
  );

  app.post<{ Params: { feedbackId: string } }>(
    '/feedback/:feedbackId/messages',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const feedbackId = entityIdSchema.parse(request.params.feedbackId);
      const input = feedbackReplyRequestSchema.parse(request.body);
      const database = requireDatabase();
      const current = await getFeedbackThread(database, { audience: 'support', feedbackId });
      assertApp(current, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');

      let message;
      try {
        message = await createFeedbackReply(database, {
          content: input.content,
          feedbackId,
          sender: 'support',
          senderDisplayName: 'UnicLife 客服',
        });
      } catch (error) {
        await appendAudit(database, {
          action: 'admin.feedback_replied',
          metadata: { adminActor: 'environment_admin' },
          reasonCode: errorCode(error),
          result: 'failure',
          targetId: feedbackId,
          targetType: 'feedback',
        });
        throw error;
      }
      try {
        await markFeedbackMessagesRead(database, { audience: 'support', feedbackId });
      } catch (readError) {
        request.log.warn(
          { err: readError, feedbackId },
          'admin feedback user-message read state update failed',
        );
      }

      let emailDelivered = false;
      try {
        if (!options.notifier?.sendSupportReply) throw new Error('FEEDBACK_EMAIL_UNAVAILABLE');
        await options.notifier.sendSupportReply({
          content: message.content,
          createdAt: message.createdAt,
          feedbackId,
          supportDisplayName: message.senderDisplayName,
          title: current.title,
          type: current.type,
          user: {
            displayName: current.userDisplayName,
            email: current.userEmail,
            id: current.userId,
          },
        });
        await markFeedbackMessageDelivered(database, message.id);
        emailDelivered = true;
      } catch (error) {
        await markFeedbackMessageFailed(database, message.id, errorCode(error));
        request.log.warn(
          { feedbackId, messageId: message.id, userId: current.userId },
          'support reply email delivery failed',
        );
      }

      try {
        await appendAudit(database, {
          action: 'admin.feedback_replied',
          metadata: { adminActor: 'environment_admin', emailDelivered },
          result: 'success',
          targetId: feedbackId,
          targetType: 'feedback',
        });
      } catch (auditError) {
        request.log.warn(
          { err: auditError, feedbackId },
          'admin feedback reply audit storage failed',
        );
      }
      options.realtime.publishSupportMessage({ feedbackId, userId: current.userId });
      const thread = await getFeedbackThread(database, { audience: 'support', feedbackId });
      assertApp(thread, 404, 'FEEDBACK_NOT_FOUND', '反馈不存在');
      return reply.status(201).send(ok({ thread }, '客服回复已发送'));
    },
  );
}
