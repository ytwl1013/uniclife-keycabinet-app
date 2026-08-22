import {
  bindCabinetRequestSchema,
  entityIdSchema,
  renameCabinetRequestSchema,
  resolveCabinetQrRequestSchema,
  writeOptionsSchema,
} from '@uniclife/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../../common/auth/session.js';
import {
  toCabinet,
  toKey,
  toLoan,
  toMembership,
  toQr,
  toSku,
  toUser,
} from '../../common/domain/mappers.js';
import { AppError, errorCode } from '../../common/http/errors.js';
import { executeIdempotent } from '../../common/http/idempotency.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase, type AppDatabase } from '../../db/client.js';
import {
  cabinetEvents,
  cabinetMemberships,
  cabinetQrs,
  cabinets,
  keys,
  keySlots,
  loans,
  productSkus,
  users,
} from '../../db/schema.js';
import { appendAudit } from '../audit/service.js';
import { parseCabinetQrPayload } from './qr.js';
import {
  getCabinetSummary,
  requireCabinetMember,
  touchCabinet,
} from './service.js';

const cabinetParamsSchema = z.object({ cabinetId: entityIdSchema });
const memberParamsSchema = z.object({
  cabinetId: entityIdSchema,
  membershipId: entityIdSchema,
});

async function recordFailure(
  database: AppDatabase,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  error: unknown,
): Promise<void> {
  try {
    await appendAudit(database, {
      actorId,
      action,
      targetType,
      targetId,
      result: 'failure',
      reasonCode: errorCode(error),
    });
  } catch {
    // Preserve the original business error when audit storage is unavailable.
  }
}

export async function registerCabinetRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request) => {
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    const rows = await database
      .select({ cabinet: cabinets, sku: productSkus })
      .from(cabinetMemberships)
      .innerJoin(cabinets, eq(cabinetMemberships.cabinetId, cabinets.id))
      .innerJoin(productSkus, eq(cabinets.skuId, productSkus.id))
      .where(
        and(
          eq(cabinetMemberships.userId, currentUser.id),
          eq(cabinetMemberships.active, true),
        ),
      )
      .orderBy(asc(cabinets.createdAt));
    const summaries = await Promise.all(
      rows.map((row) => getCabinetSummary(database, row.cabinet.id)),
    );
    return ok(summaries);
  });

  app.get('/:cabinetId', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    await requireCabinetMember(database, cabinetId, currentUser.id);
    const summary = await getCabinetSummary(database, cabinetId);
    const [slotRows, keyRows, memberRows, loanRows] = await Promise.all([
      database
        .select()
        .from(keySlots)
        .where(eq(keySlots.cabinetId, cabinetId))
        .orderBy(asc(keySlots.position)),
      database.select().from(keys).where(eq(keys.cabinetId, cabinetId)),
      database
        .select({ membership: cabinetMemberships, user: users })
        .from(cabinetMemberships)
        .innerJoin(users, eq(cabinetMemberships.userId, users.id))
        .where(
          and(
            eq(cabinetMemberships.cabinetId, cabinetId),
            eq(cabinetMemberships.active, true),
          ),
        ),
      database
        .select()
        .from(loans)
        .where(and(eq(loans.cabinetId, cabinetId), eq(loans.status, 'active'))),
    ]);
    const keyIdBySlot = new Map(keyRows.map((key) => [key.slotId, key.id]));
    return ok({
      ...summary,
      slots: slotRows.map((slot) => ({
        id: slot.id,
        cabinetId: slot.cabinetId,
        position: slot.position,
        keyId: keyIdBySlot.get(slot.id) ?? null,
      })),
      keys: keyRows.map(toKey),
      members: memberRows.map((row) => ({
        membership: toMembership(row.membership),
        user: toUser(row.user),
      })),
      activeLoans: loanRows.map(toLoan),
    });
  });

  app.post('/resolve-qr', async (request) => {
    const input = resolveCabinetQrRequestSchema.parse(request.body);
    await requireAuth(request);
    const database = requireDatabase();
    const parsed = parseCabinetQrPayload(input.code);
    if (!parsed) {
      throw new AppError(404, 'QR_NOT_FOUND', '未识别该钥匙柜二维码');
    }
    const [row] = await database
      .select({ qr: cabinetQrs, sku: productSkus })
      .from(cabinetQrs)
      .innerJoin(productSkus, eq(cabinetQrs.skuId, productSkus.id))
      .where(
        and(
          eq(cabinetQrs.code, parsed.canonical),
          eq(cabinetQrs.deviceUuid, parsed.deviceUuid),
          eq(productSkus.sku, parsed.sku),
        ),
      )
      .limit(1);
    if (!row) {
      throw new AppError(404, 'QR_NOT_FOUND', '未识别该钥匙柜二维码');
    }
    if (row.qr.status !== 'active') {
      throw new AppError(409, 'QR_DISABLED', '该二维码已停用');
    }
    const [cabinet] = await database
      .select()
      .from(cabinets)
      .where(
        and(
          eq(cabinets.skuId, row.sku.id),
          eq(cabinets.deviceUuid, row.qr.deviceUuid),
        ),
      )
      .limit(1);
    return ok({
      qr: toQr(row.qr),
      sku: toSku(row.sku),
      ...(cabinet ? { cabinet: toCabinet(cabinet) } : {}),
    });
  });

  app.post('/bind', async (request) => {
    const input = bindCabinetRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.bind',
          requestId: input.requestId,
        },
        async (transaction) => {
          const parsed = parseCabinetQrPayload(input.qrCode);
          if (!parsed) {
            throw new AppError(404, 'QR_NOT_FOUND', '未识别该钥匙柜二维码');
          }
          const [resolved] = await transaction
            .select({ qr: cabinetQrs, sku: productSkus })
            .from(cabinetQrs)
            .innerJoin(productSkus, eq(cabinetQrs.skuId, productSkus.id))
            .where(
              and(
                eq(cabinetQrs.code, parsed.canonical),
                eq(cabinetQrs.deviceUuid, parsed.deviceUuid),
                eq(productSkus.sku, parsed.sku),
              ),
            )
            .limit(1);
          if (!resolved) {
            throw new AppError(404, 'QR_NOT_FOUND', '未识别该钥匙柜二维码');
          }
          if (resolved.qr.status !== 'active') {
            throw new AppError(409, 'QR_DISABLED', '该二维码已停用');
          }

          let [cabinet] = await transaction
            .select()
            .from(cabinets)
            .where(eq(cabinets.deviceUuid, resolved.qr.deviceUuid))
            .limit(1);
          if (!cabinet) {
            const cabinetId = createEntityId('cabinet');
            [cabinet] = await transaction
              .insert(cabinets)
              .values({
                id: cabinetId,
                skuId: resolved.sku.id,
                deviceUuid: resolved.qr.deviceUuid,
                name: input.name ?? resolved.sku.name,
                timeZone: input.timeZone,
                status: 'online',
              })
              .returning();
            if (!cabinet) {
              throw new AppError(500, 'CABINET_CREATE_FAILED', '钥匙柜创建失败');
            }
            await transaction.insert(keySlots).values(
              Array.from({ length: resolved.sku.capacity }, (_, index) => ({
                id: createEntityId('slot'),
                cabinetId,
                position: index + 1,
              })),
            );
          }

          const [existingMembership] = await transaction
            .select()
            .from(cabinetMemberships)
            .where(
              and(
                eq(cabinetMemberships.cabinetId, cabinet.id),
                eq(cabinetMemberships.userId, currentUser.id),
              ),
            )
            .limit(1);
          if (existingMembership?.active) {
            return ok({
              cabinet: toCabinet(cabinet),
              membership: toMembership(existingMembership),
            });
          }
          let membership;
          if (existingMembership) {
            [membership] = await transaction
              .update(cabinetMemberships)
              .set({
                active: true,
                role: 'admin',
                joinedAt: new Date().toISOString(),
                removedAt: null,
              })
              .where(eq(cabinetMemberships.id, existingMembership.id))
              .returning();
          } else {
            [membership] = await transaction
              .insert(cabinetMemberships)
              .values({
                id: createEntityId('membership'),
                cabinetId: cabinet.id,
                userId: currentUser.id,
                role: 'admin',
              })
              .returning();
          }
          if (!membership) {
            throw new AppError(500, 'MEMBERSHIP_CREATE_FAILED', '钥匙柜绑定失败');
          }
          const eventId = createEntityId('event');
          const [event] = await transaction
            .insert(cabinetEvents)
            .values({
              id: eventId,
              cabinetId: cabinet.id,
              actorId: currentUser.id,
              type: 'cabinet_bound',
              summaryData: {
                membershipId: membership.id,
                role: membership.role,
                sku: resolved.sku.sku,
                deviceUuid: resolved.qr.deviceUuid,
              },
            })
            .returning();
          const touched = await touchCabinet(transaction, cabinet.id);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.bound',
            targetType: 'cabinet',
            targetId: cabinet.id,
            result: 'success',
            metadata: { eventId: event?.id ?? eventId },
          });
          return ok({
            cabinet: toCabinet(touched),
            membership: toMembership(membership),
          }, '钥匙柜已绑定');
        },
      );
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.bound',
        'cabinet_qr',
        parseCabinetQrPayload(input.qrCode)?.deviceUuid ?? 'unknown',
        error,
      );
      throw error;
    }
  });

  app.patch('/:cabinetId', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const input = renameCabinetRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.rename',
          requestId: input.requestId,
        },
        async (transaction) => {
          await requireCabinetMember(transaction, cabinetId, currentUser.id);
          const [current] = await transaction
            .select()
            .from(cabinets)
            .where(eq(cabinets.id, cabinetId))
            .limit(1);
          if (!current) {
            throw new AppError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
          }
          await transaction
            .update(cabinets)
            .set({ name: input.name })
            .where(eq(cabinets.id, cabinetId));
          await transaction.insert(cabinetEvents).values({
            id: createEntityId('event'),
            cabinetId,
            actorId: currentUser.id,
            type: 'cabinet_renamed',
            summaryData: { previousName: current.name, nextName: input.name },
          });
          const touched = await touchCabinet(transaction, cabinetId, input.expectedVersion);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.renamed',
            targetType: 'cabinet',
            targetId: cabinetId,
            result: 'success',
          });
          return ok(toCabinet(touched), '钥匙柜名称已更新');
        },
      );
    } catch (error) {
      await recordFailure(database, currentUser.id, 'cabinets.renamed', 'cabinet', cabinetId, error);
      throw error;
    }
  });

  app.delete('/:cabinetId/members/:membershipId', async (request) => {
    const { cabinetId, membershipId } = memberParamsSchema.parse(request.params);
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.remove_member',
          requestId: input.requestId,
        },
        async (transaction) => {
          await requireCabinetMember(transaction, cabinetId, currentUser.id);
          const [target] = await transaction
            .select()
            .from(cabinetMemberships)
            .where(
              and(
                eq(cabinetMemberships.id, membershipId),
                eq(cabinetMemberships.cabinetId, cabinetId),
                eq(cabinetMemberships.active, true),
              ),
            )
            .limit(1);
          if (!target) {
            throw new AppError(404, 'MEMBER_NOT_FOUND', '成员不存在');
          }
          if (target.userId === currentUser.id) {
            throw new AppError(403, 'PERMISSION_DENIED', '不能移除自己的管理员身份');
          }
          const now = new Date().toISOString();
          await transaction
            .update(cabinetMemberships)
            .set({ active: false, removedAt: now })
            .where(eq(cabinetMemberships.id, target.id));
          await transaction.insert(cabinetEvents).values({
            id: createEntityId('event'),
            cabinetId,
            actorId: currentUser.id,
            type: 'member_removed',
            summaryData: { membershipId: target.id, removedUserId: target.userId },
          });
          const touched = await touchCabinet(transaction, cabinetId, input.expectedVersion);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.member_removed',
            targetType: 'membership',
            targetId: membershipId,
            result: 'success',
            metadata: { cabinetId },
          });
          return ok({ removed: true, cabinetVersion: touched.version }, '成员已移除');
        },
      );
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.member_removed',
        'membership',
        membershipId,
        error,
      );
      throw error;
    }
  });

  app.delete('/:cabinetId/keys', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      return await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.delete_keys',
          requestId: input.requestId,
        },
        async (transaction) => {
          await requireCabinetMember(transaction, cabinetId, currentUser.id);
          const cabinetKeys = await transaction
            .select()
            .from(keys)
            .where(eq(keys.cabinetId, cabinetId));
          if (cabinetKeys.length === 0) {
            throw new AppError(409, 'NO_KEYS_TO_CLEAR', '该钥匙柜没有可删除的钥匙');
          }
          const keyIds = cabinetKeys.map((key) => key.id);
          const cancelledLoans = await transaction
            .update(loans)
            .set({ status: 'cancelled' })
            .where(and(inArray(loans.keyId, keyIds), eq(loans.status, 'active')))
            .returning({ id: loans.id });
          await transaction.delete(keys).where(eq(keys.cabinetId, cabinetId));
          await transaction.insert(cabinetEvents).values({
            id: createEntityId('event'),
            cabinetId,
            actorId: currentUser.id,
            type: 'keys_deleted',
            summaryData: {
              keyCount: cabinetKeys.length,
              cancelledLoanCount: cancelledLoans.length,
            },
          });
          const touched = await touchCabinet(transaction, cabinetId, input.expectedVersion);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.keys_deleted',
            targetType: 'cabinet',
            targetId: cabinetId,
            result: 'success',
            metadata: {
              keyCount: cabinetKeys.length,
              cancelledLoanCount: cancelledLoans.length,
            },
          });
          return ok(
            {
              deletedCount: cabinetKeys.length,
              cancelledLoanCount: cancelledLoans.length,
              cabinetVersion: touched.version,
            },
            '钥匙信息已删除',
          );
        },
      );
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.keys_deleted',
        'cabinet',
        cabinetId,
        error,
      );
      throw error;
    }
  });
}
