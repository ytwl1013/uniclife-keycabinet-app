/** Bounded API-only acceptance test. Creates and deletes only its own fixtures. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = new URL(process.env.REMOTE_TEST_API_URL ?? '');
assert.equal(base.protocol, 'https:');
assert.equal(base.href.replace(/\/$/, ''), process.env.REMOTE_TEST_CONFIRM_URL, 'Explicitly confirm the authorized target URL');
assert.equal(base.pathname.replace(/\/$/, ''), '/api/v1');
const productQrCode = process.env.REMOTE_TEST_PRODUCT_QR;
assert.ok(productQrCode, 'Supply an existing test product QR (no product catalog writes)');
const dir = await mkdtemp(join(tmpdir(), 'keycabinet-remote-'));
const accounts = [], cabinets = [], responses = [], checkpoints = [], mutations = new Map();
const run = `RemoteTest-${randomUUID().slice(0, 8)}`;
let phase = 'preflight', failure, active = 0, peak = 0;
const cleanup = { cabinets: 0, accounts: 0, errors: [] };
// Bounded bursts with a sliding window; respect the service's ordinary rate limits.
const starts = [];
async function request(user, method, path, input) {
  while (true) {
    const now = Date.now();
    while (starts[0] < now - 60000) starts.shift();
    if (starts.length < 160) { starts.push(now); break; }
    await new Promise(resolve => setTimeout(resolve, Math.max(10, starts[0] + 60100 - now)));
  }
  const body = input === undefined ? undefined : { requestId: randomUUID(), ...input };
  const start = performance.now(); active++; peak = Math.max(peak, active);
  try {
    const response = await fetch(`${base.href.replace(/\/$/, '')}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { ...(accounts[user] ? { authorization: `Bearer ${accounts[user].token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    responses.push({ phase, method, path, status: response.status, code: result.code, ms: Math.round(performance.now() - start) });
    const value = { status: response.status, ...result };
    if (response.ok && result.data?.event && /\/(checkout|return)$/.test(path)) {
      mutations.set(result.data.event.id, { event: result.data.event, actorId: accounts[user].id, keyId: path.split('/')[2], borrowerName: body.borrowerName });
    }
    return value;
  } finally { active--; }
}
function ok(result) { assert.ok([200, 201].includes(result.status), `${phase}: ${result.status} ${result.code}`); return result.data; }
async function saveRecovery() { await writeFile(join(dir, 'recovery.json'), JSON.stringify({ base: base.href, run, accounts, cabinets }), { mode: 0o600 }); }
async function register(index) {
  const result = ok(await request(-1, 'POST', '/auth/register', {
    email: `${run.toLowerCase()}-${index}@example.com`, password: randomUUID(), displayName: `${run} user ${index}`, locale: 'en-US', acceptedTerms: true, acceptedPrivacy: true,
  }));
  accounts.push({ id: result.user.id, token: result.session.token }); await saveRecovery();
}
async function createCabinet(suffix) {
  const result = ok(await request(0, 'POST', '/cabinets/initialize', { name: `${run} ${suffix}`, productQrCode }));
  const fixture = { id: result.cabinet.id }; cabinets.push(fixture); await saveRecovery();
  assert.equal(result.membership.role, 'super_admin', 'Remote server must support fixture cleanup');
  const detail = ok(await request(0, 'GET', `/cabinets/${fixture.id}`));
  fixture.slots = detail.slots.map(s => s.id); fixture.keys = []; return fixture;
}
async function addKey(f, slot) {
  const key = ok(await request(0, 'POST', `/cabinets/${f.id}/keys`, { slotId: f.slots[slot], name: `${run} key ${slot}` })).key;
  f.keys[slot] = key.id; return key.id;
}
async function batch(calls) {
  // Wait for every in-flight request before reconciliation or cleanup, including failures.
  const results = await Promise.allSettled(calls);
  const rejected = results.find(r => r.status === 'rejected'); if (rejected) throw rejected.reason;
  return results.map(r => r.value);
}
async function reconcile(f, label) {
  const [detail, loanData, eventData] = (await batch([
    request(0, 'GET', `/cabinets/${f.id}`), request(0, 'GET', `/records/loans?cabinetId=${f.id}&limit=200`), request(0, 'GET', `/records/events?cabinetId=${f.id}&limit=200`),
  ])).map(ok);
  const loans = loanData.items, events = eventData.items;
  assert.ok(loans.length < 200 && events.length < 200, 'Refuse reconciliation against truncated history');
  const byEvent = new Map(events.map(e => [e.id, e]));
  const activeLoans = loans.filter(l => l.status === 'active');
  assert.equal(new Set(activeLoans.map(l => l.keyId)).size, activeLoans.length, 'Duplicate active loans');
  for (const loan of loans) {
    const checkout = byEvent.get(loan.checkoutEventId), recorded = mutations.get(loan.checkoutEventId);
    assert.ok(checkout && recorded, 'Missing checkout event/response');
    assert.equal(loan.keyId, recorded.keyId); assert.equal(loan.borrowerName, recorded.borrowerName);
    assert.equal(loan.operatorId, recorded.actorId); assert.equal(checkout.actorId, loan.operatorId);
    assert.equal(checkout.relatedLoanId, loan.id); assert.equal(checkout.keyId, loan.keyId);
    assert.equal(checkout.occurredAt, loan.checkedOutAt);
    if (loan.status === 'returned') {
      const returned = byEvent.get(loan.returnEventId), input = mutations.get(loan.returnEventId);
      assert.ok(returned && input, 'Missing return event/response');
      assert.equal(returned.relatedLoanId, loan.id); assert.equal(returned.keyId, loan.keyId);
      assert.equal(loan.returnOperatorId, input.actorId); assert.equal(returned.actorId, input.actorId);
      assert.equal(returned.occurredAt, loan.returnedAt); assert.ok(Date.parse(loan.returnedAt) >= Date.parse(loan.checkedOutAt));
    }
  }
  for (const loan of activeLoans) assert.ok(detail.keys.some(k => k.id === loan.keyId && k.status === 'borrowed'), 'Orphan active loan');
  for (const key of detail.keys) assert.equal(key.status === 'borrowed', activeLoans.some(l => l.keyId === key.id), 'Key/loan status mismatch');
  assert.deepEqual(new Set(detail.activeLoans.map(l => l.id)), new Set(activeLoans.map(l => l.id)));
  const expectedEvents = [...mutations.values()].filter(m => m.event.cabinetId === f.id).map(m => m.event.id);
  assert.deepEqual(new Set(events.filter(e => ['checkout', 'return'].includes(e.type)).map(e => e.id)), new Set(expectedEvents), 'Response/event mismatch');
  assert.equal(events.filter(e => e.type === 'checkout').length, loans.length);
  assert.equal(detail.cabinet.version, events.length, 'Cabinet version/event count mismatch');
  const checkpoint = { label, cabinetId: f.id, keys: detail.keys.length, loans: loans.length, active: activeLoans.length, returned: loans.filter(l => l.status === 'returned').length, cancelled: loans.filter(l => l.status === 'cancelled').length, events: events.length };
  checkpoints.push(checkpoint); console.log(JSON.stringify(checkpoint));
  await writeFile(join(dir, `${f.id}-records.json`), JSON.stringify({ detail, loans, events }, null, 2));
  return detail;
}
try {
  ok(await request(-1, 'GET', '/health'));
  await register(0);
  ok(await request(0, 'POST', '/cabinets/resolve-qr', { code: productQrCode }));
  const probe = await request(0, 'DELETE', `/cabinets/cabinet_${randomUUID()}`, {});
  assert.equal(probe.code, 'CABINET_NOT_FOUND', 'Cabinet cleanup route is unavailable; stop before creating fixtures');
  for (let i = 1; i < 8; i++) await register(i);
  const f = await createCabinet('main');
  for (let i = 1; i < accounts.length; i++) {
    const invite = ok(await request(0, 'POST', `/cabinets/${f.id}/join-invitations`, {}));
    ok(await request(i, 'POST', '/cabinets/join', { joinQrCode: invite.invitation.joinQrCode }));
  }
  for (let i = 0; i < 8; i++) await addKey(f, i);
  console.log(JSON.stringify({ stage: 'setup-complete', users: accounts.length, cabinetId: f.id }));
  phase = '8-users-distinct-keys';
  for (let round = 0; round < 4; round++) {
    (await batch(accounts.map((_, i) => request(i, 'POST', `/keys/${f.keys[i]}/checkout`, { borrowerName: `${run} borrower ${i}` })))).forEach(ok);
    await reconcile(f, `borrowed-${round}`);
    (await batch(accounts.map((_, i) => request(i, 'POST', `/keys/${f.keys[i]}/return`, {})))).forEach(ok);
  }
  await reconcile(f, phase);
  phase = '8-users-same-key';
  for (let round = 0; round < 2; round++) {
    for (const action of ['checkout', 'return']) {
      const results = await batch(accounts.map((_, i) => request(i, 'POST', `/keys/${f.keys[0]}/${action}`, action === 'checkout' ? { borrowerName: `${run} contender ${i}` } : {})));
      assert.equal(results.filter(r => r.status === 200).length, 1, `Exactly one ${action} must succeed`);
      assert.ok(results.every(r => r.status === 200 || (r.status === 409 && r.code === (action === 'checkout' ? 'KEY_NOT_AVAILABLE' : 'KEY_NOT_BORROWED'))));
    }
  }
  await reconcile(f, phase);
  phase = '16-idempotent-replays';
  for (const action of ['checkout', 'return']) {
    const payload = { requestId: randomUUID(), ...(action === 'checkout' ? { borrowerName: `${run} replay` } : {}) };
    const results = await batch(Array.from({ length: 16 }, () => request(0, 'POST', `/keys/${f.keys[0]}/${action}`, payload)));
    results.forEach(ok); assert.equal(new Set(results.map(r => r.data.event.id)).size, 1);
  }
  await reconcile(f, phase);
  phase = 'stale-version';
  const version = ok(await request(0, 'GET', `/cabinets/${f.id}`)).cabinet.version;
  const renamed = await batch(accounts.map((_, i) => request(i, 'PATCH', `/cabinets/${f.id}`, { name: `${run} rename ${i}`, expectedVersion: version })));
  assert.equal(renamed.filter(r => r.status === 200).length, 1);
  assert.ok(renamed.every(r => r.status === 200 || (r.status === 409 && r.code === 'VERSION_CONFLICT')));
  await reconcile(f, phase);
  const race = await createCabinet('race');
  phase = 'membership-isolation';
  const privateKey = await addKey(race, 0);
  const denied = await request(1, 'POST', `/keys/${privateKey}/checkout`, { borrowerName: `${run} denied` });
  assert.equal(denied.status, 403); assert.equal(denied.code, 'MEMBERSHIP_REQUIRED');
  ok(await request(0, 'DELETE', `/keys/${privateKey}`, {}));
  const invitation = ok(await request(0, 'POST', `/cabinets/${race.id}/join-invitations`, {}));
  ok(await request(1, 'POST', '/cabinets/join', { joinQrCode: invitation.invitation.joinQrCode }));
  phase = 'delete-checkout-race';
  for (let round = 0; round < 4; round++) {
    const key = await addKey(race, 0);
    const raced = await batch([request(1, 'POST', `/keys/${key}/checkout`, { borrowerName: `${run} delete race` }), request(0, 'DELETE', `/keys/${key}`, {})]);
    assert.ok(raced.every(r => [200, 404, 409].includes(r.status)), 'Unexpected delete/checkout response');
    assert.ok(raced.some(r => r.status === 200), 'Neither concurrent operation succeeded');
    const detail = await reconcile(race, `${phase}-${round}`);
    if (detail.keys.length) { if (detail.activeLoans.length) ok(await request(1, 'POST', `/keys/${key}/return`, {})); ok(await request(0, 'DELETE', `/keys/${key}`, {})); }
  }
  phase = 'clear-checkout-race';
  for (let round = 0; round < 4; round++) {
    const key = await addKey(race, 0);
    const results = await batch([request(1, 'POST', `/keys/${key}/checkout`, { borrowerName: `${run} clear race` }), request(0, 'DELETE', `/cabinets/${race.id}/keys`, {})]);
    assert.ok(results.every(r => [200, 404, 409].includes(r.status)), 'Unexpected clear/checkout response'); ok(results[1]);
    await reconcile(race, `${phase}-${round}`);
  }
  phase = 'final-reconciliation';
  for (const fixture of cabinets) await reconcile(fixture, phase);
} catch (error) {
  failure = { phase, message: error.message };
  console.log(JSON.stringify({ failure }));
} finally {
  phase = 'cleanup';
  for (const f of cabinets) {
    try { ok(await request(0, 'DELETE', `/cabinets/${f.id}`, {})); const remaining = ok(await request(0, 'GET', '/cabinets')); assert.ok(!remaining.some(c => c.cabinet.id === f.id)); cleanup.cabinets++; } catch (error) { cleanup.errors.push({ cabinetId: f.id, message: error.message }); }
  }
  for (let i = 0; i < accounts.length; i++) {
    try { ok(await request(i, 'DELETE', '/users/me', {})); const check = await request(i, 'GET', '/cabinets'); assert.equal(check.status, 401); cleanup.accounts++; } catch (error) { cleanup.errors.push({ userId: accounts[i].id, message: error.message }); }
  }
  const durations = responses.map(r => r.ms).sort((a, b) => a - b);
  const report = { run, base: base.href, finishedAt: new Date().toISOString(), accounts: accounts.length, peak, requests: responses.length, failure, statuses: responses.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}), p95ms: durations[Math.ceil(durations.length * 0.95) - 1], checkpoints, cleanup, responses };
  await writeFile(join(dir, 'report.json'), JSON.stringify(report, null, 2));
  if (!cleanup.errors.length) await writeFile(join(dir, 'recovery.json'), JSON.stringify({ run, cleaned: true }), { mode: 0o600 });
  console.log(JSON.stringify({ report: join(dir, 'report.json'), requests: report.requests, statuses: report.statuses, p95ms: report.p95ms, peak, cleanup }));
  if (failure || cleanup.errors.length) process.exitCode = 1;
}
