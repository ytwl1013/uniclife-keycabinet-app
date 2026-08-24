import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('backend API workflow', () => {
  it('supports registration, cabinet binding, key checkout, return, and activity', async () => {
    const app = await buildServer();
    const email = `api-${Date.now()}@example.com`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'password-123',
        displayName: 'API Test',
        locale: 'en-US',
        acceptedTerms: true,
        acceptedPrivacy: true,
      },
    });
    expect(registerResponse.statusCode).toBe(201);
    const registerBody = registerResponse.json();
    expect(registerBody.data.user).toMatchObject({
      loginCount: 1,
      homeGuidePromptedAt: null,
    });
    expect(Date.parse(registerBody.data.user.lastLoginAt)).not.toBeNaN();
    const token = registerBody.data.session.token as string;
    const authorization = { authorization: `Bearer ${token}` };

    const guideResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/home-guide',
      headers: authorization,
      payload: {
        prompted: true,
        requestId: 'home-guide-request-0001',
      },
    });
    expect(guideResponse.statusCode).toBe(200);
    expect(Date.parse(guideResponse.json().data.homeGuidePromptedAt)).not.toBeNaN();

    const signInResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      payload: { email, password: 'password-123' },
    });
    expect(signInResponse.statusCode).toBe(200);
    expect(signInResponse.json().data.user).toMatchObject({ loginCount: 2 });

    const bindResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/bind',
      headers: authorization,
      payload: {
        qrCode: 'uniclife://cabinet/BG5163-BK/6abafe6b-2328-43e1-a461-70d3b660e5ef',
        name: 'Integration Cabinet',
        timeZone: 'Asia/Shanghai',
        requestId: 'bind-request-0001',
      },
    });
    expect(bindResponse.statusCode).toBe(200);
    const cabinet = bindResponse.json().data.cabinet;
    expect(cabinet.version).toBe(1);

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/cabinets/${cabinet.id}`,
      headers: authorization,
    });
    expect(detailResponse.statusCode).toBe(200);
    const firstSlot = detailResponse.json().data.slots[0];

    const addResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinet.id}/keys`,
      headers: authorization,
      payload: {
        slotId: firstSlot.id,
        name: 'Reception',
        note: 'Front desk',
        expectedVersion: cabinet.version,
        requestId: 'add-key-request-0001',
      },
    });
    expect(addResponse.statusCode).toBe(200);
    const key = addResponse.json().data.key;
    expect(addResponse.json().data.cabinetVersion).toBe(2);

    const replayResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/cabinets/${cabinet.id}/keys`,
      headers: authorization,
      payload: {
        slotId: firstSlot.id,
        name: 'Reception',
        note: 'Front desk',
        expectedVersion: cabinet.version,
        requestId: 'add-key-request-0001',
      },
    });
    expect(replayResponse.json()).toEqual(addResponse.json());

    const checkoutResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/keys/${key.id}/checkout`,
      headers: authorization,
      payload: {
        borrowerName: 'Sample Borrower',
        expectedReturnAt: new Date(Date.now() + 60_000).toISOString(),
        expectedVersion: 2,
        requestId: 'checkout-request-0001',
      },
    });
    expect(checkoutResponse.statusCode).toBe(200);
    expect(checkoutResponse.json().data.key.status).toBe('borrowed');

    const returnResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/keys/${key.id}/return`,
      headers: authorization,
      payload: {
        expectedVersion: 3,
        requestId: 'return-request-0001',
      },
    });
    expect(returnResponse.statusCode).toBe(200);
    expect(returnResponse.json().data.key.status).toBe('available');

    const secondCheckoutResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/keys/${key.id}/checkout`,
      headers: authorization,
      payload: {
        borrowerName: 'Second Borrower',
        expectedVersion: 4,
        requestId: 'checkout-request-0002',
      },
    });
    expect(secondCheckoutResponse.statusCode).toBe(200);

    const bulkDeleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/cabinets/${cabinet.id}/keys`,
      headers: authorization,
      payload: {
        expectedVersion: 5,
        requestId: 'delete-keys-request-0001',
      },
    });
    expect(bulkDeleteResponse.statusCode).toBe(200);
    expect(bulkDeleteResponse.json().data).toMatchObject({
      deletedCount: 1,
      cancelledLoanCount: 1,
      cabinetVersion: 6,
    });

    const loansResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/records/loans?status=returned',
      headers: authorization,
    });
    expect(loansResponse.statusCode).toBe(200);
    expect(loansResponse.json().data.items).toHaveLength(1);

    const cancelledLoansResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/records/loans?status=cancelled',
      headers: authorization,
    });
    expect(cancelledLoansResponse.statusCode).toBe(200);
    expect(cancelledLoansResponse.json().data.items).toHaveLength(1);

    const eventsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/records/events?cabinetId=${cabinet.id}`,
      headers: authorization,
    });
    expect(eventsResponse.statusCode).toBe(200);
    expect(eventsResponse.json().data.items.map((event: { type: string }) => event.type)).toEqual(
      expect.arrayContaining(['cabinet_bound', 'key_added', 'checkout', 'return', 'keys_deleted']),
    );

    await app.close();
  });
});
