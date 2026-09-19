import type { HealthStatus } from '@uniclife/shared';
import type { FastifyInstance } from 'fastify';

import { ok } from '../../common/http/response.js';
import { sql } from '../../db/client.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => {
    if (sql) {
      await sql`select 1`;
    }

    const revision = process.env.RENDER_GIT_COMMIT?.trim();
    return ok({
      service: 'uniclife-keycabinet-backend',
      status: 'ok',
      ...(revision && /^[a-f0-9]{40}$/i.test(revision) ? { revision } : {}),
    } satisfies HealthStatus);
  });
}
