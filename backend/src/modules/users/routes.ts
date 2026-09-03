import {
  changePasswordRequestSchema,
  markHomeGuidePromptedRequestSchema,
  pushTokenRequestSchema,
  updateEmailRequestSchema,
  updateProfileRequestSchema,
  writeOptionsSchema,
} from '@uniclife/shared';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { requireAuth, toUserAccount } from '../../common/auth/session.js';
import { toCurrentUser } from '../../common/domain/mappers.js';
import { AppError } from '../../common/http/errors.js';
import { executeIdempotent } from '../../common/http/idempotency.js';
import { ok } from '../../common/http/response.js';
import { hashPassword, verifyPassword } from '../../common/security/password.js';
import { requireDatabase } from '../../db/client.js';
import {
  cabinetEvents,
  cabinetMemberships,
  cabinets,
  consents,
  pushTokens,
  sessions,
  users,
} from '../../db/schema.js';
import { appendAudit } from '../audit/service.js';
import { touchCabinet } from '../cabinets/service.js';
import { createEntityId } from '../../common/security/ids.js';
import {
  publishRealtimeChange,
  type CabinetRealtimeChange,
  type RealtimePublisher,
} from '../realtime/hub.js';
import { registerPushToken, unregisterPushToken } from './push-token-service.js';

export async function registerUserRoutes(
  app: FastifyInstance,
  options: { realtime: RealtimePublisher },
): Promise<void> {
  app.get('/me', async (request) => {
    const currentUser = await requireAuth(request);
    return ok(toUserAccount(currentUser));
  });

  app.post(
    '/me/push-tokens',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request) => {
      const input = pushTokenRequestSchema.parse(request.body);
      const currentUser = await requireAuth(request);
      const database = requireDatabase();
      await database.transaction(async (transaction) => {
        const pushTokenId = await registerPushToken(transaction, {
          ...input,
          sessionId: currentUser.sessionId,
          userId: currentUser.id,
        });
        await appendAudit(transaction, {
          action: 'users.push_token_registered',
          actorId: currentUser.id,
          metadata: { platform: input.platform },
          result: 'success',
          targetId: pushTokenId,
          targetType: 'push_token',
        });
      });
      return ok({ registered: true }, '通知设备已注册');
    },
  );

  app.delete(
    '/me/push-tokens',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request) => {
      const input = pushTokenRequestSchema.parse(request.body);
      const currentUser = await requireAuth(request);
      const database = requireDatabase();
      const removed = await database.transaction(async (transaction) => {
        const didRemove = await unregisterPushToken(transaction, {
          token: input.token,
          userId: currentUser.id,
        });
        await appendAudit(transaction, {
          action: 'users.push_token_unregistered',
          actorId: currentUser.id,
          metadata: { platform: input.platform, removed: didRemove },
          result: 'success',
          targetId: currentUser.id,
          targetType: 'user',
        });
        return didRemove;
      });
      return ok({ removed }, '通知设备已移除');
    },
  );

  app.patch('/me/home-guide', async (request) => {
    const input = markHomeGuidePromptedRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    return executeIdempotent(
      database,
      {
        actorId: currentUser.id,
        operation: 'users.mark_home_guide_prompted',
        requestId: input.requestId,
      },
      async (transaction) => {
        const now = new Date().toISOString();
        const [updated] = await transaction
          .update(users)
          .set({
            homeGuidePromptedAt: sql`coalesce(${users.homeGuidePromptedAt}, ${now})`,
            updatedAt: now,
          })
          .where(eq(users.id, currentUser.id))
          .returning();
        if (!updated) {
          throw new AppError(404, 'USER_NOT_FOUND', '账户不存在');
        }
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'users.home_guide_prompted',
          targetType: 'user',
          targetId: currentUser.id,
          result: 'success',
        });
        return ok(toCurrentUser(updated), '使用导航提示已记录');
      },
    );
  });

  app.patch('/me/profile', async (request) => {
    const input = updateProfileRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    return executeIdempotent(
      database,
      {
        actorId: currentUser.id,
        operation: 'users.update_profile',
        requestId: input.requestId,
      },
      async (transaction) => {
        const [updated] = await transaction
          .update(users)
          .set({
            displayName: input.displayName,
            ...(input.avatarUri !== undefined ? { avatarUri: input.avatarUri } : {}),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, currentUser.id))
          .returning();
        if (!updated) {
          throw new AppError(404, 'USER_NOT_FOUND', '账户不存在');
        }
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'users.profile_updated',
          targetType: 'user',
          targetId: currentUser.id,
          result: 'success',
          metadata: {
            displayNameChanged: updated.displayName !== currentUser.displayName,
            avatarChanged: input.avatarUri !== undefined,
          },
        });
        return ok(toCurrentUser(updated), '资料已更新');
      },
    );
  });

  app.patch('/me/email', async (request) => {
    const input = updateEmailRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    return executeIdempotent(
      database,
      {
        actorId: currentUser.id,
        operation: 'users.update_email',
        requestId: input.requestId,
      },
      async (transaction) => {
        const [existing] = await transaction
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              sql<boolean>`lower(${users.email}) = ${input.email}`,
              sql<boolean>`${users.id} <> ${currentUser.id}`,
            ),
          )
          .limit(1);
        if (existing) {
          throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', '该邮箱已注册');
        }
        const [updated] = await transaction
          .update(users)
          .set({ email: input.email, updatedAt: new Date().toISOString() })
          .where(eq(users.id, currentUser.id))
          .returning();
        if (!updated) {
          throw new AppError(404, 'USER_NOT_FOUND', '账户不存在');
        }
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'users.email_updated',
          targetType: 'user',
          targetId: currentUser.id,
          result: 'success',
        });
        return ok(toCurrentUser(updated), '邮箱已更新');
      },
    );
  });

  app.patch('/me/password', async (request) => {
    const input = changePasswordRequestSchema.parse(request.body);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    let passwordChanged = false;
    const response = await executeIdempotent(
      database,
      {
        actorId: currentUser.id,
        operation: 'users.change_password',
        requestId: input.requestId,
      },
      async (transaction) => {
        if (!(await verifyPassword(input.currentPassword, currentUser.passwordHash))) {
          throw new AppError(401, 'INVALID_CREDENTIALS', '当前密码不正确');
        }
        const passwordHash = await hashPassword(input.newPassword);
        const now = new Date().toISOString();
        await transaction
          .update(users)
          .set({ passwordHash, updatedAt: now })
          .where(eq(users.id, currentUser.id));
        await transaction
          .update(sessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(sessions.userId, currentUser.id),
              isNull(sessions.revokedAt),
              sql<boolean>`${sessions.id} <> ${currentUser.sessionId}`,
            ),
          );
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'users.password_changed',
          targetType: 'user',
          targetId: currentUser.id,
          result: 'success',
        });
        passwordChanged = true;
        return ok({ changed: true }, '密码已更新');
      },
    );
    if (passwordChanged) {
      options.realtime.disconnectOtherUserSessions(
        currentUser.id,
        currentUser.sessionId,
      );
    }
    return response;
  });

  app.delete('/me', async (request) => {
    const input = writeOptionsSchema.parse(request.body ?? {});
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    const realtimeChanges: CabinetRealtimeChange[] = [];
    const response = await executeIdempotent(
      database,
      {
        actorId: currentUser.id,
        operation: 'users.delete_account',
        requestId: input.requestId,
      },
      async (transaction) => {
        const now = new Date().toISOString();
        let activeMemberships = await transaction
          .select()
          .from(cabinetMemberships)
          .where(
            and(
              eq(cabinetMemberships.userId, currentUser.id),
              eq(cabinetMemberships.active, true),
            ),
          );
        const cabinetIds = [...new Set(activeMemberships.map((membership) => membership.cabinetId))]
          .sort();
        if (cabinetIds.length > 0) {
          await transaction
            .select({ id: cabinets.id })
            .from(cabinets)
            .where(inArray(cabinets.id, cabinetIds))
            .orderBy(asc(cabinets.id))
            .for('update');
          activeMemberships = await transaction
            .select()
            .from(cabinetMemberships)
            .where(
              and(
                eq(cabinetMemberships.userId, currentUser.id),
                eq(cabinetMemberships.active, true),
              ),
            );
        }
        const ownedCabinetIds = activeMemberships
          .filter((membership) => membership.role === 'super_admin')
          .map((membership) => membership.cabinetId);
        if (ownedCabinetIds.length > 0) {
          throw new AppError(
            409,
            'SUPER_ADMIN_TRANSFER_REQUIRED',
            '请先转让或删除名下箱子的超级管理员权限',
            { cabinetIds: ownedCabinetIds },
          );
        }
        for (const membership of activeMemberships) {
          await transaction
            .update(cabinetMemberships)
            .set({ active: false, removedAt: now })
            .where(eq(cabinetMemberships.id, membership.id));
          await transaction.insert(cabinetEvents).values({
            id: createEntityId('event'),
            cabinetId: membership.cabinetId,
            actorId: currentUser.id,
            type: 'member_removed',
            occurredAt: now,
            summaryData: {
              membershipId: membership.id,
              removedUserId: currentUser.id,
              reason: 'account_deleted',
            },
          });
          const touched = await touchCabinet(transaction, membership.cabinetId);
          realtimeChanges.push({
            additionalUserIds: [currentUser.id],
            cabinetId: membership.cabinetId,
            cabinetVersion: touched.version,
            resources: ['cabinets', 'memberships', 'events'],
          });
        }
        await transaction
          .update(users)
          .set({
            email: `deleted-${currentUser.id}@account.invalid`,
            displayName: 'Deleted account',
            avatarUri: null,
            status: 'disabled',
            deletedAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, currentUser.id));
        await transaction.delete(consents).where(eq(consents.userId, currentUser.id));
        await transaction.delete(pushTokens).where(eq(pushTokens.userId, currentUser.id));
        await transaction
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.userId, currentUser.id), isNull(sessions.revokedAt)));
        await appendAudit(transaction, {
          actorId: currentUser.id,
          action: 'users.account_deleted',
          targetType: 'user',
          targetId: currentUser.id,
          result: 'success',
          metadata: { membershipsRemoved: activeMemberships.length },
        });
        return ok({ deleted: true }, '账户已删除');
      },
    );
    for (const change of realtimeChanges) {
      publishRealtimeChange(app, options.realtime, change);
    }
    options.realtime.disconnectUser(currentUser.id);
    return response;
  });
}
