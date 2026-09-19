import {
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  registerRequestSchema,
  signInRequestSchema,
} from '@uniclife/shared';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { issueSession, requireAuth, toUserAccount } from '../../common/auth/session.js';
import { env } from '../../common/config/env.js';
import { toCurrentUser } from '../../common/domain/mappers.js';
import { AppError } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { hashPassword, verifyPassword } from '../../common/security/password.js';
import {
  createNumericCode,
  createOpaqueToken,
  digestToken,
  secureDigestEqual,
} from '../../common/security/tokens.js';
import { requireDatabase } from '../../db/client.js';
import {
  consents,
  passwordResetChallenges,
  sessions,
  users,
} from '../../db/schema.js';
import type { PasswordResetNotifier } from '../../integrations/notifications/password-reset-notifier.js';
import { appendAudit } from '../audit/service.js';
import type { RealtimePublisher } from '../realtime/hub.js';

const LEGAL_POLICY_VERSION = 'legal-draft-2026-07';
const dummyPasswordHash = hashPassword('not-a-real-account-password');
const publicWriteRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
};
const passwordResetRateLimit = {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
};

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: { notifier?: PasswordResetNotifier; realtime: RealtimePublisher },
): Promise<void> {
  const notifier = options.notifier;

  app.post('/register', publicWriteRateLimit, async (request, reply) => {
    const input = registerRequestSchema.parse(request.body);
    const database = requireDatabase();
    const [existing] = await database
      .select({ id: users.id })
      .from(users)
      .where(sql<boolean>`lower(${users.email}) = ${input.email}`)
      .limit(1);
    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', '该邮箱已注册');
    }

    const userId = createEntityId('user');
    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();
    const result = await database.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(users)
        .values({
          id: userId,
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          locale: input.locale,
          loginCount: 1,
          lastLoginAt: now,
        })
        .returning();
      if (!created) {
        throw new AppError(500, 'USER_CREATE_FAILED', '账户创建失败');
      }
      await transaction.insert(consents).values([
        {
          id: createEntityId('consent'),
          userId,
          kind: 'terms',
          granted: true,
          policyVersion: LEGAL_POLICY_VERSION,
          locale: input.locale,
        },
        {
          id: createEntityId('consent'),
          userId,
          kind: 'privacy',
          granted: true,
          policyVersion: LEGAL_POLICY_VERSION,
          locale: input.locale,
        },
      ]);
      const session = await issueSession(transaction, userId);
      await appendAudit(transaction, {
        actorId: userId,
        action: 'auth.register',
        targetType: 'user',
        targetId: userId,
        result: 'success',
      });
      return { user: toCurrentUser(created), session };
    });
    return reply.status(201).send(ok(result, '注册成功'));
  });

  app.post('/sign-in', publicWriteRateLimit, async (request) => {
    const input = signInRequestSchema.parse(request.body);
    const database = requireDatabase();
    const [user] = await database
      .select()
      .from(users)
      .where(
        and(
          sql<boolean>`lower(${users.email}) = ${input.email}`,
          eq(users.status, 'active'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
    const valid = await verifyPassword(input.password, passwordHash);
    if (!user || !valid) {
      await appendAudit(database, {
        actorId: user?.id,
        action: 'auth.sign_in',
        targetType: 'user',
        targetId: user?.id ?? 'unknown',
        result: 'failure',
        reasonCode: 'INVALID_CREDENTIALS',
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确');
    }
    const result = await database.transaction(async (transaction) => {
      const now = new Date().toISOString();
      const [signedInUser] = await transaction
        .update(users)
        .set({
          loginCount: sql`${users.loginCount} + 1`,
          lastLoginAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(users.id, user.id),
            eq(users.status, 'active'),
            isNull(users.deletedAt),
          ),
        )
        .returning();
      if (!signedInUser) {
        throw new AppError(404, 'USER_NOT_FOUND', '账户不存在');
      }
      const issued = await issueSession(transaction, user.id);
      await appendAudit(transaction, {
        actorId: user.id,
        action: 'auth.sign_in',
        targetType: 'session',
        targetId: user.id,
        result: 'success',
      });
      return { user: toCurrentUser(signedInUser), session: issued };
    });
    return ok(result, '登录成功');
  });

  app.post('/sign-out', async (request) => {
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    await database.transaction(async (transaction) => {
      await transaction
        .update(sessions)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(sessions.id, currentUser.sessionId));
      await appendAudit(transaction, {
        actorId: currentUser.id,
        action: 'auth.sign_out',
        targetType: 'session',
        targetId: currentUser.sessionId,
        result: 'success',
      });
    });
    options.realtime.disconnectSession(currentUser.sessionId);
    return ok({ signedOut: true }, '已退出登录');
  });

  app.get('/session', async (request) => {
    const currentUser = await requireAuth(request);
    return ok({ user: toUserAccount(currentUser) });
  });

  app.post('/password-resets', passwordResetRateLimit, async (request, reply) => {
    const input = passwordResetRequestSchema.parse(request.body);
    const previewEnabled = env.NODE_ENV !== 'production' && env.AUTH_ALLOW_RESET_CODE_PREVIEW;
    if (!notifier && !previewEnabled) {
      throw new AppError(503, 'PASSWORD_RESET_UNAVAILABLE', '密码重置邮件服务暂不可用');
    }
    const database = requireDatabase();
    const challengeId = createEntityId('reset');
    const code = createNumericCode();
    const expiresAt = new Date(
      Date.now() + env.AUTH_RESET_TTL_MINUTES * 60 * 1000,
    ).toISOString();
    const [user] = await database
      .select()
      .from(users)
      .where(
        and(
          sql<boolean>`lower(${users.email}) = ${input.email}`,
          eq(users.status, 'active'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (user) {
      await database.transaction(async (transaction) => {
        await transaction.insert(passwordResetChallenges).values({
          id: challengeId,
          userId: user.id,
          codeHash: digestToken(`${challengeId}:${code}`),
          expiresAt,
        });
        await appendAudit(transaction, {
          actorId: user.id,
          action: 'auth.password_reset_requested',
          targetType: 'user',
          targetId: user.id,
          result: 'success',
        });
      });
      try {
        await notifier?.send({
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          code,
          expiresAt,
        });
      } catch {
        await database.update(passwordResetChallenges)
          .set({ consumedAt: new Date().toISOString() })
          .where(eq(passwordResetChallenges.id, challengeId));
        request.log.error({ userId: user.id }, 'password reset notification failed');
        await appendAudit(database, {
          actorId: user.id,
          action: 'auth.password_reset_notification',
          targetType: 'user',
          targetId: user.id,
          result: 'failure',
          reasonCode: 'NOTIFICATION_FAILED',
        });
        throw new AppError(503, 'PASSWORD_RESET_DELIVERY_FAILED', '验证码发送失败，请稍后重试');
      }
    }

    const data: {
      challengeId: string;
      expiresInSeconds: number;
      previewCode?: string;
    } = {
      challengeId,
      expiresInSeconds: env.AUTH_RESET_TTL_MINUTES * 60,
    };
    if (env.NODE_ENV !== 'production' && env.AUTH_ALLOW_RESET_CODE_PREVIEW && user) {
      data.previewCode = code;
    }
    return reply.status(202).send(ok(data, '如果账户存在，验证码已发送'));
  });

  app.post('/password-resets/verify', passwordResetRateLimit, async (request) => {
    const input = passwordResetVerifySchema.parse(request.body);
    const database = requireDatabase();
    const now = new Date().toISOString();
    const [challenge] = await database
      .select()
      .from(passwordResetChallenges)
      .where(
        and(
          eq(passwordResetChallenges.id, input.challengeId),
          gt(passwordResetChallenges.expiresAt, now),
          isNull(passwordResetChallenges.verifiedAt),
          isNull(passwordResetChallenges.consumedAt),
        ),
      )
      .limit(1);
    if (!challenge || challenge.attempts >= 5) {
      throw new AppError(400, 'RESET_CHALLENGE_INVALID', '验证码已失效');
    }
    const valid = secureDigestEqual(
      challenge.codeHash,
      digestToken(`${challenge.id}:${input.code}`),
    );
    if (!valid) {
      await database.transaction(async (transaction) => {
        await transaction
          .update(passwordResetChallenges)
          .set({ attempts: sql`${passwordResetChallenges.attempts} + 1` })
          .where(eq(passwordResetChallenges.id, challenge.id));
        await appendAudit(transaction, {
          actorId: challenge.userId,
          action: 'auth.password_reset_verified',
          targetType: 'user',
          targetId: challenge.userId,
          result: 'failure',
          reasonCode: 'RESET_CODE_INVALID',
        });
      });
      throw new AppError(400, 'RESET_CODE_INVALID', '验证码不正确');
    }

    const resetToken = createOpaqueToken();
    const resetTokenExpiresAt = new Date(
      Date.now() + env.AUTH_RESET_TTL_MINUTES * 60 * 1000,
    ).toISOString();
    await database.transaction(async (transaction) => {
      await transaction
        .update(passwordResetChallenges)
        .set({
          verifiedAt: now,
          resetTokenHash: digestToken(resetToken),
          resetTokenExpiresAt,
        })
        .where(eq(passwordResetChallenges.id, challenge.id));
      await appendAudit(transaction, {
        actorId: challenge.userId,
        action: 'auth.password_reset_verified',
        targetType: 'user',
        targetId: challenge.userId,
        result: 'success',
      });
    });
    return ok({ resetToken, expiresAt: resetTokenExpiresAt }, '验证码已通过');
  });

  app.post('/password-resets/complete', passwordResetRateLimit, async (request) => {
    const input = passwordResetCompleteSchema.parse(request.body);
    const database = requireDatabase();
    const now = new Date().toISOString();
    const [challenge] = await database
      .select()
      .from(passwordResetChallenges)
      .where(
        and(
          eq(passwordResetChallenges.resetTokenHash, digestToken(input.resetToken)),
          gt(passwordResetChallenges.resetTokenExpiresAt, now),
          isNull(passwordResetChallenges.consumedAt),
        ),
      )
      .limit(1);
    if (!challenge?.verifiedAt) {
      throw new AppError(400, 'RESET_CHALLENGE_INVALID', '重置链接已失效');
    }
    const passwordHash = await hashPassword(input.newPassword);
    await database.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({ passwordHash, updatedAt: now })
        .where(eq(users.id, challenge.userId));
      await transaction
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, challenge.userId), isNull(sessions.revokedAt)));
      await transaction
        .update(passwordResetChallenges)
        .set({ consumedAt: now })
        .where(eq(passwordResetChallenges.id, challenge.id));
      await appendAudit(transaction, {
        actorId: challenge.userId,
        action: 'auth.password_reset_completed',
        targetType: 'user',
        targetId: challenge.userId,
        result: 'success',
      });
    });
    options.realtime.disconnectUser(challenge.userId);
    return ok({ reset: true }, '密码已重置，请重新登录');
  });
}
