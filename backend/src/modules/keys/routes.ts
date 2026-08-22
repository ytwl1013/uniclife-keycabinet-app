import {
  addKeyRequestSchema,
  checkoutKeyRequestSchema,
  entityIdSchema,
  returnKeyRequestSchema,
  updateKeyRequestSchema,
  writeOptionsSchema,
} from '@uniclife/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../../common/auth/session.js';
import { toEvent, toKey } from '../../common/domain/mappers.js';
import { AppError, errorCode } from '../../common/http/errors.js';
import { executeIdempotent } from '../../common/http/idempotency.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase, type AppDatabase } from '../../db/client.js';
import { cabinetEvents, keys, keySlots, loans } from '../../db/schema.js';
import { appendAudit } from '../audit/service.js';
import { requireCabinetMember, touchCabinet } from '../cabinets/service.js';

const cabinetParamsSchema = z.object({ cabinetId: entityIdSchema });
const keyParamsSchema = z.object({ keyId: entityIdSchema });

async function recordFailure(
  database: AppDatabase,
  actorId: string,
  action: string,
  targetId: string,
  error: unknown,
): Promise<void> {
  try {
    await appendAudit(database, {
      actorId,
      action,
      targetType: 'key',
      targetId,
      result: 'failure',
      reasonCode: errorCode(error),
    });
  } catch {
    // Do not replace the original business failure with an audit storage failure.
  }
}

export async function registerKeyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/cabinets/:cabinetId/keys', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const input = addKeyRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'keys.add',
          requestId: input.requestId,
        },
        async (transaction) => {
          await requireCabinetMember(transaction, cabinetId, currentUser.id);
          const [slot] = await transaction
            .select()
            .from(keySlots)
            .where(and(eq(keySlots.id, input.slotId), eq(keySlots.cabinetId, cabinetId)))
            .limit(1);
          if (!slot) {
            throw new AppError(404, 'SLOT_NOT_FOUND', '槽位不存在');
          }
          const [occupied] = await transaction
            .select({ id: keys.id })
            .from(keys)
            .where(eq(keys.slotId, slot.id))
            .limit(1);
          if (occupied) {
            throw new AppError(409, 'SLOT_OCCUPIED', '该槽位已有钥匙');
          }
          const [created] = await transaction
            .insert(keys)
            .values({
              id: createEntityId('key'),
              cabinetId,
              slotId: slot.id,
              name: input.name,
              note: input.note,
            })
            .returning();
          if (!created) {
            throw new AppError(500, 'KEY_CREATE_FAILED', '钥匙创建失败');
          }
          const eventId = createEntityId('event');
          await transaction.insert(cabinetEvents).values({
            id: eventId,
            cabinetId,
            keyId: created.id,
            actorId: currentUser.id,
            type: 'key_added',
            summaryData: {
              keyName: created.name,
              slotId: slot.id,
              position: slot.position,
            },
          });
          const touched = await touchCabinet(transaction, cabinetId, input.expectedVersion);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'keys.added',
            targetType: 'key',
            targetId: created.id,
            result: 'success',
            metadata: { cabinetId, eventId, slotId: slot.id },
          });
          return ok(
            { key: toKey(created), cabinetVersion: touched.version },
            '钥匙已添加',
          );
        },
      );
    } catch (error) {
      await recordFailure(database, currentUser.id, 'keys.added', input.slotId, error);
      throw error;
    }
  });

  app.patch('/keys/:keyId', async (request) => {
    const { keyId } = keyParamsSchema.parse(request.params);
    const input = updateKeyRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'keys.update',
          requestId: input.requestId,
        },
        async (transaction) => {
          const [current] = await transaction.select().from(keys).where(eq(keys.id, keyId)).limit(1);
          if (!current) {
            throw new AppError(404, 'KEY_NOT_FOUND', '钥匙不存在');
          }
          await requireCabinetMember(transaction, current.cabinetId, currentUser.id);
          const [updated] = await transaction
            .update(keys)
            .set({
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.note !== undefined ? { note: input.note } : {}),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(keys.id, keyId))
            .returning();
          if (!updated) {
            throw new AppError(404, 'KEY_NOT_FOUND', '钥匙不存在');
          }
          const eventId = createEntityId('event');
          await transaction.insert(cabinetEvents).values({
            id: eventId,
            cabinetId: current.cabinetId,
            keyId,
            actorId: currentUser.id,
            type: 'key_updated',
            summaryData: {
              keyName: updated.name,
              previousName: current.name,
              nextName: updated.name,
              changedName: input.name !== undefined,
              changedNote: input.note !== undefined,
            },
          });
          const touched = await touchCabinet(
            transaction,
            current.cabinetId,
            input.expectedVersion,
          );
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'keys.updated',
            targetType: 'key',
            targetId: keyId,
            result: 'success',
            metadata: { cabinetId: current.cabinetId, eventId },
          });
          return ok(
            { key: toKey(updated), cabinetVersion: touched.version },
            '钥匙信息已更新',
          );
        },
      );
    } catch (error) {
      await recordFailure(database, currentUser.id, 'keys.updated', keyId, error);
      throw error;
    }
  });

  app.delete('/keys/:keyId', async (request) => {
    const { keyId } = keyParamsSchema.parse(request.params);
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'keys.delete',
          requestId: input.requestId,
        },
        async (transaction) => {
          const [current] = await transaction.select().from(keys).where(eq(keys.id, keyId)).limit(1);
          if (!current) {
            throw new AppError(404, 'KEY_NOT_FOUND', '钥匙不存在');
          }
          await requireCabinetMember(transaction, current.cabinetId, currentUser.id);
          const [activeLoan] = await transaction
            .select({ id: loans.id })
            .from(loans)
            .where(and(eq(loans.keyId, keyId), eq(loans.status, 'active')))
            .limit(1);
          if (activeLoan) {
            throw new AppError(409, 'ACTIVE_LOANS_BLOCK_CLEAR', '请先归还该钥匙');
          }
          await transaction.delete(keys).where(eq(keys.id, keyId));
          const eventId = createEntityId('event');
          await transaction.insert(cabinetEvents).values({
            id: eventId,
            cabinetId: current.cabinetId,
            keyId,
            actorId: currentUser.id,
            type: 'key_deleted',
            summaryData: {
              keyName: current.name,
              slotId: current.slotId,
            },
          });
          const touched = await touchCabinet(
            transaction,
            current.cabinetId,
            input.expectedVersion,
          );
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'keys.deleted',
            targetType: 'key',
            targetId: keyId,
            result: 'success',
            metadata: { cabinetId: current.cabinetId, eventId },
          });
          return ok({ deleted: true, cabinetVersion: touched.version }, '钥匙已删除');
        },
      );
    } catch (error) {
      await recordFailure(database, currentUser.id, 'keys.deleted', keyId, error);
      throw error;
    }
  });

  app.post('/keys/:keyId/checkout', async (request) => {
    const { keyId } = keyParamsSchema.parse(request.params);
    const input = checkoutKeyRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'keys.checkout',
          requestId: input.requestId,
        },
        async (transaction) => {
          const [current] = await transaction.select().from(keys).where(eq(keys.id, keyId)).limit(1);
          if (!current) {
            throw new AppError(404, 'KEY_NOT_FOUND', '钥匙不存在');
          }
          await requireCabinetMember(transaction, current.cabinetId, currentUser.id);
          if (current.status !== 'available') {
            throw new AppError(409, 'KEY_NOT_AVAILABLE', '钥匙当前不可领取');
          }
          const checkedOutAt = input.checkedOutAt ?? new Date().toISOString();
          if (
            input.expectedReturnAt &&
            Date.parse(input.expectedReturnAt) <= Date.parse(checkedOutAt)
          ) {
            throw new AppError(400, 'EXPECTED_RETURN_INVALID', '预计归还时间必须晚于领取时间');
          }
          const [updatedKey] = await transaction
            .update(keys)
            .set({ status: 'borrowed', updatedAt: checkedOutAt })
            .where(and(eq(keys.id, keyId), eq(keys.status, 'available')))
            .returning();
          if (!updatedKey) {
            throw new AppError(409, 'KEY_NOT_AVAILABLE', '钥匙已被其他操作领取');
          }
          const loanId = createEntityId('loan');
          const eventId = createEntityId('event');
          const [event] = await transaction
            .insert(cabinetEvents)
            .values({
              id: eventId,
              cabinetId: current.cabinetId,
              keyId,
              actorId: currentUser.id,
              type: 'checkout',
              occurredAt: checkedOutAt,
              relatedLoanId: loanId,
              summaryData: {
                borrowerName: input.borrowerName,
                keyName: current.name,
              },
            })
            .returning();
          await transaction.insert(loans).values({
            id: loanId,
            cabinetId: current.cabinetId,
            keyId,
            borrowerName: input.borrowerName,
            borrowerContact: input.borrowerContact,
            checkedOutAt,
            expectedReturnAt: input.expectedReturnAt,
            operatorId: currentUser.id,
            checkoutEventId: eventId,
          });
          const touched = await touchCabinet(
            transaction,
            current.cabinetId,
            input.expectedVersion,
          );
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'keys.checked_out',
            targetType: 'key',
            targetId: keyId,
            result: 'success',
            metadata: { cabinetId: current.cabinetId, loanId, eventId },
          });
          if (!event) {
            throw new AppError(500, 'EVENT_CREATE_FAILED', '领取记录创建失败');
          }
          return ok(
            {
              key: toKey(updatedKey),
              event: toEvent(event),
              cabinetVersion: touched.version,
            },
            '钥匙已领取',
          );
        },
      );
    } catch (error) {
      await recordFailure(database, currentUser.id, 'keys.checked_out', keyId, error);
      throw error;
    }
  });

  app.post('/keys/:keyId/return', async (request) => {
    const { keyId } = keyParamsSchema.parse(request.params);
    const input = returnKeyRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'keys.return',
          requestId: input.requestId,
        },
        async (transaction) => {
          const [current] = await transaction.select().from(keys).where(eq(keys.id, keyId)).limit(1);
          if (!current) {
            throw new AppError(404, 'KEY_NOT_FOUND', '钥匙不存在');
          }
          await requireCabinetMember(transaction, current.cabinetId, currentUser.id);
          if (current.status !== 'borrowed') {
            throw new AppError(409, 'KEY_NOT_BORROWED', '钥匙当前未被领取');
          }
          const [activeLoan] = await transaction
            .select()
            .from(loans)
            .where(and(eq(loans.keyId, keyId), eq(loans.status, 'active')))
            .limit(1);
          if (!activeLoan) {
            throw new AppError(409, 'ACTIVE_LOAN_NOT_FOUND', '未找到有效借用记录');
          }
          const returnedAt = input.returnedAt ?? new Date().toISOString();
          if (Date.parse(returnedAt) < Date.parse(activeLoan.checkedOutAt)) {
            throw new AppError(400, 'INVALID_INPUT', '归还时间不能早于领取时间');
          }
          const eventId = createEntityId('event');
          const [event] = await transaction
            .insert(cabinetEvents)
            .values({
              id: eventId,
              cabinetId: current.cabinetId,
              keyId,
              actorId: currentUser.id,
              type: 'return',
              occurredAt: returnedAt,
              relatedLoanId: activeLoan.id,
              summaryData: { keyName: current.name },
            })
            .returning();
          const [updatedLoan] = await transaction
            .update(loans)
            .set({
              status: 'returned',
              returnedAt,
              returnOperatorId: currentUser.id,
              returnEventId: eventId,
            })
            .where(and(eq(loans.id, activeLoan.id), eq(loans.status, 'active')))
            .returning();
          if (!updatedLoan) {
            throw new AppError(409, 'ACTIVE_LOAN_NOT_FOUND', '借用记录已被其他操作更新');
          }
          const [updatedKey] = await transaction
            .update(keys)
            .set({ status: 'available', updatedAt: returnedAt })
            .where(and(eq(keys.id, keyId), eq(keys.status, 'borrowed')))
            .returning();
          if (!updatedKey || !event) {
            throw new AppError(409, 'KEY_NOT_BORROWED', '钥匙状态已被其他操作更新');
          }
          const touched = await touchCabinet(
            transaction,
            current.cabinetId,
            input.expectedVersion,
          );
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'keys.returned',
            targetType: 'key',
            targetId: keyId,
            result: 'success',
            metadata: {
              cabinetId: current.cabinetId,
              loanId: activeLoan.id,
              eventId,
            },
          });
          return ok(
            {
              key: toKey(updatedKey),
              event: toEvent(event),
              cabinetVersion: touched.version,
            },
            '钥匙已归还',
          );
        },
      );
    } catch (error) {
      await recordFailure(database, currentUser.id, 'keys.returned', keyId, error);
      throw error;
    }
  });
}
