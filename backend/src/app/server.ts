import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { env } from '../common/config/env.js';
import { registerErrorHandler } from '../common/http/errors.js';
import { closeDatabase } from '../db/client.js';
import { registerHealthRoutes } from '../modules/health/routes.js';
import { registerAuthRoutes } from '../modules/auth/routes.js';
import { registerCabinetRoutes } from '../modules/cabinets/routes.js';
import { registerKeyRoutes } from '../modules/keys/routes.js';
import { registerRecordRoutes } from '../modules/records/routes.js';
import { registerUserRoutes } from '../modules/users/routes.js';
import type { PasswordResetNotifier } from '../integrations/notifications/password-reset-notifier.js';

export type BuildServerOptions = {
  passwordResetNotifier?: PasswordResetNotifier;
};

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: 64 * 1024,
    logger: {
      level: env.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
    },
  });

  registerErrorHandler(app);

  await app.register(sensible);
  await app.register(helmet);
  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN === '*' ? true : env.FRONTEND_ORIGIN,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
  });

  app.addHook('onClose', closeDatabase);

  await app.register(registerHealthRoutes, { prefix: '/api/v1/health' });
  await app.register(registerAuthRoutes, {
    prefix: '/api/v1/auth',
    notifier: options.passwordResetNotifier,
  });
  await app.register(registerUserRoutes, { prefix: '/api/v1/users' });
  await app.register(registerCabinetRoutes, { prefix: '/api/v1/cabinets' });
  await app.register(registerKeyRoutes, { prefix: '/api/v1' });
  await app.register(registerRecordRoutes, { prefix: '/api/v1/records' });

  return app;
}
