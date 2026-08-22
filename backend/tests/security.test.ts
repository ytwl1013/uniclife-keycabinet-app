import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../src/common/security/password.js';
import { parseCabinetQrPayload } from '../src/modules/cabinets/qr.js';

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
      parseCabinetQrPayload(
        'uniclife://cabinet/bg5163-bk/6ABAFE6B-2328-43E1-A461-70D3B660E5EF',
      ),
    ).toEqual({
      sku: 'BG5163-BK',
      deviceUuid: '6abafe6b-2328-43e1-a461-70d3b660e5ef',
      canonical: 'uniclife://cabinet/BG5163-BK/6abafe6b-2328-43e1-a461-70d3b660e5ef',
    });
    expect(parseCabinetQrPayload('https://example.com/not-a-cabinet')).toBeNull();
  });
});
