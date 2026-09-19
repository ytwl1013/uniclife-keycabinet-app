import {
  createCabinetJoinInvitationRequestSchema,
  entityIdSchema,
  initializeCabinetRequestSchema,
  joinCabinetRequestSchema,
  renameCabinetRequestSchema,
  resolveCabinetQrRequestSchema,
  transferCabinetSuperAdminRequestSchema,
  writeOptionsSchema,
} from '@uniclife/shared';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../../common/auth/session.js';
import {
  toCabinet,
  toKey,
  toLoan,
  toMembership,
  toProductQr,
  toSku,
  toUser,
} from '../../common/domain/mappers.js';
import { AppError, errorCode } from '../../common/http/errors.js';
import { executeIdempotent } from '../../common/http/idempotency.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { createOpaqueToken, digestToken } from '../../common/security/tokens.js';
import { requireDatabase, type AppDatabase } from '../../db/client.js';
import {
  auditLogs,
  cabinetEvents,
  cabinetJoinInvitations,
  cabinetMemberships,
  cabinets,
  keys,
  keySlots,
  loans,
  productSkus,
  productQrs,
  users,
} from '../../db/schema.js';
import { appendAudit } from '../audit/service.js';
import { parseJoinQrPayload, parseProductQrPayload } from './qr.js';
import {
  getCabinetSummary,
  lockCabinet,
  requireCabinetMember,
  requireCabinetSuperAdmin,
  touchCabinet,
} from './service.js';
import {
  publishRealtimeChange,
  type CabinetRealtimeChange,
  type RealtimePublisher,
} from '../realtime/hub.js';

const cabinetParamsSchema = z.object({ cabinetId: entityIdSchema });
const memberParamsSchema = z.object({
  cabinetId: entityIdSchema,
  membershipId: entityIdSchema,
});
const invitationParamsSchema = z.object({
  cabinetId: entityIdSchema,
  invitationId: entityIdSchema,
});
const JOIN_INVITATION_TTL_MS = 10 * 60 * 1000;

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

export async function registerCabinetRoutes(
  app: FastifyInstance,
  options: { realtime: RealtimePublisher },
): Promise<void> {
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
    return database.transaction(async (transaction) => {
      await requireCabinetMember(transaction, cabinetId, currentUser.id);
      const summary = await getCabinetSummary(transaction, cabinetId);
      const [slotRows, keyRows, memberRows, loanRows] = await Promise.all([
        transaction
          .select()
          .from(keySlots)
          .where(eq(keySlots.cabinetId, cabinetId))
          .orderBy(asc(keySlots.position)),
        transaction.select().from(keys).where(eq(keys.cabinetId, cabinetId)),
        transaction
          .select({ membership: cabinetMemberships, user: users })
          .from(cabinetMemberships)
          .innerJoin(users, eq(cabinetMemberships.userId, users.id))
          .where(
            and(
              eq(cabinetMemberships.cabinetId, cabinetId),
              eq(cabinetMemberships.active, true),
            ),
          ),
        transaction
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
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
  });

  app.post('/resolve-qr', async (request) => {
    const input = resolveCabinetQrRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    const productCode = parseProductQrPayload(input.code);
    if (productCode) {
      const [row] = await database
        .select({ qr: productQrs, sku: productSkus })
        .from(productQrs)
        .innerJoin(productSkus, eq(productQrs.skuId, productSkus.id))
        .where(
          and(
            eq(productQrs.code, productCode.canonical),
            eq(productSkus.sku, productCode.sku),
          ),
        )
        .limit(1);
      if (!row) throw new AppError(404, 'QR_NOT_FOUND', '未识别该产品二维码');
      if (row.qr.status !== 'active') {
        throw new AppError(409, 'QR_DISABLED', '该产品二维码已停用');
      }
      return ok({ kind: 'initialize', qr: toProductQr(row.qr), sku: toSku(row.sku) });
    }

    const joinCode = parseJoinQrPayload(input.code);
    if (!joinCode) throw new AppError(404, 'QR_NOT_FOUND', '未识别该二维码');
    const [row] = await database
      .select({ invitation: cabinetJoinInvitations, cabinet: cabinets, sku: productSkus })
      .from(cabinetJoinInvitations)
      .innerJoin(cabinets, eq(cabinetJoinInvitations.cabinetId, cabinets.id))
      .innerJoin(productSkus, eq(cabinets.skuId, productSkus.id))
      .where(eq(cabinetJoinInvitations.tokenHash, digestToken(joinCode.token)))
      .limit(1);
    if (!row) throw new AppError(404, 'JOIN_INVITATION_NOT_FOUND', '加入二维码无效');
    if (row.invitation.revokedAt) {
      throw new AppError(409, 'JOIN_INVITATION_REVOKED', '加入二维码已失效');
    }
    if (row.invitation.usedAt) {
      throw new AppError(409, 'JOIN_INVITATION_USED', '加入二维码已被使用');
    }
    if (Date.parse(row.invitation.expiresAt) <= Date.now()) {
      throw new AppError(409, 'JOIN_INVITATION_EXPIRED', '加入二维码已过期');
    }
    const [membership] = await database
      .select()
      .from(cabinetMemberships)
      .where(
        and(
          eq(cabinetMemberships.cabinetId, row.cabinet.id),
          eq(cabinetMemberships.userId, currentUser.id),
          eq(cabinetMemberships.active, true),
        ),
      )
      .limit(1);
    return ok({
      kind: 'join',
      cabinet: toCabinet(row.cabinet),
      sku: toSku(row.sku),
      expiresAt: row.invitation.expiresAt,
      alreadyMember: Boolean(membership),
    });
  });

  app.post('/initialize', async (request) => {
    const input = initializeCabinetRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.initialize',
          requestId: input.requestId,
        },
        async (transaction) => {
          const parsed = parseProductQrPayload(input.productQrCode);
          if (!parsed) {
            throw new AppError(404, 'QR_NOT_FOUND', '未识别该产品二维码');
          }
          const [resolved] = await transaction
            .select({ qr: productQrs, sku: productSkus })
            .from(productQrs)
            .innerJoin(productSkus, eq(productQrs.skuId, productSkus.id))
            .where(
              and(
                eq(productQrs.code, parsed.canonical),
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

          const cabinetId = createEntityId('cabinet');
          const [cabinet] = await transaction
            .insert(cabinets)
            .values({
              id: cabinetId,
              skuId: resolved.sku.id,
              deviceUuid: randomUUID(),
              name: input.name,
              timeZone: input.timeZone,
              status: 'offline',
            })
            .returning();
          if (!cabinet) throw new AppError(500, 'CABINET_CREATE_FAILED', '钥匙柜创建失败');
          await transaction.insert(keySlots).values(
            Array.from({ length: resolved.sku.capacity }, (_, index) => ({
              id: createEntityId('slot'),
              cabinetId,
              position: index + 1,
            })),
          );
          const [membership] = await transaction
            .insert(cabinetMemberships)
            .values({
              id: createEntityId('membership'),
              cabinetId,
              userId: currentUser.id,
              role: 'super_admin',
            })
            .returning();
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
              type: 'cabinet_initialized',
              summaryData: {
                membershipId: membership.id,
                role: membership.role,
                sku: resolved.sku.sku,
                productQrId: resolved.qr.id,
              },
            })
            .returning();
          const touched = await touchCabinet(transaction, cabinet.id);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.initialized',
            targetType: 'cabinet',
            targetId: cabinet.id,
            result: 'success',
            metadata: { eventId: event?.id ?? eventId },
          });
          realtimeChange = {
            cabinetId: cabinet.id,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'memberships', 'events'],
          };
          return ok({
            cabinet: toCabinet(touched),
            membership: toMembership(membership),
          }, '新钥匙柜已初始化');
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.initialized',
        'product_qr',
        parseProductQrPayload(input.productQrCode)?.canonical ?? 'unknown',
        error,
      );
      throw error;
    }
  });

  app.post('/:cabinetId/join-invitations', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    createCabinetJoinInvitationRequestSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      const token = createOpaqueToken();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + JOIN_INVITATION_TTL_MS).toISOString();
      const invitation = await database.transaction(async (transaction) => {
        await lockCabinet(transaction, cabinetId);
        await requireCabinetMember(transaction, cabinetId, currentUser.id);
        await transaction
          .update(cabinetJoinInvitations)
          .set({ revokedAt: now })
          .where(
            and(
              eq(cabinetJoinInvitations.cabinetId, cabinetId),
              isNull(cabinetJoinInvitations.usedAt),
              isNull(cabinetJoinInvitations.revokedAt),
            ),
          );
        const [created] = await transaction
          .insert(cabinetJoinInvitations)
          .values({
            id: createEntityId('invitation'),
            cabinetId,
            createdBy: currentUser.id,
            tokenHash: digestToken(token),
            expiresAt,
          })
          .returning();
        if (!created) {
          throw new AppError(500, 'JOIN_INVITATION_CREATE_FAILED', '加入二维码生成失败');
        }
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'cabinets.join_invitation_created',
          targetType: 'cabinet',
          targetId: cabinetId,
          result: 'success',
          metadata: { invitationId: created.id, expiresAt },
        });
        return created;
      });
      return ok({
        invitation: {
          id: invitation.id,
          cabinetId,
          joinQrCode: `uniclife://cabinet/v1/join/${token}`,
          expiresAt,
        },
      }, '加入二维码已生成');
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.join_invitation_created',
        'cabinet',
        cabinetId,
        error,
      );
      throw error;
    }
  });

  app.delete('/:cabinetId/join-invitations/:invitationId', async (request) => {
    const { cabinetId, invitationId } = invitationParamsSchema.parse(request.params);
    writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    try {
      await database.transaction(async (transaction) => {
        await lockCabinet(transaction, cabinetId);
        await requireCabinetMember(transaction, cabinetId, currentUser.id);
        const now = new Date().toISOString();
        const [revoked] = await transaction
          .update(cabinetJoinInvitations)
          .set({ revokedAt: now })
          .where(
            and(
              eq(cabinetJoinInvitations.id, invitationId),
              eq(cabinetJoinInvitations.cabinetId, cabinetId),
              isNull(cabinetJoinInvitations.usedAt),
              isNull(cabinetJoinInvitations.revokedAt),
            ),
          )
          .returning({ id: cabinetJoinInvitations.id });
        if (!revoked) {
          throw new AppError(404, 'JOIN_INVITATION_NOT_FOUND', '加入二维码不存在或已失效');
        }
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'cabinets.join_invitation_revoked',
          targetType: 'cabinet',
          targetId: cabinetId,
          result: 'success',
          metadata: { invitationId },
        });
      });
      return ok({ revoked: true }, '加入二维码已失效');
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.join_invitation_revoked',
        'cabinet',
        cabinetId,
        error,
      );
      throw error;
    }
  });

  app.post('/join', async (request) => {
    const input = joinCabinetRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        { actorId: currentUser.id, operation: 'cabinets.join', requestId: input.requestId },
        async (transaction) => {
          const parsed = parseJoinQrPayload(input.joinQrCode);
          if (!parsed) throw new AppError(404, 'JOIN_INVITATION_NOT_FOUND', '加入二维码无效');
          const [row] = await transaction
            .select({ invitation: cabinetJoinInvitations, cabinet: cabinets })
            .from(cabinetJoinInvitations)
            .innerJoin(cabinets, eq(cabinetJoinInvitations.cabinetId, cabinets.id))
            .where(eq(cabinetJoinInvitations.tokenHash, digestToken(parsed.token)))
            .limit(1);
          if (!row) throw new AppError(404, 'JOIN_INVITATION_NOT_FOUND', '加入二维码无效');
          const lockedCabinet = await lockCabinet(transaction, row.cabinet.id);
          const [existingMembership] = await transaction
            .select()
            .from(cabinetMemberships)
            .where(
              and(
                eq(cabinetMemberships.cabinetId, row.cabinet.id),
                eq(cabinetMemberships.userId, currentUser.id),
              ),
            )
            .limit(1);
          if (existingMembership?.active) {
            return ok({
              cabinet: toCabinet(lockedCabinet),
              membership: toMembership(existingMembership),
            });
          }
          const now = new Date().toISOString();
          const [consumed] = await transaction
            .update(cabinetJoinInvitations)
            .set({ usedAt: now, usedBy: currentUser.id })
            .where(
              and(
                eq(cabinetJoinInvitations.id, row.invitation.id),
                isNull(cabinetJoinInvitations.usedAt),
                isNull(cabinetJoinInvitations.revokedAt),
                gt(cabinetJoinInvitations.expiresAt, now),
              ),
            )
            .returning({ id: cabinetJoinInvitations.id });
          if (!consumed) {
            throw new AppError(409, 'JOIN_INVITATION_INVALID', '加入二维码已过期或被使用');
          }
          let membership;
          if (existingMembership) {
            [membership] = await transaction
              .update(cabinetMemberships)
              .set({ active: true, role: 'admin', joinedAt: now, removedAt: null })
              .where(eq(cabinetMemberships.id, existingMembership.id))
              .returning();
          } else {
            [membership] = await transaction
              .insert(cabinetMemberships)
              .values({
                id: createEntityId('membership'),
                cabinetId: row.cabinet.id,
                userId: currentUser.id,
                role: 'admin',
              })
              .returning();
          }
          if (!membership) {
            throw new AppError(500, 'MEMBERSHIP_CREATE_FAILED', '加入钥匙柜失败');
          }
          const eventId = createEntityId('event');
          await transaction.insert(cabinetEvents).values({
            id: eventId,
            cabinetId: row.cabinet.id,
            actorId: currentUser.id,
            type: 'member_joined',
            summaryData: { membershipId: membership.id, invitationId: row.invitation.id },
          });
          const touched = await touchCabinet(transaction, row.cabinet.id);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.member_joined',
            targetType: 'cabinet',
            targetId: row.cabinet.id,
            result: 'success',
            metadata: { eventId, invitationId: row.invitation.id },
          });
          realtimeChange = {
            cabinetId: row.cabinet.id,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'memberships', 'events'],
          };
          return ok(
            { cabinet: toCabinet(touched), membership: toMembership(membership) },
            '已加入钥匙柜',
          );
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.member_joined',
        'join_invitation',
        'unknown',
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
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.rename',
          requestId: input.requestId,
        },
        async (transaction) => {
          await lockCabinet(transaction, cabinetId);
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
          realtimeChange = {
            cabinetId,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'events'],
          };
          return ok(toCabinet(touched), '钥匙柜名称已更新');
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
    } catch (error) {
      await recordFailure(database, currentUser.id, 'cabinets.renamed', 'cabinet', cabinetId, error);
      throw error;
    }
  });

  app.post('/:cabinetId/super-admin-transfer', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const input = transferCabinetSuperAdminRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.transfer_super_admin',
          requestId: input.requestId,
        },
        async (transaction) => {
          await lockCabinet(transaction, cabinetId);
          const currentMembership = await requireCabinetSuperAdmin(
            transaction,
            cabinetId,
            currentUser.id,
          );
          const [target] = await transaction
            .select()
            .from(cabinetMemberships)
            .where(
              and(
                eq(cabinetMemberships.id, input.membershipId),
                eq(cabinetMemberships.cabinetId, cabinetId),
                eq(cabinetMemberships.active, true),
              ),
            )
            .limit(1);
          if (!target) {
            throw new AppError(404, 'MEMBER_NOT_FOUND', '管理员不存在');
          }
          if (target.id === currentMembership.id || target.role === 'super_admin') {
            throw new AppError(409, 'SUPER_ADMIN_TRANSFER_TARGET_INVALID', '请选择其他管理员');
          }

          const [previousSuperAdmin] = await transaction
            .update(cabinetMemberships)
            .set({ role: 'admin' })
            .where(
              and(
                eq(cabinetMemberships.id, currentMembership.id),
                eq(cabinetMemberships.active, true),
                eq(cabinetMemberships.role, 'super_admin'),
              ),
            )
            .returning();
          const [nextSuperAdmin] = await transaction
            .update(cabinetMemberships)
            .set({ role: 'super_admin' })
            .where(
              and(
                eq(cabinetMemberships.id, target.id),
                eq(cabinetMemberships.active, true),
                eq(cabinetMemberships.role, 'admin'),
              ),
            )
            .returning();
          if (!previousSuperAdmin || !nextSuperAdmin) {
            throw new AppError(500, 'SUPER_ADMIN_TRANSFER_FAILED', '超级管理员权限转让失败');
          }

          const eventId = createEntityId('event');
          await transaction.insert(cabinetEvents).values({
            id: eventId,
            cabinetId,
            actorId: currentUser.id,
            type: 'super_admin_transferred',
            summaryData: {
              previousMembershipId: previousSuperAdmin.id,
              previousUserId: previousSuperAdmin.userId,
              nextMembershipId: nextSuperAdmin.id,
              nextUserId: nextSuperAdmin.userId,
            },
          });
          const touched = await touchCabinet(transaction, cabinetId, input.expectedVersion);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.super_admin_transferred',
            targetType: 'cabinet',
            targetId: cabinetId,
            result: 'success',
            metadata: {
              eventId,
              previousMembershipId: previousSuperAdmin.id,
              nextMembershipId: nextSuperAdmin.id,
            },
          });
          realtimeChange = {
            additionalUserIds: [previousSuperAdmin.userId, nextSuperAdmin.userId],
            cabinetId,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'memberships', 'events'],
          };
          return ok(
            {
              previousSuperAdmin: toMembership(previousSuperAdmin),
              nextSuperAdmin: toMembership(nextSuperAdmin),
              cabinetVersion: touched.version,
            },
            '超级管理员权限已转让',
          );
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.super_admin_transferred',
        'cabinet',
        cabinetId,
        error,
      );
      throw error;
    }
  });

  app.delete('/:cabinetId', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.delete',
          requestId: input.requestId,
        },
        async (transaction) => {
          const currentCabinet = await lockCabinet(transaction, cabinetId);
          await requireCabinetSuperAdmin(transaction, cabinetId, currentUser.id);
          if (
            input.expectedVersion !== undefined &&
            currentCabinet.version !== input.expectedVersion
          ) {
            throw new AppError(409, 'VERSION_CONFLICT', '钥匙柜数据已更新，请刷新后重试', {
              expectedVersion: input.expectedVersion,
              actualVersion: currentCabinet.version,
            });
          }

          const [membershipRows, keyRows, loanRows, eventRows] = await Promise.all([
            transaction
              .select()
              .from(cabinetMemberships)
              .where(eq(cabinetMemberships.cabinetId, cabinetId)),
            transaction.select().from(keys).where(eq(keys.cabinetId, cabinetId)),
            transaction.select().from(loans).where(eq(loans.cabinetId, cabinetId)),
            transaction
              .select({ keyId: cabinetEvents.keyId, relatedLoanId: cabinetEvents.relatedLoanId })
              .from(cabinetEvents)
              .where(eq(cabinetEvents.cabinetId, cabinetId)),
          ]);
          const relatedAuditTargetIds = [...new Set([
            cabinetId,
            ...membershipRows.map((membership) => membership.id),
            ...keyRows.map((key) => key.id),
            ...loanRows.map((loan) => loan.id),
            ...eventRows.flatMap((event) => [event.keyId, event.relatedLoanId]),
          ].filter((id): id is string => Boolean(id)))];

          await transaction.delete(auditLogs).where(
            or(
              inArray(auditLogs.targetId, relatedAuditTargetIds),
              sql<boolean>`${auditLogs.metadata}->>'cabinetId' = ${cabinetId}`,
            ),
          );
          await transaction
            .delete(cabinetJoinInvitations)
            .where(eq(cabinetJoinInvitations.cabinetId, cabinetId));
          await transaction.delete(loans).where(eq(loans.cabinetId, cabinetId));
          await transaction.delete(keys).where(eq(keys.cabinetId, cabinetId));
          await transaction.delete(keySlots).where(eq(keySlots.cabinetId, cabinetId));
          await transaction.delete(cabinetEvents).where(eq(cabinetEvents.cabinetId, cabinetId));
          await transaction
            .delete(cabinetMemberships)
            .where(eq(cabinetMemberships.cabinetId, cabinetId));
          await transaction.delete(cabinets).where(eq(cabinets.id, cabinetId));

          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.deleted',
            targetType: 'cabinet',
            targetId: cabinetId,
            result: 'success',
            metadata: {
              membershipCount: membershipRows.length,
              keyCount: keyRows.length,
              loanCount: loanRows.length,
            },
          });
          realtimeChange = {
            additionalUserIds: membershipRows.map((membership) => membership.userId),
            cabinetId,
            cabinetVersion: currentCabinet.version + 1,
            resources: ['cabinets', 'memberships', 'keys', 'loans', 'events'],
          };
          return ok(
            {
              deleted: true,
              disconnectedMemberCount: membershipRows.filter((membership) => membership.active).length,
            },
            '钥匙柜及其全部信息已删除',
          );
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
    } catch (error) {
      await recordFailure(database, currentUser.id, 'cabinets.deleted', 'cabinet', cabinetId, error);
      throw error;
    }
  });

  app.delete('/:cabinetId/membership', async (request) => {
    const { cabinetId } = cabinetParamsSchema.parse(request.params);
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.disconnect',
          requestId: input.requestId,
        },
        async (transaction) => {
          await lockCabinet(transaction, cabinetId);
          const membership = await requireCabinetMember(transaction, cabinetId, currentUser.id);
          if (membership.role === 'super_admin') {
            throw new AppError(
              409,
              'SUPER_ADMIN_TRANSFER_REQUIRED',
              '请先转让超级管理员权限，或删除整个箱子',
            );
          }
          const now = new Date().toISOString();
          await transaction
            .update(cabinetMemberships)
            .set({ active: false, removedAt: now })
            .where(
              and(
                eq(cabinetMemberships.id, membership.id),
                eq(cabinetMemberships.active, true),
                eq(cabinetMemberships.role, 'admin'),
              ),
            );
          const eventId = createEntityId('event');
          await transaction.insert(cabinetEvents).values({
            id: eventId,
            cabinetId,
            actorId: currentUser.id,
            type: 'member_removed',
            occurredAt: now,
            summaryData: {
              membershipId: membership.id,
              removedUserId: currentUser.id,
              reason: 'self_disconnected',
            },
          });
          const touched = await touchCabinet(transaction, cabinetId, input.expectedVersion);
          await appendAudit(transaction, {
            actorId: currentUser.id,
            action: 'cabinets.disconnected',
            targetType: 'cabinet',
            targetId: cabinetId,
            result: 'success',
            metadata: { eventId, membershipId: membership.id },
          });
          realtimeChange = {
            additionalUserIds: [currentUser.id],
            cabinetId,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'memberships', 'events'],
          };
          return ok(
            { removed: true, cabinetVersion: touched.version },
            '箱子已从当前账户移除',
          );
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
    } catch (error) {
      await recordFailure(
        database,
        currentUser.id,
        'cabinets.disconnected',
        'cabinet',
        cabinetId,
        error,
      );
      throw error;
    }
  });

  app.delete('/:cabinetId/members/:membershipId', async (request) => {
    const { cabinetId, membershipId } = memberParamsSchema.parse(request.params);
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.remove_member',
          requestId: input.requestId,
        },
        async (transaction) => {
          await lockCabinet(transaction, cabinetId);
          await requireCabinetSuperAdmin(transaction, cabinetId, currentUser.id);
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
          if (target.role === 'super_admin') {
            throw new AppError(403, 'SUPER_ADMIN_PROTECTED', '超级管理员不能被其他管理员移除');
          }
          const now = new Date().toISOString();
          const [removed] = await transaction
            .update(cabinetMemberships)
            .set({ active: false, removedAt: now })
            .where(
              and(
                eq(cabinetMemberships.id, target.id),
                eq(cabinetMemberships.active, true),
                eq(cabinetMemberships.role, 'admin'),
              ),
            )
            .returning({ id: cabinetMemberships.id });
          if (!removed) {
            throw new AppError(409, 'MEMBER_ROLE_CHANGED', '管理员角色已变化，请刷新后重试');
          }
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
          realtimeChange = {
            additionalUserIds: [target.userId],
            cabinetId,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'memberships', 'events'],
          };
          return ok({ removed: true, cabinetVersion: touched.version }, '成员已移除');
        },
      );
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
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
    let realtimeChange: CabinetRealtimeChange | undefined;
    try {
      const response = await executeIdempotent(
        database,
        {
          actorId: currentUser.id,
          operation: 'cabinets.delete_keys',
          requestId: input.requestId,
        },
        async (transaction) => {
          await lockCabinet(transaction, cabinetId);
          await requireCabinetSuperAdmin(transaction, cabinetId, currentUser.id);
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
          realtimeChange = {
            cabinetId,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'keys', 'loans', 'events'],
          };
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
      publishRealtimeChange(app, options.realtime, realtimeChange);
      return response;
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
