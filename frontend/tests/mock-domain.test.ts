import * as XLSX from 'xlsx';

import { MockAppError } from '../src/mocks/errors';
import { createMockSelectors, maskContact } from '../src/mocks/selectors';
import { createMockAppService } from '../src/mocks/service';
import { createInitialMockState, getSeedData } from '../src/mocks/seed';
import { parseDomainData } from '../src/mocks/schemas';
import { createMemoryStorage, MOCK_STORAGE_KEY } from '../src/mocks/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function service() {
  return createMockAppService({
    storage: createMemoryStorage(),
    latencyMs: 0,
    initialState: createInitialMockState({ currentUserId: 'user-owner', hydrated: true }),
  });
}

describe('mock domain seed and QR binding', () => {
  it('validates unique QR codes and resolves each code to its own cabinet and SKU', async () => {
    const app = service();
    const state = app.getState();
    expect(new Set(state.qrs.map((qr) => qr.code)).size).toBe(state.qrs.length);

    const resolved = await app.actions.resolveQr({ code: 'UL-DEMO-UC12-V5T7-X2C8' });
    expect(resolved.cabinet.id).toBe('cabinet-studio');
    expect(resolved.sku.sku).toBe('UL-KC-12-BL');
  });

  it('binds a signed-in user immediately and returns the existing membership idempotently', async () => {
    const app = service();
    await app.actions.switchAccount({ userId: 'user-demo' });
    const first = await app.actions.bindCabinet({ qrCode: 'UL-DEMO-UC24-A7F4-N1Q9' });
    const second = await app.actions.bindCabinet({ qrCode: 'UL-DEMO-UC24-A7F4-N1Q9' });

    expect(first.membership.role).toBe('member');
    expect(second.membership.id).toBe(first.membership.id);
    expect(
      app
        .getState()
        .memberships.filter(
          (membership) =>
            membership.active &&
            membership.cabinetId === 'cabinet-hq' &&
            membership.userId === 'user-demo',
        ),
    ).toHaveLength(1);
  });

  it('reactivates a removed membership without corrupting the persisted relationship graph', async () => {
    const storage = createMemoryStorage();
    const app = createMockAppService({
      storage,
      latencyMs: 0,
      initialState: createInitialMockState({ currentUserId: 'user-owner', hydrated: true }),
    });
    await app.actions.removeMember({
      cabinetId: 'cabinet-hq',
      membershipId: 'membership-hq-member',
      requestId: 'remove-member-before-rebind',
    });
    await app.actions.switchAccount({ userId: 'user-member' });

    const rebound = await app.actions.bindCabinet({
      qrCode: 'UL-DEMO-UC24-A7F4-N1Q9',
      requestId: 'rebind-removed-member',
    });
    expect(rebound.membership).toMatchObject({
      id: 'membership-hq-member',
      active: true,
      joinedAt: app.getState().now,
      role: 'member',
    });
    expect(
      app
        .getState()
        .memberships.filter(
          (membership) =>
            membership.cabinetId === 'cabinet-hq' && membership.userId === 'user-member',
        ),
    ).toHaveLength(1);

    const rebuilt = createMockAppService({ storage, latencyMs: 0 });
    await rebuilt.actions.hydrate();
    expect(
      rebuilt
        .getState()
        .memberships.find((membership) => membership.id === 'membership-hq-member'),
    ).toMatchObject({ active: true, joinedAt: app.getState().now });
  });

  it('rejects duplicate identifiers and broken seed references', () => {
    const duplicate = getSeedData();
    duplicate.qrs[1].code = duplicate.qrs[0].code;
    expect(() => parseDomainData(duplicate)).toThrow(MockAppError);
  });
});

describe('membership permissions', () => {
  it('allows only the owner to appoint admins', async () => {
    const app = service();
    await app.actions.switchAccount({ userId: 'user-admin' });
    await expect(
      app.actions.setMemberRole({
        cabinetId: 'cabinet-hq',
        membershipId: 'membership-hq-member',
        role: 'admin',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    await app.actions.switchAccount({ userId: 'user-owner' });
    const membership = await app.actions.setMemberRole({
      cabinetId: 'cabinet-hq',
      membershipId: 'membership-hq-member',
      role: 'admin',
    });
    expect(membership.role).toBe('admin');
  });

  it('prevents an admin from removing another admin or the owner', async () => {
    const app = service();
    await app.actions.switchAccount({ userId: 'user-admin' });
    await expect(
      app.actions.removeMember({
        cabinetId: 'cabinet-hq',
        membershipId: 'membership-hq-owner',
      }),
    ).rejects.toMatchObject({ code: 'CANNOT_REMOVE_OWNER' });
  });
});

describe('key borrowing, returning and undo rules', () => {
  it('validates expected return time and masks borrower contact', async () => {
    const app = service();
    await expect(
      app.actions.checkOutKey({
        keyId: 'key-server-room',
        borrowerName: 'Demo Borrower',
        expectedReturnAt: '2026-07-21T08:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'EXPECTED_RETURN_INVALID' });

    await app.actions.checkOutKey({
      keyId: 'key-server-room',
      borrowerName: 'Demo Borrower',
      borrowerContact: 'borrower@example.com',
      expectedReturnAt: '2026-07-22T09:00:00.000Z',
    });
    expect(maskContact('borrower@example.com')).toBe('b*******@example.com');
    expect(createMockSelectors(app.getState()).borrowedKeys('cabinet-hq')).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'key-server-room' })]),
    );
  });

  it('only lets the same operator undo the latest key event', async () => {
    const app = service();
    const checkout = await app.actions.checkOutKey({
      keyId: 'key-server-room',
      borrowerName: 'Demo Borrower',
      expectedReturnAt: '2026-07-22T09:00:00.000Z',
    });
    expect(checkout.event.summaryData.keyName).toBe('Server room');
    await app.actions.switchAccount({ userId: 'user-admin' });
    await expect(app.actions.undoEvent({ eventId: checkout.event.id })).rejects.toMatchObject({
      code: 'UNDO_NOT_ALLOWED',
    });

    await app.actions.switchAccount({ userId: 'user-owner' });
    await app.actions.undoEvent({ eventId: checkout.event.id });
    expect(createMockSelectors(app.getState()).keyById('key-server-room')?.status).toBe('available');
    expect(
      app.getState().loans.find((loan) => loan.checkoutEventId === checkout.event.id)?.status,
    ).toBe('cancelled');
  });

  it('undoes a return by reopening its loan but blocks undo after a later key edit', async () => {
    const app = service();
    await app.actions.checkOutKey({
      keyId: 'key-server-room',
      borrowerName: 'Demo Borrower',
      expectedReturnAt: '2026-07-22T09:00:00.000Z',
    });
    const returned = await app.actions.returnKey({ keyId: 'key-server-room' });
    expect(returned.event.summaryData.keyName).toBe('Server room');
    const reversal = await app.actions.undoEvent({ eventId: returned.event.id });
    expect(reversal.summaryData.keyName).toBe('Server room');
    expect(createMockSelectors(app.getState()).currentLoanForKey('key-server-room')?.status).toBe(
      'active',
    );

    await app.actions.returnKey({ keyId: 'key-server-room' });
    const latestReturn = createMockSelectors(app.getState()).events({
      keyId: 'key-server-room',
      types: ['return'],
    })[0];
    await app.actions.updateKey({ keyId: 'key-server-room', note: 'Updated after return' });
    await expect(app.actions.undoEvent({ eventId: latestReturn.id })).rejects.toMatchObject({
      code: 'UNDO_NOT_ALLOWED',
    });
  });
});

describe('clear and seven-day recovery', () => {
  it('blocks clearing while any loan is active', async () => {
    const app = service();
    await expect(
      app.actions.clearCabinetKeys({ cabinetId: 'cabinet-hq' }),
    ).rejects.toMatchObject({ code: 'ACTIVE_LOANS_BLOCK_CLEAR' });
  });

  it('soft deletes keys, allows demo recovery through day seven, and expires afterward', async () => {
    const app = service();
    const batch = await app.actions.clearCabinetKeys({ cabinetId: 'cabinet-loft' });
    expect(batch.keySnapshots).toHaveLength(2);
    expect(createMockSelectors(app.getState()).keysForCabinet('cabinet-loft')).toHaveLength(0);
    expect(
      createMockSelectors(app.getState()).keysForCabinet('cabinet-loft', { includeDeleted: true }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ clearBatchId: batch.id })]));

    await app.actions.advanceTime({ days: 7 });
    await app.actions.restoreClearBatch({ batchId: batch.id });
    expect(createMockSelectors(app.getState()).keysForCabinet('cabinet-loft')).toHaveLength(2);

    await app.actions.resetData();
    const expired = await app.actions.clearCabinetKeys({ cabinetId: 'cabinet-loft' });
    await app.actions.advanceTime({ days: 8 });
    await expect(app.actions.restoreClearBatch({ batchId: expired.id })).rejects.toMatchObject({
      code: 'CLEAR_BATCH_EXPIRED',
    });
  });
});

describe('filters, idempotency and persistence', () => {
  it('filters by cabinet, actor, operation and time range', () => {
    const selectors = createMockSelectors(service().getState());
    const events = selectors.events({
      cabinetId: 'cabinet-hq',
      actorId: 'user-admin',
      types: ['return'],
      from: '2026-07-21T07:00:00.000Z',
      to: '2026-07-21T08:00:00.000Z',
    });
    expect(events.map((event) => event.id)).toEqual(['event-front-return']);
  });

  it('deduplicates a write by request id and detects stale versions', async () => {
    const app = service();
    const version = app.getState().version;
    const input = {
      cabinetId: 'cabinet-hq',
      slotId: 'slot-hq-04',
      name: 'Visitor entrance',
      requestId: 'request-add-key-1',
    };
    const first = await app.actions.addKey(input);
    const second = await app.actions.addKey(input);
    expect(second.id).toBe(first.id);
    expect(app.getState().keys.filter((key) => key.id === first.id)).toHaveLength(1);
    await expect(
      app.actions.addKey({
        cabinetId: 'cabinet-hq',
        slotId: 'slot-hq-05',
        name: 'Loading bay',
        expectedVersion: version,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('serializes concurrent writes and replays one result for the same request id', async () => {
    const app = createMockAppService({
      storage: createMemoryStorage(),
      latencyMs: 10,
      initialState: createInitialMockState({ currentUserId: 'user-owner', hydrated: true }),
    });
    const version = app.getState().version;
    const input = {
      cabinetId: 'cabinet-hq',
      expectedVersion: version,
      name: 'Concurrent visitor key',
      requestId: 'concurrent-add-key',
      slotId: 'slot-hq-04',
    };

    const [first, replay] = await Promise.all([
      app.actions.addKey(input),
      app.actions.addKey(input),
    ]);

    expect(replay.id).toBe(first.id);
    expect(app.getState().version).toBe(version + 1);
    expect(app.getState().keys.filter((key) => key.id === first.id)).toHaveLength(1);
    expect(
      app
        .getState()
        .events.filter((event) => event.type === 'key_added' && event.keyId === first.id),
    ).toHaveLength(1);
  });

  it('rechecks the same authenticated user after simulated latency', async () => {
    const app = createMockAppService({
      storage: createMemoryStorage(),
      latencyMs: 30,
      initialState: createInitialMockState({ currentUserId: 'user-owner', hydrated: true }),
    });
    const pendingWrite = expect(
      app.actions.setMemberRole({
        cabinetId: 'cabinet-hq',
        membershipId: 'membership-hq-member',
        role: 'admin',
      }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });

    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    await app.actions.switchAccount({ userId: 'user-member' });
    await pendingWrite;
    expect(
      app.getState().memberships.find((membership) => membership.id === 'membership-hq-member')?.role,
    ).toBe('member');
  });

  it('records before and after values for key metadata history', async () => {
    const app = service();
    await app.actions.updateKey({
      keyId: 'key-server-room',
      name: 'Infrastructure room',
      note: 'Escort required',
    });
    const event = createMockSelectors(app.getState()).events({
      keyId: 'key-server-room',
      types: ['key_updated'],
    })[0];

    expect(event.summaryData).toMatchObject({
      keyName: 'Infrastructure room',
      previousName: 'Server room',
      nextName: 'Infrastructure room',
      previousNote: 'Authorized facilities staff only',
      nextNote: 'Escort required',
    });
  });

  it('does not publish in-memory state when persistence fails', async () => {
    const app = createMockAppService({
      latencyMs: 0,
      initialState: createInitialMockState({ currentUserId: 'user-owner', hydrated: true }),
      storage: {
        getItem: async () => null,
        removeItem: async () => undefined,
        setItem: async () => {
          throw new Error('simulated storage failure');
        },
      },
    });

    await expect(app.actions.setOnline({ online: false })).rejects.toThrow(
      'simulated storage failure',
    );
    expect(app.getState().online).toBe(true);
  });

  it('hydrates an AsyncStorage-compatible overlay without persisting passwords or reset codes', async () => {
    const storage = createMemoryStorage();
    const first = createMockAppService({ storage, latencyMs: 0 });
    await first.actions.register({
      email: 'new.user@example.com',
      password: 'DemoSecret123!',
      displayName: 'New User',
      locale: 'en-GB',
      acceptedTerms: true,
      acceptedPrivacy: true,
      marketingOptIn: false,
    });
    const reset = await first.actions.requestPasswordReset({ email: 'new.user@example.com' });
    const raw = await storage.getItem(MOCK_STORAGE_KEY);
    expect(raw).not.toContain('DemoSecret123!');
    expect(raw).not.toContain(reset.demoCode);

    await first.actions.signOut();

    const second = createMockAppService({ storage, latencyMs: 0 });
    await second.actions.hydrate();
    expect(second.getState().users.some((user) => user.email === 'new.user@example.com')).toBe(true);
    await expect(
      second.actions.signIn({
        email: 'new.user@example.com',
        password: 'DemoSecret123!',
      }),
    ).rejects.toMatchObject({ code: 'PASSWORD_RESET_REQUIRED' });
  });

  it('clears the current identity and hides cabinet selectors after session expiry', async () => {
    const app = service();
    expect(createMockSelectors(app.getState()).cabinetsForCurrentUser()).not.toHaveLength(0);

    await app.actions.expireSession();

    expect(app.getState()).toMatchObject({
      currentUserId: null,
      sessionStatus: 'expired',
    });
    const selectors = createMockSelectors(app.getState());
    expect(selectors.currentUser).toBeNull();
    expect(selectors.cabinetsForCurrentUser()).toHaveLength(0);
  });

  it('keeps generated loan and event ids unique after rebuilding the service from persisted state', async () => {
    const storage = createMemoryStorage();
    const first = createMockAppService({
      storage,
      latencyMs: 0,
      initialState: createInitialMockState({ currentUserId: 'user-owner', hydrated: true }),
    });
    const original = await first.actions.checkOutKey({
      keyId: 'key-server-room',
      borrowerName: 'Before reload',
      expectedReturnAt: '2026-07-22T09:00:00.000Z',
    });
    await first.actions.undoEvent({ eventId: original.event.id });

    const rebuilt = createMockAppService({ storage, latencyMs: 0 });
    await rebuilt.actions.hydrate();
    const next = await rebuilt.actions.checkOutKey({
      keyId: 'key-server-room',
      borrowerName: 'After reload',
      expectedReturnAt: '2026-07-22T09:00:00.000Z',
    });
    const state = rebuilt.getState();
    const allIds = [
      ...state.users,
      ...state.skus,
      ...state.qrs,
      ...state.cabinets,
      ...state.memberships,
      ...state.slots,
      ...state.keys,
      ...state.loans,
      ...state.events,
      ...state.clearBatches,
      ...state.consents,
    ].map((entity) => entity.id);

    expect(next.event.id).not.toBe(original.event.id);
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(
      state.loans.find(
        (loan) => loan.keyId === 'key-server-room' && loan.status === 'active',
      )?.borrowerName,
    ).toBe('After reload');
  });
});

describe('log exports', () => {
  it('masks contacts for members and produces valid CSV, XLSX and PDF files', async () => {
    const app = service();
    await app.actions.switchAccount({ userId: 'user-member' });
    const csv = await app.actions.exportCabinetLog({ cabinetId: 'cabinet-hq', format: 'csv' });
    const csvText = new TextDecoder().decode(csv.bytes);
    expect(csvText).toContain('borrower_contact');
    expect(csvText).not.toContain('+1 212 555 0168');

    const xlsx = await app.actions.exportCabinetLog({ cabinetId: 'cabinet-hq', format: 'xlsx' });
    const workbook = XLSX.read(xlsx.bytes, { type: 'array' });
    expect(workbook.SheetNames).toEqual(['cabinet_log']);

    const pdf = await app.actions.exportCabinetLog({ cabinetId: 'cabinet-hq', format: 'pdf' });
    expect(new TextDecoder().decode(pdf.bytes.slice(0, 4))).toBe('%PDF');
  });

  it('allows only owners and admins to export full contact details', async () => {
    const app = service();
    await app.actions.switchAccount({ userId: 'user-member' });
    await expect(
      app.actions.exportCabinetLog({
        cabinetId: 'cabinet-hq',
        format: 'csv',
        includeFullContact: true,
      }),
    ).rejects.toMatchObject({ code: 'EXPORT_FULL_CONTACT_FORBIDDEN' });

    await app.actions.switchAccount({ userId: 'user-admin' });
    const artifact = await app.actions.exportCabinetLog({
      cabinetId: 'cabinet-hq',
      format: 'csv',
      includeFullContact: true,
    });
    expect(new TextDecoder().decode(artifact.bytes)).toContain('+1 212 555 0168');
  });
});
