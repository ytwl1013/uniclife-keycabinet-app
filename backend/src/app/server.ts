import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';

import { env } from '../common/config/env.js';
import { registerErrorHandler } from '../common/http/errors.js';
import { closeDatabase } from '../db/client.js';
import { registerHealthRoutes } from '../modules/health/routes.js';
import { registerAdminRoutes } from '../modules/admin/routes.js';
import { registerAuthRoutes } from '../modules/auth/routes.js';
import { registerCabinetRoutes } from '../modules/cabinets/routes.js';
import { registerKeyRoutes } from '../modules/keys/routes.js';
import { registerRecordRoutes } from '../modules/records/routes.js';
import { RealtimeHub } from '../modules/realtime/hub.js';
import { registerRealtimeRoutes } from '../modules/realtime/routes.js';
import { registerSupportRoutes } from '../modules/support/routes.js';
import { registerUserRoutes } from '../modules/users/routes.js';
import {
  createSmtpFeedbackNotifier,
  type FeedbackNotifier,
} from '../integrations/notifications/feedback-notifier.js';
import type { PasswordResetNotifier } from '../integrations/notifications/password-reset-notifier.js';

export type BuildServerOptions = {
  feedbackNotifier?: FeedbackNotifier;
  passwordResetNotifier?: PasswordResetNotifier;
  realtime?: RealtimeHub;
};

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: 64 * 1024,
    logger: {
      level: env.LOG_LEVEL,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.sec-websocket-protocol',
        'password',
        'token',
      ],
    },
  });

  registerErrorHandler(app);

  const realtime = options.realtime ?? new RealtimeHub();
  const feedbackNotifier = options.feedbackNotifier ?? createSmtpFeedbackNotifier();
  realtime.start();

  await app.register(sensible);
  await app.register(websocket, { options: { maxPayload: 1024 } });
  await app.register(helmet);
  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN === '*' ? true : env.FRONTEND_ORIGIN,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
  });

  app.addHook('onClose', async () => {
    realtime.stop();
    await closeDatabase();
  });

  await app.register(registerHealthRoutes, { prefix: '/api/v1/health' });
  await app.register(registerAdminRoutes, {
    notifier: feedbackNotifier,
    prefix: '/api/v1/admin',
    realtime,
  });
  await app.register(registerAuthRoutes, {
    prefix: '/api/v1/auth',
    notifier: options.passwordResetNotifier,
    realtime,
  });
  await app.register(registerUserRoutes, { prefix: '/api/v1/users', realtime });
  await app.register(registerCabinetRoutes, { prefix: '/api/v1/cabinets', realtime });
  await app.register(registerKeyRoutes, { prefix: '/api/v1', realtime });
  await app.register(registerRecordRoutes, { prefix: '/api/v1/records' });
  await app.register(registerSupportRoutes, {
    prefix: '/api/v1/support',
    notifier: feedbackNotifier,
  });
  await app.register(registerRealtimeRoutes, { prefix: '/api/v1/realtime', realtime });

  return app;
}
