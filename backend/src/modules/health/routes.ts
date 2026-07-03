import type { FastifyInstance } from 'fastify';

import { ok } from '../../common/http/response.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () =>
    ok({
      service: 'uniclife-keycabinet-backend',
      status: 'ok',
    }),
  );
}
