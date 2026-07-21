import AsyncStorage from '@react-native-async-storage/async-storage';

import { MockAppError } from './errors';
import { parsePersistedState } from './schemas';
import { MockAppState, MockStorage } from './types';

export const MOCK_STORAGE_KEY = '@uniclife/mock-app-state/v1';

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
    return null;
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
}
