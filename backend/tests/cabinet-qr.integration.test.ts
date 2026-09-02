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
    expect(first.json().data.membership.role).toBe('super_admin');
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
    expect(joined.json().data.membership.role).toBe('admin');

    const reused = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/join',
      headers: { authorization: `Bearer ${tokenC}` },
      payload: { joinQrCode, requestId: `join-c-${runId}` },
    });
    expect(reused.statusCode).toBe(409);
    expect(reused.json().code).toBe('JOIN_INVITATION_INVALID');

    const joinedCabinetVersion = joined.json().data.cabinet.version as number;
    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}/membership`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        expectedVersion: joinedCabinetVersion,
        requestId: `disconnect-b-${runId}`,
      },
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().data).toMatchObject({
      removed: true,
      cabinetVersion: joinedCabinetVersion + 1,
    });

    const disconnectedList = await app.inject({
      method: 'GET',
      url: '/api/v1/cabinets',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(disconnectedList.statusCode).toBe(200);
    expect(disconnectedList.json().data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cabinet: expect.objectContaining({ id: cabinetId }) }),
      ]),
    );

    const disconnectedDetail = await app.inject({
      method: 'GET',
      url: `/api/v1/cabinets/${cabinetId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(disconnectedDetail.statusCode).toBe(403);

    const remainingAdminDetail = await app.inject({
      method: 'GET',
      url: `/api/v1/cabinets/${cabinetId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(remainingAdminDetail.statusCode).toBe(200);

    const remainingAdminEvents = await app.inject({
      method: 'GET',
      url: `/api/v1/records/events?cabinetId=${cabinetId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(remainingAdminEvents.statusCode).toBe(200);
    expect(remainingAdminEvents.json().data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'member_removed',
          summaryData: expect.objectContaining({ reason: 'self_disconnected' }),
        }),
      ]),
    );

    await app.close();
  });
});
