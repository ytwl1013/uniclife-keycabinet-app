import { feedbackHistoryQuerySchema, feedbackRequestSchema } from '@uniclife/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../common/auth/session.js';
import { AppError, errorCode } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase } from '../../db/client.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';
import { appendAudit } from '../audit/service.js';
import {
  createFeedbackRecord,
  listFeedbackRecords,
  markFeedbackDelivered,
  markFeedbackFailed,
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
      const submittedAt = new Date().toISOString();
      await createFeedbackRecord(database, { feedback, submissionId, submittedAt, user });

      if (!options.notifier) {
        await markFeedbackFailed(database, submissionId, 'FEEDBACK_UNAVAILABLE');
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
          await markFeedbackFailed(database, submissionId, errorCode(error));
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
            metadata: {
              imageCount: feedback.images.length,
              type: feedback.type,
            },
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
        await markFeedbackDelivered(database, submissionId, new Date().toISOString());
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
          metadata: {
            imageCount: feedback.images.length,
            type: feedback.type,
          },
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
      return reply.status(201).send(ok(result, '反馈已提交'));
    },
  );
};
