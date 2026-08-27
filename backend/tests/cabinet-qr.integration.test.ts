import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('cabinet QR workflow', () => {
  it('initializes a fresh cabinet per product scan and joins only through a one-time invitation', async () => {
    const app = await buildServer();
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const register = async (label: string) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `cabinet-${label}-${runId}@example.com`,
          password: 'password-123',
          displayName: `Cabinet ${label}`,
          locale: 'zh-CN',
          acceptedTerms: true,
          acceptedPrivacy: true,
        },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data.session.token as string;
    };
    const [tokenA, tokenB, tokenC] = await Promise.all([
      register('a'),
      register('b'),
      register('c'),
    ]);
    const productQrCode =
      'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026';
    const initialize = (requestId: string, name: string) => app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/initialize',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { productQrCode, name, timeZone: 'Asia/Shanghai', requestId },
    });

    const first = await initialize(`initialize-first-${runId}`, 'First Cabinet');
    expect(first.statusCode).toBe(200);
    const replay = await initialize(`initialize-first-${runId}`, 'First Cabinet');
    expect(replay.json()).toEqual(first.json());
    const second = await initialize(`initialize-second-${runId}`, 'Second Cabinet');
    expect(second.statusCode).toBe(200);
    expect(second.json().data.cabinet.id).not.toBe(first.json().data.cabinet.id);

    const cabinetId = first.json().data.cabinet.id as string;
    const nonMemberInvitation = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinetId}/join-invitations`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {},
    });
    expect(nonMemberInvitation.statusCode).toBe(403);

    const invitation = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinetId}/join-invitations`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {},
    });
    expect(invitation.statusCode).toBe(200);
    const joinQrCode = invitation.json().data.invitation.joinQrCode as string;
    expect(joinQrCode).toMatch(/^uniclife:\/\/cabinet\/v1\/join\//);

    const resolved = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/resolve-qr',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { code: joinQrCode },
    });
    expect(resolved.json().data).toMatchObject({
      kind: 'join',
      alreadyMember: false,
      cabinet: { id: cabinetId, name: 'First Cabinet' },
    });

    const joined = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/join',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { joinQrCode, requestId: `join-b-${runId}` },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json().data.cabinet.id).toBe(cabinetId);

    const reused = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/join',
      headers: { authorization: `Bearer ${tokenC}` },
      payload: { joinQrCode, requestId: `join-c-${runId}` },
    });
    expect(reused.statusCode).toBe(409);
    expect(reused.json().code).toBe('JOIN_INVITATION_INVALID');

    await app.close();
  });
});
