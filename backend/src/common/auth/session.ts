import type { UserAccount } from '@uniclife/shared';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import { AppError } from '../http/errors.js';
import { createEntityId } from '../security/ids.js';
import { createOpaqueToken, digestToken } from '../security/tokens.js';
import { requireDatabase, type DbExecutor } from '../../db/client.js';
import { sessions, users } from '../../db/schema.js';
import { toIsoDate } from '../domain/dates.js';

export type AuthenticatedUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUri: string | null;
  locale: string;
  status: 'active';
  createdAt: string;
  sessionId: string;
};

export function toUserAccount(user: Omit<AuthenticatedUser, 'sessionId'>): UserAccount {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    ...(user.avatarUri ? { avatarUri: user.avatarUri } : {}),
    locale: user.locale as UserAccount['locale'],
    status: user.status,
    createdAt: user.createdAt,
  };
}

export async function requireAuth(request: FastifyRequest): Promise<AuthenticatedUser> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError(401, 'SESSION_REQUIRED', '请先登录');
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new AppError(401, 'SESSION_REQUIRED', '请先登录');
  }

  const database = requireDatabase();
  const now = new Date().toISOString();
  const [row] = await database
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, digestToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(users.status, 'active'),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AppError(401, 'SESSION_EXPIRED', '会话已过期，请重新登录');
  }
  return {
    id: row.user.id,
    email: row.user.email,
    passwordHash: row.user.passwordHash,
    displayName: row.user.displayName,
    avatarUri: row.user.avatarUri,
    locale: row.user.locale,
    status: 'active',
    createdAt: toIsoDate(row.user.createdAt),
    sessionId: row.session.id,
  };
}

export async function issueSession(
  executor: DbExecutor,
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const token = createOpaqueToken();
  const expiresAt = new Date(
    Date.now() + env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await executor.insert(sessions).values({
    id: createEntityId('session'),
    userId,
    tokenHash: digestToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}
