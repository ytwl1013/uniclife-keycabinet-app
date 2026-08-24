import { randomUUID } from 'node:crypto';

import {
  realtimeEventSchema,
  realtimeProtocol,
  type RealtimeWorkspaceChangedEvent,
} from '@uniclife/shared';
import { describe, expect, it } from 'vitest';
import WebSocket, { type RawData } from 'ws';

import { buildServer } from '../src/app/server.js';
import { requireDatabase } from '../src/db/client.js';
import { cabinetQrs } from '../src/db/schema.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

type ApiResult = {
  status: number;
  body: {
    code: string;
    data: any;
    message: string;
  };
};

async function apiRequest(
  baseUrl: string,
  path: string,
  input: {
    method?: string;
    payload?: unknown;
    token?: string;
  } = {},
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method: input.method ?? 'GET',
    headers: {
      ...(input.payload === undefined ? {} : { 'content-type': 'application/json' }),
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
    },
    ...(input.payload === undefined ? {} : { body: JSON.stringify(input.payload) }),
  });
  return {
    status: response.status,
    body: await response.json() as ApiResult['body'],
  };
}

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WEBSOCKET_OPEN_TIMEOUT')), 3_000);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function waitForCabinetChange(
  socket: WebSocket,
  expected: { cabinetId: string; minimumVersion: number; resource: string },
): Promise<RealtimeWorkspaceChangedEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error(`REALTIME_EVENT_TIMEOUT:${expected.resource}`));
    }, 3_000);
    const onMessage = (data: RawData) => {
      const parsed = realtimeEventSchema.safeParse(JSON.parse(data.toString()));
      if (!parsed.success || parsed.data.type !== 'workspace.changed') return;
      if (
        parsed.data.cabinetId !== expected.cabinetId ||
        parsed.data.cabinetVersion < expected.minimumVersion ||
        !parsed.data.resources.includes(
          expected.resource as RealtimeWorkspaceChangedEvent['resources'][number],
        )
      ) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(parsed.data);
    };
    socket.on('message', onMessage);
  });
}

databaseTest('realtime cross-session data flow', () => {
  it('pushes A writes to B and lets B read the committed REST state', async () => {
    const app = await buildServer();
    let socket: WebSocket | undefined;

    try {
      const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
      const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const deviceUuid = randomUUID();
      const testCabinetQr = `uniclife://cabinet/BG5163-BK/${deviceUuid}`;
      await requireDatabase().insert(cabinetQrs).values({
        code: testCabinetQr,
        deviceUuid,
        id: `qr-realtime-${deviceUuid}`,
        skuId: 'sku-bg5163-bk',
        status: 'active',
      });
      const register = (label: string) => apiRequest(baseUrl, '/auth/register', {
        method: 'POST',
        payload: {
          acceptedPrivacy: true,
          acceptedTerms: true,
          displayName: `Realtime ${label}`,
          email: `realtime-${label}-${runId}@example.com`,
          locale: 'zh-CN',
          password: 'password-123',
        },
      });
      const [accountA, accountB] = await Promise.all([register('a'), register('b')]);
      expect(accountA.status).toBe(201);
      expect(accountB.status).toBe(201);
      const tokenA = accountA.body.data.session.token as string;
      const tokenB = accountB.body.data.session.token as string;

      const bind = (token: string, requestId: string) => apiRequest(baseUrl, '/cabinets/bind', {
        method: 'POST',
        token,
        payload: {
          name: 'Realtime Shared Cabinet',
          qrCode: testCabinetQr,
          requestId,
          timeZone: 'Asia/Shanghai',
        },
      });
      const boundA = await bind(tokenA, `bind-a-${runId}`);
      const boundB = await bind(tokenB, `bind-b-${runId}`);
      expect(boundA.status).toBe(200);
      expect(boundB.status).toBe(200);
      const cabinetId = boundB.body.data.cabinet.id as string;
      let cabinetVersion = boundB.body.data.cabinet.version as number;

      socket = new WebSocket(
        `${baseUrl.replace('http:', 'ws:')}/api/v1/realtime`,
        realtimeProtocol,
        { headers: { authorization: `Bearer ${tokenB}` } },
      );
      await waitForOpen(socket);

      const renamedName = `Realtime Cabinet ${runId}`;
      const renameEvent = waitForCabinetChange(socket, {
        cabinetId,
        minimumVersion: cabinetVersion + 1,
        resource: 'cabinets',
      });
      const renamed = await apiRequest(baseUrl, `/cabinets/${cabinetId}`, {
        method: 'PATCH',
        token: tokenA,
        payload: {
          expectedVersion: cabinetVersion,
          name: renamedName,
          requestId: `rename-${runId}`,
        },
      });
      expect(renamed.status).toBe(200);
      cabinetVersion = renamed.body.data.version as number;
      expect((await renameEvent).cabinetVersion).toBe(cabinetVersion);

      let detailB = await apiRequest(baseUrl, `/cabinets/${cabinetId}`, { token: tokenB });
      expect(detailB.status).toBe(200);
      expect(detailB.body.data.cabinet).toMatchObject({
        name: renamedName,
        version: cabinetVersion,
      });
      const firstSlotId = detailB.body.data.slots[0].id as string;

      const keyName = `Realtime Key ${runId}`;
      const keyEvent = waitForCabinetChange(socket, {
        cabinetId,
        minimumVersion: cabinetVersion + 1,
        resource: 'keys',
      });
      const added = await apiRequest(baseUrl, `/cabinets/${cabinetId}/keys`, {
        method: 'POST',
        token: tokenA,
        payload: {
          expectedVersion: cabinetVersion,
          name: keyName,
          requestId: `add-key-${runId}`,
          slotId: firstSlotId,
        },
      });
      expect(added.status).toBe(200);
      cabinetVersion = added.body.data.cabinetVersion as number;
      expect((await keyEvent).cabinetVersion).toBe(cabinetVersion);
      const keyId = added.body.data.key.id as string;

      detailB = await apiRequest(baseUrl, `/cabinets/${cabinetId}`, { token: tokenB });
      expect(detailB.body.data.keys).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: keyId, name: keyName })]),
      );

      const loanEvent = waitForCabinetChange(socket, {
        cabinetId,
        minimumVersion: cabinetVersion + 1,
        resource: 'loans',
      });
      const checkedOut = await apiRequest(baseUrl, `/keys/${keyId}/checkout`, {
        method: 'POST',
        token: tokenA,
        payload: {
          borrowerName: 'Realtime Borrower',
          expectedVersion: cabinetVersion,
          requestId: `checkout-${runId}`,
        },
      });
      expect(checkedOut.status).toBe(200);
      cabinetVersion = checkedOut.body.data.cabinetVersion as number;
      expect((await loanEvent).cabinetVersion).toBe(cabinetVersion);

      const [loansB, eventsB, checkedOutDetailB] = await Promise.all([
        apiRequest(baseUrl, '/records/loans?status=active', { token: tokenB }),
        apiRequest(baseUrl, `/records/events?cabinetId=${cabinetId}`, { token: tokenB }),
        apiRequest(baseUrl, `/cabinets/${cabinetId}`, { token: tokenB }),
      ]);
      expect(loansB.body.data.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ keyId, status: 'active' })]),
      );
      expect(eventsB.body.data.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ keyId, type: 'checkout' })]),
      );
      expect(checkedOutDetailB.body.data.keys).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: keyId, status: 'borrowed' })]),
      );
    } finally {
      socket?.terminate();
      await app.close();
    }
  }, 15_000);
});
