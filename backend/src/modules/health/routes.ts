import type { FastifyInstance } from 'fastify';

import { ok } from '../../common/http/response.js';
import { sql } from '../../db/client.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => {
    if (sql) {
      await sql`select 1`;
    }

    return ok({
      service: 'uniclife-keycabinet-backend',
      status: 'ok',
    });
  });
}
