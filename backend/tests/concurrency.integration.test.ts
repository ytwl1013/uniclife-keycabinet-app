import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';
import { sql } from '../src/db/client.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('concurrent cabinet writes on PostgreSQL', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let sequence = 0;
  const addresses = new Map<string, string>();

  async function api(token: string, method: any, path: string, payload?: any) {
    const response = await app.inject({
      method, url: `/api/v1${path}`,
      remoteAddress: addresses.get(token) ?? '127.10.0.1',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      ...(payload === undefined ? {} : { payload: { requestId: randomUUID(), ...payload } }),
    });
    return { status: response.statusCode, ...response.json() };
  }

  async function account() {
    const address = `127.10.1.${++sequence}`;
    const response = await app.inject({
      method: 'POST', url: '/api/v1/auth/register', remoteAddress: address,
      payload: { email: `concurrency-${randomUUID()}@example.com`, password: randomUUID(),
        displayName: 'Concurrency test', locale: 'en-US', acceptedTerms: true, acceptedPrivacy: true },
    });
    expect(response.statusCode).toBe(201);
    const token = response.json().data.session.token as string;
    addresses.set(token, address);
    return token;
  }

  async function fixture() {
    const [owner, member] = await Promise.all([account(), account()]);
    const initialized = await api(owner, 'POST', '/cabinets/initialize', {
      name: 'Concurrent test', productQrCode: 'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026',
    });
    expect(initialized.status).toBe(200);
    const cabinetId = initialized.data.cabinet.id as string;
    const invitation = await api(owner, 'POST', `/cabinets/${cabinetId}/join-invitations`, {});
    expect(invitation.status).toBe(200);
    const joined = await api(member, 'POST', '/cabinets/join', { joinQrCode: invitation.data.invitation.joinQrCode });
    expect(joined.status).toBe(200);
    const detail = await api(owner, 'GET', `/cabinets/${cabinetId}`);
    const added = await api(owner, 'POST', `/cabinets/${cabinetId}/keys`, { slotId: detail.data.slots[0].id, name: 'Test key' });
    expect(added.status).toBe(200);
    return { owner, member, cabinetId, keyId: added.data.key.id as string, version: added.data.cabinetVersion, slots: detail.data.slots };
  }

  async function waitForLock(fragment: string) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const rows = await sql!`select pid from pg_stat_activity where datname=current_database()
        and pid<>pg_backend_pid() and wait_event_type='Lock' and query like ${`%${fragment}%`}`;
      if (rows.length) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Lock wait not reached: ${fragment}`);
  }

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app?.close(); });

  it('admits one borrower, one return, and one event for parallel idempotent replays', async () => {
    const f = await fixture();
    const checkout = await Promise.all([f.owner, f.member].map(token =>
      api(token, 'POST', `/keys/${f.keyId}/checkout`, { borrowerName: 'Test borrower' })));
    expect(checkout.map(r => r.status).sort()).toEqual([200, 409]);
    const returns = await Promise.all([f.owner, f.member].map(token => api(token, 'POST', `/keys/${f.keyId}/return`, {})));
    expect(returns.map(r => r.status).sort()).toEqual([200, 409]);
    const requestId = randomUUID();
    const replay = await Promise.all(Array.from({ length: 10 }, () => api(f.owner, 'POST', `/keys/${f.keyId}/checkout`, { borrowerName: 'Replay', requestId })));
    expect(replay.every(r => r.status === 200 && r.data.event.id === replay[0].data.event.id)).toBe(true);
    const [counts] = await sql!`select count(*)::int as total, count(*) filter(where status='active')::int as active from loans where key_id=${f.keyId}`;
    expect(counts).toEqual({ total: 2, active: 1 });
  });

  it('returns a business conflict when two users add to the same slot', async () => {
    const f = await fixture();
    const results = await Promise.all([f.owner, f.member].map(token => api(token, 'POST', `/cabinets/${f.cabinetId}/keys`, {
      slotId: f.slots[1].id, name: 'Contended slot', expectedVersion: f.version,
    })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(results.find(r => r.status === 409)?.code).toBe('SLOT_OCCUPIED');
  });

  it('serializes deletion and checkout without requiring expectedVersion', async () => {
    const f = await fixture();
    for (let round = 0; round < 12; round++) {
      const added = await api(f.owner, 'POST', `/cabinets/${f.cabinetId}/keys`, { slotId: f.slots[round + 1].id, name: `Delete race ${round}` });
      expect(added.status).toBe(200);
      const keyId = added.data.key.id;
      const operations = [
        () => api(f.owner, 'DELETE', `/keys/${keyId}`, {}),
        () => api(f.member, 'POST', `/keys/${keyId}/checkout`, { borrowerName: 'Race' }),
      ];
      if (round % 2) operations.reverse();
      const results = await Promise.all(operations.map(operation => operation()));
      expect(results.filter(r => r.status === 200)).toHaveLength(1);
      expect(results.every(r => [200, 404, 409].includes(r.status))).toBe(true);
    }
    const orphaned = await sql!`select l.id from loans l left join keys k on k.id=l.key_id
      where l.cabinet_id=${f.cabinetId} and l.status='active' and k.id is null`;
    expect(orphaned).toHaveLength(0);
  });

  it('does not deadlock when clearing waits behind a checkout holding a key lock', async () => {
    const f = await fixture();
    const blocker = await sql!.reserve();
    let operations: Promise<any>[] = [];
    try {
      await blocker`begin`;
      await blocker`select id from keys where id=${f.keyId} for update`;
      const checkout = api(f.member, 'POST', `/keys/${f.keyId}/checkout`, { borrowerName: 'Race', expectedVersion: f.version });
      operations.push(checkout);
      await waitForLock('update "keys"');
      const clearing = api(f.owner, 'DELETE', `/cabinets/${f.cabinetId}/keys`, { expectedVersion: f.version });
      operations.push(clearing);
      await waitForLock('for update');
      await blocker`commit`;
      const results = await Promise.all(operations);
      expect(results.map(r => r.status)).toEqual([200, 409]);
      expect(results[1].code).toBe('VERSION_CONFLICT');
      const [active] = await sql!`select count(*)::int as count from loans where key_id=${f.keyId} and status='active'`;
      expect(active?.count).toBe(1);
    } finally {
      await blocker`rollback`;
      blocker.release();
      await Promise.allSettled(operations);
    }
  }, 10_000);

  it('retains active loans in cabinet detail after more than 200 historical loans', async () => {
    const f = await fixture();
    const checkout = await api(f.owner, 'POST', `/keys/${f.keyId}/checkout`, { borrowerName: 'Long loan', checkedOutAt: '2025-01-01T00:00:00Z' });
    expect(checkout.status).toBe(200);
    const [loan] = await sql!`select * from loans where key_id=${f.keyId}`;
    await sql!`insert into loans (id,cabinet_id,key_id,borrower_name,checked_out_at,returned_at,status,operator_id,checkout_event_id)
      select ${`history-${randomUUID()}-`} || n, ${f.cabinetId}, 'historical-deleted-key', 'Historical test',
        '2026-01-01'::timestamptz + n * interval '1 minute', '2026-01-01'::timestamptz + n * interval '1 minute' + interval '30 seconds',
        'returned', ${loan!.operator_id}, 'historical-test-event' from generate_series(1,201) n`;
    const detail = await api(f.owner, 'GET', `/cabinets/${f.cabinetId}`);
    expect(detail.data.activeLoans.map((item: any) => item.id)).toContain(loan!.id);
    expect(detail.data.keys.find((key: any) => key.id === f.keyId).status).toBe('borrowed');
  });
});
