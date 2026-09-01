type AttemptBucket = { count: number; resetAt: number };

const buckets = new Map<string, AttemptBucket>();

export function consumeLoginAttempt(
  key: string,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const windowMilliseconds = 15 * 60 * 1000;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMilliseconds });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= 5) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginAttempts(key: string): void {
  buckets.delete(key);
}
