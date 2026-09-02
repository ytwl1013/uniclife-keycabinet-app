import cabinets from './data/cabinets.json';
import consents from './data/consents.json';
import events from './data/events.json';
import keys from './data/keys.json';
import loans from './data/loans.json';
import memberships from './data/memberships.json';
import qrs from './data/qrs.json';
import skus from './data/skus.json';
import slots from './data/slots.json';
import users from './data/users.json';
import { parseDomainData } from './schemas';
import { MockAppState, MockDomainData } from './types';

const seedInput = {
  users,
  skus,
  qrs,
  cabinets,
  memberships,
  slots,
  keys,
  loans,
  events,
  consents,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getSeedData(): MockDomainData {
  return clone(parseDomainData(seedInput));
}

export function createInitialMockState(options?: {
  currentUserId?: string | null;
  now?: string;
  hydrated?: boolean;
}): MockAppState {
  const currentUserId = options?.currentUserId ?? null;
  return {
    ...getSeedData(),
    hydrated: options?.hydrated ?? false,
    currentUserId,
    sessionStatus: currentUserId ? 'authenticated' : 'anonymous',
    online: true,
    now: options?.now ?? new Date().toISOString(),
    version: 1,
  };
}
