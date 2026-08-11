import AsyncStorage from '@react-native-async-storage/async-storage';

import { MockAppError } from './errors';
import { parsePersistedState } from './schemas';
import { getSeedData } from './seed';
import { MockAppState, MockStorage } from './types';

export const MOCK_STORAGE_KEY = '@uniclife/mock-app-state/v3';
export const LEGACY_V2_MOCK_STORAGE_KEY = '@uniclife/mock-app-state/v2';
export const LEGACY_MOCK_STORAGE_KEY = '@uniclife/mock-app-state/v1';

export const asyncStorageAdapter: MockStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export function createMemoryStorage(initial?: Record<string, string>): MockStorage {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

function toPersistedState(state: MockAppState): Omit<MockAppState, 'hydrated'> {
  const { hydrated: _hydrated, ...persisted } = state;
  return persisted;
}

export async function loadStateOverlay(storage: MockStorage): Promise<Omit<MockAppState, 'hydrated'> | null> {
  const raw = await storage.getItem(MOCK_STORAGE_KEY);
  if (!raw) {
    const v2Raw = await storage.getItem(LEGACY_V2_MOCK_STORAGE_KEY);
    if (v2Raw) {
      try {
        const migrated = parsePersistedState(migrateV2State(JSON.parse(v2Raw)));
        await storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(migrated));
        await storage.removeItem(LEGACY_V2_MOCK_STORAGE_KEY);
        return migrated;
      } catch {
        throw new MockAppError('STORAGE_DATA_INVALID');
      }
    }
    const legacyRaw = await storage.getItem(LEGACY_MOCK_STORAGE_KEY);
    if (!legacyRaw) return null;
    try {
      const migrated = parsePersistedState(migrateV1State(JSON.parse(legacyRaw)));
      await storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(migrated));
      await storage.removeItem(LEGACY_MOCK_STORAGE_KEY);
      return migrated;
    } catch {
      throw new MockAppError('STORAGE_DATA_INVALID');
    }
  }
  try {
    return parsePersistedState(JSON.parse(raw));
  } catch (error) {
    if (error instanceof MockAppError) {
      throw error;
    }
    throw new MockAppError('STORAGE_DATA_INVALID');
  }
}

export async function saveStateOverlay(storage: MockStorage, state: MockAppState): Promise<void> {
  await storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(toPersistedState(state)));
}

export async function clearStateOverlay(storage: MockStorage): Promise<void> {
  await storage.removeItem(MOCK_STORAGE_KEY);
  await storage.removeItem(LEGACY_V2_MOCK_STORAGE_KEY);
  await storage.removeItem(LEGACY_MOCK_STORAGE_KEY);
}

type LegacyRecord = Record<string, unknown>;

function records(value: unknown): LegacyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is LegacyRecord => Boolean(item && typeof item === 'object'))
    : [];
}

function migrateV2State(input: unknown): unknown {
  if (!input || typeof input !== 'object') throw new MockAppError('STORAGE_DATA_INVALID');
  const legacy = input as LegacyRecord;
  const seed = getSeedData();
  const legacyCabinets = new Map(
    records(legacy.cabinets).map((cabinet) => [String(cabinet.id), cabinet]),
  );
  return {
    ...legacy,
    qrs: seed.qrs,
    cabinets: seed.cabinets.map((cabinet) => {
      const previous = legacyCabinets.get(cabinet.id);
      return previous
        ? { ...cabinet, ...previous, deviceUuid: cabinet.deviceUuid }
        : cabinet;
    }),
  };
}

function migrateV1State(input: unknown): unknown {
  if (!input || typeof input !== 'object') throw new MockAppError('STORAGE_DATA_INVALID');
  const legacy = input as LegacyRecord;
  const seed = getSeedData();
  const legacySlots = records(legacy.slots);
  const seedSlotByCabinetPosition = new Map(
    seed.slots.map((slot) => [`${slot.cabinetId}:${slot.position}`, slot]),
  );
  const legacyPositionBySlotId = new Map(
    legacySlots.map((slot) => [String(slot.id), Number(slot.position)]),
  );
  const migratedKeys = records(legacy.keys)
    .filter((key) => !key.deletedAt)
    .flatMap((key) => {
      const cabinetId = String(key.cabinetId);
      const position = legacyPositionBySlotId.get(String(key.slotId));
      const slot = seedSlotByCabinetPosition.get(`${cabinetId}:${position}`);
      if (!slot) return [];
      return [{ ...key, slotId: slot.id, deletedAt: undefined, recoverableUntil: undefined, clearBatchId: undefined }];
    });
  const keyIdBySlotId = new Map(migratedKeys.map((key) => [String(key.slotId), String((key as LegacyRecord).id)]));
  const cabinetSkuMap: Record<string, string> = {
    'sku-uc12-blue': 'sku-bg5163-bk',
    'sku-uc24-white': 'sku-bg5163-bk',
    'sku-uc48-navy': 'sku-bg0680-bk',
  };
  const legacyCabinets = new Map(records(legacy.cabinets).map((cabinet) => [String(cabinet.id), cabinet]));
  return {
    ...legacy,
    skus: seed.skus,
    qrs: seed.qrs,
    cabinets: seed.cabinets.map((cabinet) => {
      const previous = legacyCabinets.get(cabinet.id);
      return previous
        ? { ...cabinet, ...previous, skuId: cabinetSkuMap[String(previous.skuId)] ?? cabinet.skuId, deviceUuid: cabinet.deviceUuid }
        : cabinet;
    }),
    memberships: records(legacy.memberships).map((membership) => ({ ...membership, role: 'admin' })),
    slots: seed.slots.map((slot) => ({ ...slot, keyId: keyIdBySlotId.get(slot.id) ?? null })),
    keys: migratedKeys,
    loans: records(legacy.loans),
    events: records(legacy.events),
    consents: records(legacy.consents).filter((consent) => consent.kind !== 'marketing'),
  };
}
