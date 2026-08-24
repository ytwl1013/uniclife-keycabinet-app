import { feedbackRequestSchema } from '@uniclife/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../common/auth/session.js';
import { AppError, errorCode } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase } from '../../db/client.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';
import { appendAudit } from '../audit/service.js';
import { submitFeedback } from './service.js';

type SupportRouteOptions = {
  notifier?: FeedbackNotifier;
};

export const registerSupportRoutes: FastifyPluginAsync<SupportRouteOptions> = async (
  app,
  options,
) => {
  app.post(
    '/feedback',
    {
      bodyLimit: 11 * 1024 * 1024,
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const user = await requireAuth(request);
      if (!options.notifier) {
        throw new AppError(503, 'FEEDBACK_UNAVAILABLE', '反馈服务暂时不可用');
      }

      const feedback = feedbackRequestSchema.parse(request.body);
      const database = requireDatabase();
      const submissionId = createEntityId('feedback');
      try {
        const result = await submitFeedback({
          feedback,
          notifier: options.notifier,
          submissionId,
          user,
        });
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
      } catch (error) {
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
    },
  );
};
