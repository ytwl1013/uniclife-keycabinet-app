import { eq, or, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';
import { requireDatabase } from '../src/db/client.js';
import {
  auditLogs,
  cabinetEvents,
  cabinetJoinInvitations,
  cabinetMemberships,
  cabinets,
  keys,
  loans,
} from '../src/db/schema.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('cabinet Super Admin workflow', () => {
  it('protects, transfers, disconnects, and permanently deletes according to role', async () => {
    const app = await buildServer();
    const database = requireDatabase();
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const register = async (label: string) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `super-admin-${label}-${runId}@example.com`,
          password: 'password-123',
          displayName: `Super Admin ${label}`,
          locale: 'zh-CN',
          acceptedTerms: true,
          acceptedPrivacy: true,
        },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data.session.token as string;
    };
    const [tokenA, tokenB] = await Promise.all([register('a'), register('b')]);
    const authorizationA = { authorization: `Bearer ${tokenA}` };
    const authorizationB = { authorization: `Bearer ${tokenB}` };

    const initialized = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/initialize',
      headers: authorizationA,
      payload: {
        productQrCode: 'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026',
        name: 'Super Admin Cabinet',
        timeZone: 'Asia/Shanghai',
        requestId: `initialize-${runId}`,
      },
    });
    expect(initialized.statusCode).toBe(200);
    expect(initialized.json().data.membership.role).toBe('super_admin');
    const cabinetId = initialized.json().data.cabinet.id as string;

    const invitation = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinetId}/join-invitations`,
      headers: authorizationA,
      payload: {},
    });
    const joined = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/join',
      headers: authorizationB,
      payload: {
        joinQrCode: invitation.json().data.invitation.joinQrCode,
        requestId: `join-${runId}`,
      },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json().data.membership.role).toBe('admin');
    const membershipAId = initialized.json().data.membership.id as string;
    const membershipBId = joined.json().data.membership.id as string;

    const protectedRemoval = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}/members/${membershipAId}`,
      headers: authorizationB,
      payload: { expectedVersion: 2, requestId: `remove-super-${runId}` },
    });
    expect(protectedRemoval.statusCode).toBe(403);
    expect(protectedRemoval.json().code).toBe('SUPER_ADMIN_REQUIRED');

    const protectedKeyDeletion = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}/keys`,
      headers: authorizationB,
      payload: { expectedVersion: 2, requestId: `delete-keys-as-admin-${runId}` },
    });
    expect(protectedKeyDeletion.statusCode).toBe(403);
    expect(protectedKeyDeletion.json().code).toBe('SUPER_ADMIN_REQUIRED');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/cabinets/${cabinetId}`,
      headers: authorizationA,
    });
    const firstSlotId = detail.json().data.slots[0].id as string;
    const added = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinetId}/keys`,
      headers: authorizationA,
      payload: {
        slotId: firstSlotId,
        name: 'Destructive test key',
        expectedVersion: 2,
        requestId: `add-key-${runId}`,
      },
    });
    expect(added.statusCode).toBe(200);
    const keyId = added.json().data.key.id as string;
    const checkedOut = await app.inject({
      method: 'POST',
      url: `/api/v1/keys/${keyId}/checkout`,
      headers: authorizationA,
      payload: {
        borrowerName: 'Audit history',
        expectedVersion: 3,
        requestId: `checkout-${runId}`,
      },
    });
    expect(checkedOut.statusCode).toBe(200);

    const blockedAccountDeletion = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: authorizationA,
      payload: { requestId: `delete-account-before-transfer-${runId}` },
    });
    expect(blockedAccountDeletion.statusCode).toBe(409);
    expect(blockedAccountDeletion.json().code).toBe('SUPER_ADMIN_TRANSFER_REQUIRED');

    const blockedSuperAdminDisconnect = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}/membership`,
      headers: authorizationA,
      payload: { expectedVersion: 4, requestId: `disconnect-super-admin-${runId}` },
    });
    expect(blockedSuperAdminDisconnect.statusCode).toBe(409);
    expect(blockedSuperAdminDisconnect.json().code).toBe('SUPER_ADMIN_TRANSFER_REQUIRED');

    const transferred = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinetId}/super-admin-transfer`,
      headers: authorizationA,
      payload: {
        membershipId: membershipBId,
        expectedVersion: 4,
        requestId: `transfer-${runId}`,
      },
    });
    expect(transferred.statusCode).toBe(200);
    expect(transferred.json().data).toMatchObject({
      previousSuperAdmin: { role: 'admin' },
      nextSuperAdmin: { role: 'super_admin' },
      cabinetVersion: 5,
    });

    const oldSuperAdminCannotRemove = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}/members/${membershipBId}`,
      headers: authorizationA,
      payload: { expectedVersion: 5, requestId: `remove-new-super-${runId}` },
    });
    expect(oldSuperAdminCannotRemove.statusCode).toBe(403);
    expect(oldSuperAdminCannotRemove.json().code).toBe('SUPER_ADMIN_REQUIRED');

    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}/membership`,
      headers: authorizationA,
      payload: { expectedVersion: 5, requestId: `disconnect-${runId}` },
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().data.cabinetVersion).toBe(6);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinetId}`,
      headers: authorizationB,
      payload: { expectedVersion: 6, requestId: `delete-${runId}` },
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().data).toMatchObject({ deleted: true, disconnectedMemberCount: 1 });

    expect(await database.select().from(cabinets).where(eq(cabinets.id, cabinetId))).toHaveLength(0);
    expect(
      await database.select().from(cabinetMemberships).where(eq(cabinetMemberships.cabinetId, cabinetId)),
    ).toHaveLength(0);
    expect(
      await database.select().from(cabinetJoinInvitations).where(eq(cabinetJoinInvitations.cabinetId, cabinetId)),
    ).toHaveLength(0);
    expect(await database.select().from(keys).where(eq(keys.cabinetId, cabinetId))).toHaveLength(0);
    expect(await database.select().from(loans).where(eq(loans.cabinetId, cabinetId))).toHaveLength(0);
    expect(
      await database.select().from(cabinetEvents).where(eq(cabinetEvents.cabinetId, cabinetId)),
    ).toHaveLength(0);

    const remainingCabinetAudits = await database
      .select()
      .from(auditLogs)
      .where(
        or(
          eq(auditLogs.targetId, cabinetId),
          sql<boolean>`${auditLogs.metadata}->>'cabinetId' = ${cabinetId}`,
        ),
      );
    expect(remainingCabinetAudits).toHaveLength(1);
    expect(remainingCabinetAudits[0]).toMatchObject({
      action: 'cabinets.deleted',
      result: 'success',
    });

    const deletedCabinetForFormerAdmins = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/cabinets', headers: authorizationA }),
      app.inject({ method: 'GET', url: '/api/v1/cabinets', headers: authorizationB }),
    ]);
    expect(deletedCabinetForFormerAdmins.every((response) => response.statusCode === 200)).toBe(true);
    expect(
      deletedCabinetForFormerAdmins.every((response) =>
        response.json().data.every(
          (summary: { cabinet: { id: string } }) => summary.cabinet.id !== cabinetId,
        ),
      ),
    ).toBe(true);

    await app.close();
  });
});
