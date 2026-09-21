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
    expect(isNotifiableEvent(
      { actorUserId: 'another-user', kind },
      { currentUserId: 'current-user' },
    )).toBe(false);
  });

  it.each([
    'memberRemoved',
    'roleChanged',
    'keysCleared',
  ] as const)('notifies for high-attention %s events', (kind) => {
    expect(isNotifiableEvent(
      { actorUserId: 'another-user', kind },
      { currentUserId: 'current-user' },
    )).toBe(true);
  });

  it('notifies only a different Super Admin when a member joins', () => {
    expect(isNotifiableEvent(
      { actorUserId: 'new-admin', kind: 'memberAdded' },
      { cabinetRole: 'superAdmin', currentUserId: 'owner' },
    )).toBe(true);
    expect(isNotifiableEvent(
      { actorUserId: 'new-admin', kind: 'memberAdded' },
      { cabinetRole: 'admin', currentUserId: 'admin' },
    )).toBe(false);
    expect(isNotifiableEvent(
      { actorUserId: 'owner', kind: 'memberAdded' },
      { cabinetRole: 'superAdmin', currentUserId: 'owner' },
    )).toBe(false);
    expect(isNotifiableEvent(
      { actorUserId: 'new-admin', initiatorUserId: 'owner', kind: 'memberAdded' },
      { cabinetRole: 'superAdmin', currentUserId: 'owner' },
    )).toBe(false);
  });
});
