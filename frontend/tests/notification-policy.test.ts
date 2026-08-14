import { isNotifiableEvent } from '../src/features/notifications/notification-policy';

describe('notification policy', () => {
  it.each([
    'checkOut',
    'return',
    'keyAdded',
    'keyUpdated',
    'undo',
    'keysRestored',
    'admin',
  ] as const)('keeps routine %s events out of notifications', (kind) => {
    expect(isNotifiableEvent({ kind })).toBe(false);
  });

  it.each([
    'memberAdded',
    'memberRemoved',
    'roleChanged',
    'keysCleared',
  ] as const)('notifies for high-attention %s events', (kind) => {
    expect(isNotifiableEvent({ kind })).toBe(true);
  });
});
