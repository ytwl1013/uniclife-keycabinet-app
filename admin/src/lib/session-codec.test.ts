import { describe, expect, it } from 'vitest';

import { createSignedSession, verifySignedSession } from './session-codec';

describe('admin session codec', () => {
  const secret = 'test-session-secret-that-is-longer-than-32-characters';

  it('accepts a valid signed session before expiry', () => {
    const token = createSignedSession('admin@example.com', secret, 60_000, 1_000);
    expect(verifySignedSession(token, secret, 2_000)).toMatchObject({
      username: 'admin@example.com',
      expiresAt: 61_000,
    });
  });

  it('rejects tampering, a wrong secret, and expired sessions', () => {
    const token = createSignedSession('admin@example.com', secret, 60_000, 1_000);
    expect(verifySignedSession(`${token}x`, secret, 2_000)).toBeNull();
    expect(verifySignedSession(token, `${secret}-wrong`, 2_000)).toBeNull();
    expect(verifySignedSession(token, secret, 61_000)).toBeNull();
  });
});
