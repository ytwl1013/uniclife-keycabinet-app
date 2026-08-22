import { and, eq, lt } from 'drizzle-orm';

import type { AppDatabase, AppTransaction } from '../../db/client.js';
import { idempotencyRecords } from '../../db/schema.js';
import { AppError } from './errors.js';

type IdempotencyInput = {
  actorId: string;
  operation: string;
  requestId?: string;
  statusCode?: number;
};

export async function executeIdempotent<T>(
  database: AppDatabase,
  input: IdempotencyInput,
  action: (transaction: AppTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    if (!input.requestId) {
      return action(transaction);
    }

    const now = new Date().toISOString();
    await transaction
      .delete(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.actorId, input.actorId),
          eq(idempotencyRecords.operation, input.operation),
          eq(idempotencyRecords.requestId, input.requestId),
          lt(idempotencyRecords.expiresAt, now),
        ),
      );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const claimed = await transaction
      .insert(idempotencyRecords)
      .values({
        actorId: input.actorId,
        operation: input.operation,
        requestId: input.requestId,
        statusCode: 0,
        responseBody: null,
        expiresAt,
      })
      .onConflictDoNothing()
      .returning({ requestId: idempotencyRecords.requestId });

    if (claimed.length === 0) {
      const [existing] = await transaction
        .select()
        .from(idempotencyRecords)
        .where(
          and(
            eq(idempotencyRecords.actorId, input.actorId),
            eq(idempotencyRecords.operation, input.operation),
            eq(idempotencyRecords.requestId, input.requestId),
          ),
        )
        .limit(1);
      if (!existing || existing.statusCode === 0) {
        throw new AppError(409, 'REQUEST_IN_PROGRESS', '相同请求正在处理中');
      }
      return existing.responseBody as T;
    }

    const result = await action(transaction);
    await transaction
      .update(idempotencyRecords)
      .set({ statusCode: input.statusCode ?? 200, responseBody: result })
      .where(
        and(
          eq(idempotencyRecords.actorId, input.actorId),
          eq(idempotencyRecords.operation, input.operation),
          eq(idempotencyRecords.requestId, input.requestId),
        ),
      );
    return result;
  });
}
