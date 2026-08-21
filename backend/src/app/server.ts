import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { env } from '../common/config/env.js';
import { registerErrorHandler } from '../common/http/errors.js';
import { closeDatabase } from '../db/client.js';
import { registerHealthRoutes } from '../modules/health/routes.js';
import { registerUserRoutes } from '../modules/users/routes.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
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
  await app.register(registerUserRoutes, { prefix: '/api/v1/users' });

  return app;
}
