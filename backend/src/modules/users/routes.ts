import type { FastifyInstance } from 'fastify';

import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { ok } from '../../common/http/response.js';

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_request, reply) => {
    if (!db) {
      return reply.status(503).send({
        code: 'DATABASE_NOT_CONFIGURED',
        message: '数据库未配置，当前仅可使用健康检查接口',
        data: null,
      });
    }

    const rows = await db.select().from(users).limit(20);
    return ok(rows);
  });
}
