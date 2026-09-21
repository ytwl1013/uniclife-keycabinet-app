import type { PushPlatform } from '@uniclife/shared';
import { and, eq, gt, isNull, or } from 'drizzle-orm';

import { createEntityId } from '../../common/security/ids.js';
import type { DbExecutor } from '../../db/client.js';
import { pushTokens, sessions } from '../../db/schema.js';

export async function registerPushToken(
  executor: DbExecutor,
  input: { platform: PushPlatform; sessionId: string; token: string; userId: string },
): Promise<string> {
  const now = new Date().toISOString();
  const [registered] = await executor
    .insert(pushTokens)
    .values({
      id: createEntityId('push-token'),
      platform: input.platform,
      sessionId: input.sessionId,
      token: input.token,
      updatedAt: now,
      userId: input.userId,
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        platform: input.platform,
        sessionId: input.sessionId,
        updatedAt: now,
        userId: input.userId,
      },
    })
    .returning({ id: pushTokens.id });
  if (!registered) throw new Error('PUSH_TOKEN_REGISTER_FAILED');
  return registered.id;
}

export async function unregisterPushToken(
  executor: DbExecutor,
  input: { token: string; userId: string },
): Promise<boolean> {
  const removed = await executor
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, input.token), eq(pushTokens.userId, input.userId)))
    .returning({ id: pushTokens.id });
  return removed.length > 0;
}

export async function listUserPushTokens(
  executor: DbExecutor,
  userId: string,
): Promise<Array<{ id: string; token: string }>> {
  return executor
    .select({ id: pushTokens.id, token: pushTokens.token })
    .from(pushTokens)
    .innerJoin(sessions, eq(pushTokens.sessionId, sessions.id))
    .where(and(
      eq(pushTokens.userId, userId),
      isNull(sessions.revokedAt),
      or(isNull(sessions.expiresAt), gt(sessions.expiresAt, new Date().toISOString())),
    ));
}

export async function deletePushTokensByValue(
  executor: DbExecutor,
  tokens: string[],
): Promise<void> {
  if (!tokens.length) return;
  for (const token of tokens) {
    await executor.delete(pushTokens).where(eq(pushTokens.token, token));
  }
}
