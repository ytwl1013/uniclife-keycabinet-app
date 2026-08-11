import {
  Cabinet,
  CabinetEvent,
  CabinetMembership,
  EventFilter,
  Key,
  KeySlot,
  MockAppState,
  ProductSku,
  UserAccount,
} from './types';

export type CabinetMemberView = {
  membership: CabinetMembership;
  user: UserAccount;
};

export type CabinetMetrics = {
  capacity: number;
  occupied: number;
  available: number;
  borrowed: number;
  empty: number;
  overdue: number;
};

export type MockSelectors = ReturnType<typeof createMockSelectors>;

export function maskContact(contact?: string): string {
  if (!contact) {
    return '';
  }
  const trimmed = contact.trim();
  const at = trimmed.indexOf('@');
  if (at > 0) {
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1);
    return `${local.slice(0, 1)}${'*'.repeat(Math.max(3, local.length - 1))}@${domain}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
  }
  return '*'.repeat(Math.max(3, trimmed.length));
}

function eventMatches(event: CabinetEvent, filter?: EventFilter): boolean {
  if (!filter) {
    return true;
  }
  if (filter.cabinetId && event.cabinetId !== filter.cabinetId) {
    return false;
  }
  if (filter.keyId && event.keyId !== filter.keyId) {
    return false;
  }
  if (filter.actorId && event.actorId !== filter.actorId) {
    return false;
  }
  if (filter.types?.length && !filter.types.includes(event.type)) {
    return false;
  }
  if (filter.from && Date.parse(event.occurredAt) < Date.parse(filter.from)) {
    return false;
  }
  if (filter.to && Date.parse(event.occurredAt) > Date.parse(filter.to)) {
    return false;
  }
  return true;
}

export function createMockSelectors(state: MockAppState) {
  const authenticatedUserId =
    state.sessionStatus === 'authenticated' ? state.currentUserId : null;
  const currentUser = state.users.find((user) => user.id === authenticatedUserId) ?? null;
  const currentCabinetIds = new Set(
    state.memberships
      .filter(
        (membership) =>
          membership.active && membership.userId === authenticatedUserId,
      )
      .map((membership) => membership.cabinetId),
  );

  const membershipForUser = (
    cabinetId: string,
    userId: string | null = authenticatedUserId,
  ): CabinetMembership | undefined =>
    state.memberships.find(
      (membership) =>
        membership.cabinetId === cabinetId &&
        membership.userId === userId &&
        membership.active,
    );

  const cabinetById = (cabinetId: string): Cabinet | undefined =>
    state.cabinets.find((cabinet) => cabinet.id === cabinetId);

  const skuById = (skuId: string): ProductSku | undefined =>
    state.skus.find((sku) => sku.id === skuId);

  const keyById = (keyId: string): Key | undefined =>
    state.keys.find((key) => key.id === keyId);

  const keysForCabinet = (cabinetId: string): Key[] =>
    state.keys.filter((key) => key.cabinetId === cabinetId);

  const slotsForCabinet = (cabinetId: string): KeySlot[] =>
    state.slots
      .filter((slot) => slot.cabinetId === cabinetId)
      .sort((left, right) => left.position - right.position);

  const events = (filter?: EventFilter): CabinetEvent[] =>
    state.events
      .filter((event) => eventMatches(event, filter))
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));

  const currentLoanForKey = (keyId: string) =>
    state.loans.find((loan) => loan.keyId === keyId && loan.status === 'active');

  const membersForCabinet = (cabinetId: string): CabinetMemberView[] =>
    state.memberships
      .filter((membership) => membership.cabinetId === cabinetId && membership.active)
      .flatMap((membership) => {
        const user = state.users.find((candidate) => candidate.id === membership.userId);
        return user ? [{ membership, user }] : [];
      });

  const cabinetsForCurrentUser = (): Cabinet[] => {
    return state.cabinets.filter((cabinet) => currentCabinetIds.has(cabinet.id));
  };

  const canManageCabinet = (cabinetId: string): boolean => {
    return membershipForUser(cabinetId)?.role === 'admin';
  };

  const borrowedKeys = (cabinetId?: string): Key[] =>
    state.keys.filter(
      (key) =>
        key.status === 'borrowed' &&
        currentCabinetIds.has(key.cabinetId) &&
        (!cabinetId || key.cabinetId === cabinetId),
    );

  const cabinetMetrics = (cabinetId: string): CabinetMetrics => {
    const cabinet = cabinetById(cabinetId);
    const keys = keysForCabinet(cabinetId);
    const now = Date.parse(state.now);
    const borrowed = keys.filter((key) => key.status === 'borrowed').length;
    const overdue = keys.filter((key) => {
      const loan = currentLoanForKey(key.id);
      return Boolean(loan?.expectedReturnAt && Date.parse(loan.expectedReturnAt) < now);
    }).length;
    const capacity = cabinet ? skuById(cabinet.skuId)?.capacity ?? 0 : 0;
    return {
      capacity,
      occupied: keys.length,
      available: keys.filter((key) => key.status === 'available').length,
      borrowed,
      empty: Math.max(0, capacity - keys.length),
      overdue,
    };
  };

  return {
    currentUser,
    cabinetById,
    skuById,
    keyById,
    keysForCabinet,
    slotsForCabinet,
    events,
    currentLoanForKey,
    membersForCabinet,
    cabinetsForCurrentUser,
    membershipForCurrentUser: (cabinetId: string) => membershipForUser(cabinetId),
    canManageCabinet,
    borrowedKeys,
    cabinetMetrics,
  };
}
