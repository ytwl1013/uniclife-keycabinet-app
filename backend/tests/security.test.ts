import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../src/common/security/password.js';
import { parseJoinQrPayload, parseProductQrPayload } from '../src/modules/cabinets/qr.js';

describe('security primitives', () => {
  it('hashes passwords with a random salt and verifies without exposing the password', async () => {
    const first = await hashPassword('correct-horse');
    const second = await hashPassword('correct-horse');

    expect(first).not.toBe(second);
    expect(first).not.toContain('correct-horse');
    await expect(verifyPassword('correct-horse', first)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', first)).resolves.toBe(false);
  });

  it('canonicalizes cabinet QR identifiers', () => {
    expect(
      parseProductQrPayload(
        'uniclife://cabinet/v1/init/bg5163-bk/uniclife-bg5163-bk-2026',
      ),
    ).toEqual({
      sku: 'BG5163-BK',
      canonical: 'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026',
    });
    expect(parseProductQrPayload('https://example.com/not-a-cabinet')).toBeNull();
    expect(
      parseJoinQrPayload('uniclife://cabinet/v1/join/abcdefghijklmnopqrstuvwxyzABCDEFG'),
    ).toMatchObject({ token: 'abcdefghijklmnopqrstuvwxyzABCDEFG' });
  });
});
