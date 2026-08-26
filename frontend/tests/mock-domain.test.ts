import { createMockSelectors } from '../src/mocks/selectors';
import { createInitialMockState, getSeedData } from '../src/mocks/seed';
import { createCabinetQrPayload, parseCabinetQrPayload } from '../src/mocks/qr-payload';
import { createMockAppService } from '../src/mocks/service';
import {
  createMemoryStorage,
  LEGACY_MOCK_STORAGE_KEY,
  LEGACY_V2_MOCK_STORAGE_KEY,
  loadStateOverlay,
  MOCK_STORAGE_KEY,
} from '../src/mocks/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const FIXED_NOW = '2026-07-21T08:15:00.000Z';

function service(userId = 'user-owner') {
  return createMockAppService({
    storage: createMemoryStorage(),
    latencyMs: 0,
    now: () => new Date(FIXED_NOW),
    initialState: createInitialMockState({ currentUserId: userId, hydrated: true, now: FIXED_NOW }),
  });
}

describe('product QR cabinet initialization', () => {
  it('uses one reusable product QR per SKU', async () => {
    const seed = getSeedData();
    expect(seed.skus.map(({ sku, capacity, name }) => ({ sku, capacity, name }))).toEqual([
      { sku: 'BG5163-BK', capacity: 32, name: 'Uniclife 32 Position Key Cabinet' },
      { sku: 'BG0680-BK', capacity: 60, name: 'Uniclife 60 Position Key Cabinet' },
    ]);
    expect(seed.slots.filter((slot) => slot.cabinetId === 'cabinet-hq')).toHaveLength(32);
    expect(seed.slots.filter((slot) => slot.cabinetId === 'cabinet-loft')).toHaveLength(60);
    expect(seed.slots.filter((slot) => slot.cabinetId === 'cabinet-studio')).toHaveLength(32);
    expect(seed.qrs).toHaveLength(2);
    expect(seed.qrs.filter((qr) => qr.skuId === 'sku-bg5163-bk')).toHaveLength(1);

    const app = service();
    const studio = await app.actions.resolveQr('uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026');
    const riverside = await app.actions.resolveQr('uniclife://cabinet/v1/init/BG0680-BK/uniclife-bg0680-bk-2026');
    expect(studio.sku.sku).toBe('BG5163-BK');
    expect(studio.kind).toBe('initialize');
    expect(riverside.sku.sku).toBe('BG0680-BK');
    expect(parseCabinetQrPayload(studio.qr.code)).toMatchObject({
      sku: 'BG5163-BK',
      productCode: 'uniclife-bg5163-bk-2026',
    });
    expect(createCabinetQrPayload('bg5163-bk', 'uniclife-bg5163-bk-2026')).toBe(studio.qr.code);
  });

  it('creates a different cabinet for each deliberate scan of the same product QR', async () => {
    const initial = createInitialMockState({ currentUserId: 'user-demo', hydrated: true, now: FIXED_NOW });
    const app = createMockAppService({ storage: createMemoryStorage(), latencyMs: 0, now: () => new Date(FIXED_NOW), initialState: initial });
    const qrCode = 'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026';
    const resolution = await app.actions.resolveQr(qrCode);
    expect(resolution.kind).toBe('initialize');

    const initialized = await app.actions.initializeCabinet({ productQrCode: qrCode, name: 'Studio Keys' });
    expect(initialized.cabinet.name).toBe('Studio Keys');
    expect(initialized.membership.role).toBe('admin');
    expect(app.getState().slots.filter((slot) => slot.cabinetId === initialized.cabinet.id)).toHaveLength(32);

    const second = await app.actions.initializeCabinet({ productQrCode: qrCode, name: 'Second Cabinet' });
    expect(second.cabinet.id).not.toBe(initialized.cabinet.id);
    expect(second.cabinet.name).toBe('Second Cabinet');
  });

  it('renames cabinets and records an immutable audit event', async () => {
    const app = service();
    await app.actions.renameCabinet({ cabinetId: 'cabinet-hq', name: 'Operations Center' });
    expect(app.getState().cabinets.find((cabinet) => cabinet.id === 'cabinet-hq')?.name).toBe('Operations Center');
    expect(app.getState().events.at(-1)).toMatchObject({ type: 'cabinet_renamed', reversible: false, summaryData: { previousName: 'Headquarters', nextName: 'Operations Center' } });
  });
});

describe('single Admin permissions', () => {
  it('stores every active membership as Admin and allows an Admin to remove another Admin', async () => {
    const app = service('user-admin');
    expect(app.getState().memberships.every((membership) => membership.role === 'admin')).toBe(true);
    await app.actions.removeMember({ cabinetId: 'cabinet-hq', membershipId: 'membership-hq-owner' });
    expect(app.getState().memberships.find((membership) => membership.id === 'membership-hq-owner')?.active).toBe(false);
  });

  it('migrates v1 roles, SKUs, deleted keys, marketing consent, and recovery metadata to v3', async () => {
    const legacy = createInitialMockState({ currentUserId: 'user-owner', hydrated: true, now: FIXED_NOW }) as unknown as Record<string, unknown>;
    legacy.memberships = (legacy.memberships as Record<string, unknown>[]).map((membership, index) => ({ ...membership, role: index % 2 ? 'member' : 'owner' }));
    legacy.cabinets = (legacy.cabinets as Record<string, unknown>[]).map((cabinet) => ({ ...cabinet, skuId: cabinet.id === 'cabinet-loft' ? 'sku-uc48-navy' : 'sku-uc24-white' }));
    legacy.keys = (legacy.keys as Record<string, unknown>[]).map((key) => key.id === 'key-flat-101' ? { ...key, deletedAt: FIXED_NOW, clearBatchId: 'batch-old', recoverableUntil: '2026-07-28T08:15:00.000Z' } : key);
    legacy.consents = [...(legacy.consents as Record<string, unknown>[]), { id: 'marketing-old', userId: 'user-owner', kind: 'marketing', granted: true, policyVersion: 'old', locale: 'en-US', recordedAt: FIXED_NOW }];
    legacy.clearBatches = [{ id: 'batch-old' }];
    delete legacy.hydrated;
    const storage = createMemoryStorage({ [LEGACY_MOCK_STORAGE_KEY]: JSON.stringify(legacy) });
    const migrated = await loadStateOverlay(storage);

    expect(migrated?.memberships.every((membership) => membership.role === 'admin')).toBe(true);
    expect(migrated?.skus.map((sku) => sku.sku)).toEqual(['BG5163-BK', 'BG0680-BK']);
    expect(migrated?.keys.some((key) => key.id === 'key-flat-101')).toBe(false);
    expect(migrated?.consents.some((consent) => String(consent.kind) === 'marketing')).toBe(false);
    expect(await storage.getItem(LEGACY_MOCK_STORAGE_KEY)).toBeNull();
    expect(await storage.getItem(MOCK_STORAGE_KEY)).not.toBeNull();
  });

  it('normalizes v2 device QR records to reusable product QRs in v3', async () => {
    const v2 = createInitialMockState({ currentUserId: 'user-owner', hydrated: true, now: FIXED_NOW }) as unknown as Record<string, unknown>;
    const cabinetQrIds = new Map([
      ['cabinet-hq', 'qr-hq'],
      ['cabinet-loft', 'qr-loft'],
      ['cabinet-studio', 'qr-studio'],
    ]);
    v2.qrs = [
      { id: 'qr-hq', code: 'uniclife://cabinet/u24_a7f4_n1q9_c8v2', skuId: 'sku-bg5163-bk', cabinetId: 'cabinet-hq', status: 'active', createdAt: FIXED_NOW },
      { id: 'qr-loft', code: 'uniclife://cabinet/u48_k8p2_r6m3_t4w9', skuId: 'sku-bg0680-bk', cabinetId: 'cabinet-loft', status: 'active', createdAt: FIXED_NOW },
      { id: 'qr-studio', code: 'uniclife://cabinet/u12_v5t7_x2c8_b6h1', skuId: 'sku-bg5163-bk', cabinetId: 'cabinet-studio', status: 'active', createdAt: FIXED_NOW },
    ];
    v2.cabinets = (v2.cabinets as Record<string, unknown>[]).map(({ deviceUuid: _deviceUuid, ...cabinet }) => ({
      ...cabinet,
      qrId: cabinetQrIds.get(String(cabinet.id)),
    }));
    delete v2.hydrated;
    const storage = createMemoryStorage({ [LEGACY_V2_MOCK_STORAGE_KEY]: JSON.stringify(v2) });
    const migrated = await loadStateOverlay(storage);

    expect(migrated?.qrs.every((qr) => parseCabinetQrPayload(qr.code)?.sku)).toBe(true);
    expect(migrated?.cabinets.every((cabinet) => Boolean(cabinet.deviceUuid))).toBe(true);
    expect(await storage.getItem(LEGACY_V2_MOCK_STORAGE_KEY)).toBeNull();
    expect(await storage.getItem(MOCK_STORAGE_KEY)).not.toBeNull();
  });
});

describe('permanent key deletion', () => {
  it('blocks deleting a checked-out key and permanently deletes an available key with audit history', async () => {
    const app = service();
    await expect(app.actions.deleteKey({ keyId: 'key-mailroom' })).rejects.toMatchObject({ code: 'ACTIVE_LOANS_BLOCK_CLEAR' });
    await app.actions.deleteKey({ keyId: 'key-server-room' });
    expect(app.getState().keys.some((key) => key.id === 'key-server-room')).toBe(false);
    expect(app.getState().slots.find((slot) => slot.id === 'slot-hq-03')?.keyId).toBeNull();
    expect(app.getState().events.at(-1)).toMatchObject({ keyId: 'key-server-room', type: 'key_deleted', reversible: false });
  });

  it('hard-deletes cabinet key information even with active loans while retaining loan history', async () => {
    const app = service();
    const activeLoanIds = app.getState().loans.filter((loan) => loan.cabinetId === 'cabinet-hq' && loan.status === 'active').map((loan) => loan.id);
    const result = await app.actions.deleteCabinetKeys({ cabinetId: 'cabinet-hq' });
    expect(result.deletedCount).toBe(3);
    expect(app.getState().keys.filter((key) => key.cabinetId === 'cabinet-hq')).toHaveLength(0);
    expect(app.getState().loans.filter((loan) => activeLoanIds.includes(loan.id))).toHaveLength(activeLoanIds.length);
    expect(app.getState().events.at(-1)).toMatchObject({ cabinetId: 'cabinet-hq', type: 'keys_deleted', summaryData: { keyCount: 3 } });
    expect('clearBatches' in app.getState()).toBe(false);
  });
});

describe('loan time and audit behavior', () => {
  it('uses an injected device clock and accepts no expected return time without counting overdue', async () => {
    const app = service();
    const checkedOut = await app.actions.checkOutKey({ keyId: 'key-server-room', borrowerName: 'No due borrower' });
    const loan = app.getState().loans.find((candidate) => candidate.checkoutEventId === checkedOut.event.id);
    expect(loan).toMatchObject({ checkedOutAt: FIXED_NOW, status: 'active' });
    expect(loan?.expectedReturnAt).toBeUndefined();
    expect(createMockSelectors(app.getState()).cabinetMetrics('cabinet-hq').overdue).toBe(0);
  });

  it('records loan events as immutable and exposes no undo operation', async () => {
    const app = service();
    const checkout = await app.actions.checkOutKey({ keyId: 'key-server-room', borrowerName: 'Borrower', expectedReturnAt: '2026-07-22T08:15:00.000Z' });
    expect(checkout.event.reversible).toBe(false);
    expect('undoEvent' in app.actions).toBe(false);
    expect(app.getState().loans.find((loan) => loan.checkoutEventId === checkout.event.id)?.status).toBe('active');
  });

  it('deduplicates destructive writes by request id', async () => {
    const app = service();
    const input = { keyId: 'key-server-room', requestId: 'delete-key-once' };
    await app.actions.deleteKey(input);
    await expect(app.actions.deleteKey(input)).resolves.toBeUndefined();
    expect(app.getState().events.filter((event) => event.type === 'key_deleted' && event.keyId === 'key-server-room')).toHaveLength(1);
  });
});
