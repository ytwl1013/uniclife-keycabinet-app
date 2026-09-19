/** Local PostgreSQL correctness load test; never targets an existing HTTP service. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { buildServer } from '../src/app/server.js';
import { sql } from '../src/db/client.js';

const databaseUrl = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/invalid');
assert.equal(process.env.NODE_ENV, 'test', 'Load tests require NODE_ENV=test');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname), 'Only a loopback database is allowed');
assert.match(databaseUrl.pathname, /^\/keycabinet_load(?:_[a-z0-9]+)?$/, 'Use a dedicated keycabinet_load database');
const usersCount = 32;
const rounds = Number(process.env.LOAD_ROUNDS ?? 40);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 40);
const app = await buildServer();
const accounts: { token: string; id: string; address: string }[] = [];
const fixtures: { id: string; slots: string[]; keys: string[]; owner: number }[] = [];
const responses: { phase: string; status: number; code: string; ms: number }[] = [];
const checkoutEvents = new Set<string>();
const returnEvents = new Set<string>();
const checkoutInputs = new Map<string, { actorId: string; keyId: string; borrowerName: string }>();
const returnInputs = new Map<string, { actorId: string; keyId: string }>();
let expectedFailures = 0;
let phase = 'setup';
let httpBase: string | undefined;

async function request(userIndex: number, method: any, path: string, payload?: any, transport: 'inject' | 'http' = 'inject') {
  const user = accounts[userIndex];
  const body = payload === undefined ? undefined : { requestId: randomUUID(), ...payload };
  const start = performance.now();
  let status: number;
  let result: any;
  if (transport === 'http') {
    const response = await fetch(`${httpBase}/api/v1${path}`, {
      method, headers: { authorization: `Bearer ${user!.token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    status = response.status;
    result = await response.json();
  } else {
    const response = await app.inject({
      method, url: `/api/v1${path}`, remoteAddress: user?.address ?? `127.30.0.${userIndex + 1}`,
      headers: user ? { authorization: `Bearer ${user.token}` } : {}, ...(body ? { payload: body } : {}),
    });
    status = response.statusCode;
    result = response.json();
  }
  responses.push({ phase, status, code: result.code, ms: performance.now() - start });
  assert.ok([200, 201, 403, 404, 409].includes(status), `Unexpected ${status} ${result.code} at ${method} ${path}`);
  if (status >= 400) expectedFailures++;
  if (status === 200 && path.endsWith('/checkout')) checkoutEvents.add(result.data.event.id);
  if (status === 200 && path.endsWith('/return')) returnEvents.add(result.data.event.id);
  if (status === 200 && path.endsWith('/checkout')) checkoutInputs.set(result.data.event.id, {
    actorId: user!.id, keyId: path.split('/')[2], borrowerName: body.borrowerName,
  });
  if (status === 200 && path.endsWith('/return')) returnInputs.set(result.data.event.id, {
    actorId: user!.id, keyId: path.split('/')[2],
  });
  return { status, ...result };
}

async function cabinet(owner: number, members: number[]) {
  const created = await request(owner, 'POST', '/cabinets/initialize', {
    name: `Load fixture ${randomUUID()}`, productQrCode: 'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026',
  });
  assert.equal(created.status, 200);
  const id = created.data.cabinet.id as string;
  for (const member of members.filter(index => index !== owner)) {
    const invite = await request(owner, 'POST', `/cabinets/${id}/join-invitations`, {});
    assert.equal(invite.status, 200);
    const joined = await request(member, 'POST', '/cabinets/join', { joinQrCode: invite.data.invitation.joinQrCode });
    assert.equal(joined.status, 200);
  }
  const detail = await request(owner, 'GET', `/cabinets/${id}`);
  return { id, owner, slots: detail.data.slots.map((slot: any) => slot.id) as string[], keys: [] as string[] };
}

async function add(fixture: typeof fixtures[number], slot: number) {
  const added = await request(fixture.owner, 'POST', `/cabinets/${fixture.id}/keys`, { slotId: fixture.slots[slot], name: `Load key ${slot}` });
  assert.equal(added.status, 200);
  return added.data.key.id as string;
}

async function reconcile(label: string) {
  const checks = {
    orphanActiveLoans: await sql!`select l.id from loans l left join keys k on k.id=l.key_id where l.status='active' and k.id is null`,
    duplicateActiveLoans: await sql!`select key_id from loans where status='active' group by key_id having count(*)<>1`,
    keyStatusMismatch: await sql!`select k.id from keys k left join loans l on l.key_id=k.id and l.status='active' where (k.status='borrowed')<>(l.id is not null)`,
    loanEventMismatch: await sql!`select l.id from loans l left join cabinet_events e on e.id=l.checkout_event_id
      left join cabinet_events r on r.id=l.return_event_id where e.id is null or e.type<>'checkout'
      or e.key_id<>l.key_id or e.cabinet_id<>l.cabinet_id or e.actor_id<>l.operator_id or e.related_loan_id<>l.id
      or e.occurred_at<>l.checked_out_at or (l.status='returned' and (r.id is null or r.type<>'return'
        or r.key_id<>l.key_id or r.cabinet_id<>l.cabinet_id or r.actor_id<>l.return_operator_id or r.related_loan_id<>l.id
        or r.occurred_at<>l.returned_at or l.returned_at<l.checked_out_at))`,
    orphanCheckoutEvents: await sql!`select e.id from cabinet_events e left join loans l on l.checkout_event_id=e.id where e.type='checkout' and l.id is null`,
    orphanReturnEvents: await sql!`select e.id from cabinet_events e left join loans l on l.return_event_id=e.id where e.type='return' and l.id is null`,
    checkoutAuditMismatch: await sql!`select l.id from loans l left join audit_logs a on a.metadata->>'loanId'=l.id
      and a.action='keys.checked_out' and a.result='success' and a.target_id=l.key_id
      and a.actor_id=l.operator_id and a.metadata->>'eventId'=l.checkout_event_id group by l.id having count(a.id)<>1`,
    returnAuditMismatch: await sql!`select l.id from loans l left join audit_logs a on a.metadata->>'loanId'=l.id
      and a.action='keys.returned' and a.result='success' and a.target_id=l.key_id
      and a.actor_id=l.return_operator_id and a.metadata->>'eventId'=l.return_event_id
      where l.status='returned' group by l.id having count(a.id)<>1`,
    keyMutationAuditMismatch: await sql!`select e.id from cabinet_events e left join audit_logs a on a.metadata->>'eventId'=e.id
      and a.target_id=e.key_id and a.actor_id=e.actor_id and a.result='success'
      and a.action=case e.type when 'key_added' then 'keys.added' when 'key_updated' then 'keys.updated' when 'key_deleted' then 'keys.deleted' end
      where e.type in ('key_added','key_updated','key_deleted') group by e.id having count(a.id)<>1`,
    cabinetVersionMismatch: await sql!`select c.id from cabinets c left join cabinet_events e on e.cabinet_id=c.id group by c.id having c.version<>count(e.id)`,
    unfinishedIdempotency: await sql!`select request_id from idempotency_records where status_code<>200 or response_body is null`,
  };
  for (const [name, failures] of Object.entries(checks)) assert.equal(failures.length, 0, `${label}: ${name}=${failures.length}`);
  const checkoutRows = await sql!`select id from cabinet_events where type='checkout'`;
  const returnRows = await sql!`select id from cabinet_events where type='return'`;
  assert.deepEqual(new Set(checkoutRows.map(row => row.id)), checkoutEvents, `${label}: checkout response/event ledger mismatch`);
  assert.deepEqual(new Set(returnRows.map(row => row.id)), returnEvents, `${label}: return response/event ledger mismatch`);
  const loanRows = await sql!`select checkout_event_id, return_event_id, operator_id, return_operator_id, key_id, borrower_name from loans`;
  for (const row of loanRows) {
    assert.deepEqual({ actorId: row.operator_id, keyId: row.key_id, borrowerName: row.borrower_name }, checkoutInputs.get(row.checkout_event_id), `${label}: checkout input differs from committed loan`);
    if (row.return_event_id) assert.deepEqual({ actorId: row.return_operator_id, keyId: row.key_id }, returnInputs.get(row.return_event_id), `${label}: return actor differs from committed loan`);
  }
  const [audit] = await sql!`select count(*)::int as count from audit_logs where result='failure'`;
  assert.equal(audit!.count, expectedFailures, `${label}: failed responses must have failure audits`);
  console.log(JSON.stringify({ checkpoint: label, checks: Object.fromEntries(Object.entries(checks).map(([name, rows]) => [name, rows.length])), checkoutEvents: checkoutEvents.size, returnEvents: returnEvents.size, failedOperationsAudited: expectedFailures }));
}

try {
  const [existing] = await sql!`select count(*)::int as count from users`;
  assert.equal(existing!.count, 0, 'Load database must be empty of users; no cleanup or truncation is performed');
  for (let index = 0; index < usersCount; index++) {
    const response = await request(index, 'POST', '/auth/register', {
      email: `load-${randomUUID()}@example.com`, password: randomUUID(), displayName: `Load user ${index}`,
      locale: 'en-US', acceptedTerms: true, acceptedPrivacy: true,
    });
    assert.equal(response.status, 201);
    accounts.push({ token: response.data.session.token, id: response.data.user.id, address: `127.30.0.${index + 1}` });
  }
  for (let index = 0; index < 4; index++) {
    const fixture = await cabinet(index, Array.from({ length: usersCount }, (_, user) => user));
    for (let slot = 0; slot < 8; slot++) fixture.keys.push(await add(fixture, slot));
    fixtures.push(fixture);
  }
  const fixtureFor = (index: number) => fixtures[index % fixtures.length]!;
  const keyFor = (index: number) => fixtureFor(index).keys[Math.floor(index / fixtures.length)]!;
  await reconcile('setup');

  phase = '32-users-independent-keys';
  await Promise.all(accounts.map(async (_, index) => {
    const keyId = keyFor(index);
    for (let round = 0; round < rounds; round++) {
      const checkout = await request(index, 'POST', `/keys/${keyId}/checkout`, { borrowerName: `Load borrower ${index}` });
      assert.equal(checkout.status, 200);
      const returned = await request(index, 'POST', `/keys/${keyId}/return`, {});
      assert.equal(returned.status, 200);
    }
  }));
  await reconcile(phase);

  phase = '32-users-key-metadata';
  await Promise.all(accounts.map(async (_, index) => {
    const name = `Updated load key ${index}`, note = `Update from user ${index}`;
    const updated = await request(index, 'PATCH', `/keys/${keyFor(index)}`, { name, note });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.key.name, name);
    const [stored] = await sql!`select name, note from keys where id=${keyFor(index)}`;
    assert.deepEqual(stored, { name, note });
  }));
  await reconcile(phase);

  phase = '32-users-stale-version-renames';
  const versions = await Promise.all(fixtures.map(fixture => request(fixture.owner, 'GET', `/cabinets/${fixture.id}`)));
  const renamed = await Promise.all(accounts.map((_, index) => request(index, 'PATCH', `/cabinets/${fixtureFor(index).id}`, {
    name: `Winning rename ${index}`, expectedVersion: versions[index % fixtures.length].data.cabinet.version,
  })));
  assert.equal(renamed.filter(result => result.status === 200).length, fixtures.length);
  assert.ok(renamed.every(result => result.status === 200 || result.code === 'VERSION_CONFLICT'));
  await reconcile(phase);

  phase = '32-users-contended-keys';
  for (let round = 0; round < 20; round++) {
    const checkout = await Promise.all(accounts.map((_, index) => request(index, 'POST', `/keys/${fixtureFor(index).keys[0]}/checkout`, { borrowerName: `Contender ${index}` })));
    assert.equal(checkout.filter(result => result.status === 200).length, fixtures.length);
    assert.ok(checkout.every(result => result.status === 200 || result.code === 'KEY_NOT_AVAILABLE'));
    const returned = await Promise.all(accounts.map((_, index) => request(index, 'POST', `/keys/${fixtureFor(index).keys[0]}/return`, {})));
    assert.equal(returned.filter(result => result.status === 200).length, fixtures.length);
    assert.ok(returned.every(result => result.status === 200 || result.code === 'KEY_NOT_BORROWED'));
  }
  await reconcile(phase);

  phase = '128-concurrent-idempotent-replays';
  for (const operation of ['checkout', 'return']) {
    await Promise.all(accounts.map(async (_, index) => {
      const requestId = randomUUID();
      const results = await Promise.all(Array.from({ length: 4 }, () => request(index, 'POST', `/keys/${keyFor(index)}/${operation}`, {
        requestId, ...(operation === 'checkout' ? { borrowerName: 'Retry test' } : {}),
      })));
      assert.ok(results.every(result => result.status === 200 && result.data.event.id === results[0].data.event.id));
    }));
  }
  await reconcile(phase);

  phase = 'delete-checkout-races';
  for (let round = 0; round < 12; round++) {
    await Promise.all(fixtures.map(async (fixture, index) => {
      const keyId = await add(fixture, 8 + round);
      const results = await Promise.all([
        request(index, 'DELETE', `/keys/${keyId}`, {}),
        request(index + 4, 'POST', `/keys/${keyId}/checkout`, { borrowerName: 'Delete race' }),
      ]);
      assert.equal(results.filter(result => result.status === 200).length, 1);
    }));
  }
  await reconcile(phase);

  phase = 'clear-checkout-races';
  for (let index = 0; index < 4; index++) {
    const fixture = await cabinet(index + 8, [index + 8, index + 12]);
    const keyId = await add(fixture, 0);
    const detail = await request(index + 8, 'GET', `/cabinets/${fixture.id}`);
    const expectedVersion = detail.data.cabinet.version;
    const results = await Promise.all([
      request(index + 12, 'POST', `/keys/${keyId}/checkout`, { borrowerName: 'Clear race', expectedVersion }),
      request(index + 8, 'DELETE', `/cabinets/${fixture.id}/keys`, { expectedVersion }),
    ]);
    assert.equal(results.filter(result => result.status === 200).length, 1);
    assert.ok(results.every(result => [200, 404, 409].includes(result.status)));
  }
  await reconcile(phase);

  phase = 'member-removal-checkout-races';
  for (let index = 0; index < 4; index++) {
    const owner = index + 16, member = index + 20;
    const fixture = await cabinet(owner, [owner, member]);
    const keyId = await add(fixture, 0);
    const detail = await request(owner, 'GET', `/cabinets/${fixture.id}`);
    const membership = detail.data.members.find((item: any) => item.membership.userId === accounts[member]!.id).membership;
    const results = await Promise.all([
      request(owner, 'DELETE', `/cabinets/${fixture.id}/members/${membership.id}`, {}),
      request(member, 'POST', `/keys/${keyId}/checkout`, { borrowerName: 'Removed member' }),
    ]);
    assert.equal(results[0].status, 200);
    assert.ok([200, 403].includes(results[1].status));
    const denied = await request(member, 'POST', `/keys/${keyId}/checkout`, { borrowerName: 'Denied' });
    assert.equal(denied.status, 403);
  }
  await reconcile(phase);

  phase = 'real-http-32-workers';
  httpBase = await app.listen({ host: '127.0.0.1', port: 0 });
  await Promise.all(accounts.map(async (_, index) => {
    for (let round = 0; round < 2; round++) {
      assert.equal((await request(index, 'POST', `/keys/${keyFor(index)}/checkout`, { borrowerName: 'HTTP borrower' }, 'http')).status, 200);
      assert.equal((await request(index, 'POST', `/keys/${keyFor(index)}/return`, {}, 'http')).status, 200);
    }
  }));
  await reconcile(phase);

  phase = 'bulk-clear-with-active-loans';
  await Promise.all(fixtures.map(async fixture => {
    const before = await request(fixture.owner, 'GET', `/cabinets/${fixture.id}`);
    const cleared = await request(fixture.owner, 'DELETE', `/cabinets/${fixture.id}/keys`, { expectedVersion: before.data.cabinet.version });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.data.deletedCount, before.data.keys.length);
    assert.equal(cleared.data.cancelledLoanCount, before.data.activeLoans.length);
    const after = await request(fixture.owner, 'GET', `/cabinets/${fixture.id}`);
    assert.equal(after.data.keys.length, 0);
    assert.equal(after.data.activeLoans.length, 0);
    const [cancelled] = await sql!`select count(*)::int as count from loans where cabinet_id=${fixture.id} and status='cancelled'`;
    assert.equal(cancelled!.count, before.data.activeLoans.length);
  }));
  await reconcile(phase);

  const [counts] = await sql!`select (select count(*)::int from users) as users,
    (select count(*)::int from cabinets) as cabinets, (select count(*)::int from keys) as keys,
    (select count(*)::int from loans) as loans, (select count(*)::int from loans where status='active') as active_loans,
    (select count(*)::int from loans where status='returned') as returned_loans,
    (select count(*)::int from loans where status='cancelled') as cancelled_loans,
    (select count(*)::int from cabinet_events) as events, (select count(*)::int from audit_logs) as audits,
    (select count(*)::int from idempotency_records) as idempotency_records`;
  const phases = [...new Set(responses.map(row => row.phase))].map(name => {
    const rows = responses.filter(row => row.phase === name), times = rows.map(row => row.ms).sort((a, b) => a - b);
    return { name, requests: rows.length, statuses: rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {}),
      p50Ms: Math.round(times[Math.floor(times.length * .5)]!), p95Ms: Math.round(times[Math.floor(times.length * .95)]!), maxMs: Math.round(times.at(-1)!) };
  });
  const summary = { users: usersCount, rounds, peakConcurrentRequests: 128, databasePoolMax: process.env.DB_POOL_MAX ?? '10', requests: responses.length,
    unexpectedErrors: 0, reconciliation: 'all checks passed after every phase', counts, phases };
  console.log(JSON.stringify(summary, null, 2));
  if (process.env.LOAD_REPORT_PATH) await writeFile(process.env.LOAD_REPORT_PATH, JSON.stringify(summary, null, 2) + '\n');
} finally {
  await app.close();
}
