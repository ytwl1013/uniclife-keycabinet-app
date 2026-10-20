import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearOfflineWorkspace,
  loadOfflineMode,
  loadOfflineOutbox,
  loadOfflineServerWorkspaceSnapshot,
  loadOfflineWorkspaceSnapshot,
  saveOfflineOutbox,
  saveOfflineMode,
  saveOfflineServerWorkspaceSnapshot,
  saveOfflineWorkspaceSnapshot,
  type OfflineOperation,
  type OfflineWorkspaceSnapshot,
} from '../src/api/offline-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const snapshot: OfflineWorkspaceSnapshot = {
  currentUserId: 'user-offline',
  currentUser: null,
  users: [],
  skus: [],
  qrs: [],
  cabinets: [],
  memberships: [],
  slots: [],
  keys: [],
  loans: [],
  events: [],
  feedbackThreads: [],
  syncedAt: '2026-10-19T00:00:00.000Z',
};

const operation: OfflineOperation = {
  id: 'offline-checkout-12345678',
  actorUserId: 'user-offline',
  cabinetId: 'cabinet-offline',
  createdAt: '2026-10-19T00:01:00.000Z',
  baseCabinetVersion: 4,
  status: 'pending',
  type: 'checkout',
  keyId: 'key-offline',
  input: {
    requestId: 'offline-checkout-12345678',
    borrowerName: 'Alex',
    expectedVersion: 4,
  },
};

describe('offline workspace storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps snapshots and queues isolated by account', async () => {
    await saveOfflineWorkspaceSnapshot('user-offline', snapshot);
    await saveOfflineOutbox('user-offline', [operation]);

    await expect(loadOfflineWorkspaceSnapshot('user-offline')).resolves.toEqual(snapshot);
    await expect(loadOfflineWorkspaceSnapshot('other-user')).resolves.toBeNull();
    await expect(loadOfflineOutbox('user-offline')).resolves.toEqual([operation]);
    await expect(loadOfflineOutbox('other-user')).resolves.toEqual([]);
  });

  it('drops malformed persisted records instead of crashing hydration', async () => {
    await AsyncStorage.setItem('uniclife.offline-workspace.v1.bad-user', '{bad json');
    await AsyncStorage.setItem('uniclife.offline-outbox.v1.bad-user', JSON.stringify([{ type: 'unknown' }]));

    await expect(loadOfflineWorkspaceSnapshot('bad-user')).resolves.toBeNull();
    await expect(loadOfflineOutbox('bad-user')).resolves.toEqual([]);
  });

  it('clears both cached data and pending operations for an account', async () => {
    await saveOfflineWorkspaceSnapshot('user-offline', snapshot);
    await saveOfflineServerWorkspaceSnapshot('user-offline', snapshot);
    await saveOfflineOutbox('user-offline', [operation]);

    await clearOfflineWorkspace('user-offline');

    await expect(loadOfflineWorkspaceSnapshot('user-offline')).resolves.toBeNull();
    await expect(loadOfflineServerWorkspaceSnapshot('user-offline')).resolves.toBeNull();
    await expect(loadOfflineOutbox('user-offline')).resolves.toEqual([]);
  });

  it('persists the explicit offline-use mode per account', async () => {
    await saveOfflineMode('user-offline', true);

    await expect(loadOfflineMode('user-offline')).resolves.toBe(true);
    await expect(loadOfflineMode('other-user')).resolves.toBe(false);

    await clearOfflineWorkspace('user-offline');
    await expect(loadOfflineMode('user-offline')).resolves.toBe(false);
  });
});
