import { createHmac, timingSafeEqual } from 'node:crypto';

type SessionPayload = {
  version: 1;
  username: string;
  issuedAt: number;
  expiresAt: number;
};

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64url');
}

export function createSignedSession(
  username: string,
  secret: string,
  ttlMilliseconds: number,
  now = Date.now(),
): string {
  const payload: SessionPayload = {
    version: 1,
    username,
    issuedAt: now,
    expiresAt: now + ttlMilliseconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifySignedSession(
  token: string,
  secret: string,
  now = Date.now(),
): SessionPayload | null {
  const [encodedPayload, providedSignature, extra] = token.split('.');
  if (!encodedPayload || !providedSignature || extra || token.length > 2048) return null;
  const expectedSignature = sign(encodedPayload, secret);
  const signatureLengthMatches =
    providedSignature.length === expectedSignature.length &&
    /^[A-Za-z0-9_-]+$/.test(providedSignature);
  const validSignature = timingSafeEqual(
    Buffer.from(signatureLengthMatches ? providedSignature : expectedSignature),
    Buffer.from(expectedSignature),
  );
  if (!validSignature || !signatureLengthMatches) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<SessionPayload>;
    if (
      payload.version !== 1 ||
      typeof payload.username !== 'string' ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.issuedAt > now + 60_000 ||
      payload.expiresAt <= now
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
