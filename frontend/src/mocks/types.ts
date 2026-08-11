export const supportedLocales = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-PT',
  'nl-NL',
  'pl-PL',
  'zh-CN',
  'zh-TW',
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export type UserAccount = {
  id: string;
  email: string;
  displayName: string;
  locale: SupportedLocale;
  status: 'active' | 'disabled';
  createdAt: string;
};

export type ProductSku = {
  id: string;
  sku: string;
  model: string;
  name: string;
  color: string;
  capacity: number;
  description: string;
  manualUrl: string;
  imageAsset: string;
};

export type CabinetQr = {
  id: string;
  code: string;
  skuId: string;
  deviceUuid: string;
  status: 'active' | 'disabled';
  createdAt: string;
};

export type Cabinet = {
  id: string;
  skuId: string;
  deviceUuid: string;
  name: string;
  location: string;
  timeZone: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncedAt: string;
  createdAt: string;
  version: number;
};

export type CabinetRole = 'admin';

export type CabinetMembership = {
  id: string;
  cabinetId: string;
  userId: string;
  role: CabinetRole;
  active: boolean;
  joinedAt: string;
  removedAt?: string;
};

export type KeySlot = {
  id: string;
  cabinetId: string;
  position: number;
  keyId: string | null;
};

export type Key = {
  id: string;
  cabinetId: string;
  slotId: string;
  name: string;
  note: string;
  status: 'available' | 'borrowed';
  createdAt: string;
  updatedAt: string;
};

export type Loan = {
  id: string;
  cabinetId: string;
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt: string;
  expectedReturnAt?: string;
  returnedAt?: string;
  status: 'active' | 'returned' | 'cancelled';
  operatorId: string;
  returnOperatorId?: string;
  checkoutEventId: string;
  returnEventId?: string;
};

export const cabinetEventTypes = [
  'cabinet_bound',
  'cabinet_renamed',
  'member_removed',
  'member_role_changed',
  'ownership_transferred',
  'key_added',
  'key_updated',
  'key_deleted',
  'checkout',
  'return',
  'undo_checkout',
  'undo_return',
  'keys_cleared',
  'keys_restored',
  'keys_deleted',
] as const;

export type CabinetEventType = (typeof cabinetEventTypes)[number];
export type EventSummaryValue = string | number | boolean | null;

export type CabinetEvent = {
  id: string;
  cabinetId: string;
  keyId?: string;
  actorId: string;
  type: CabinetEventType;
  occurredAt: string;
  reversible: boolean;
  reversedByEventId?: string;
  relatedLoanId?: string;
  summaryData: Record<string, EventSummaryValue>;
};

export type ConsentKind = 'terms' | 'privacy';

export type ConsentRecord = {
  id: string;
  userId: string;
  kind: ConsentKind;
  granted: boolean;
  policyVersion: string;
  locale: SupportedLocale;
  recordedAt: string;
  withdrawnAt?: string;
};

export type MockDomainData = {
  users: UserAccount[];
  skus: ProductSku[];
  qrs: CabinetQr[];
  cabinets: Cabinet[];
  memberships: CabinetMembership[];
  slots: KeySlot[];
  keys: Key[];
  loans: Loan[];
  events: CabinetEvent[];
  consents: ConsentRecord[];
};

export type SessionStatus = 'anonymous' | 'authenticated' | 'expired';

export type MockAppState = MockDomainData & {
  hydrated: boolean;
  currentUserId: string | null;
  sessionStatus: SessionStatus;
  online: boolean;
  now: string;
  version: number;
};

export type WriteOptions = {
  expectedVersion?: number;
  requestId?: string;
};

export type EventFilter = {
  cabinetId?: string;
  keyId?: string;
  actorId?: string;
  types?: CabinetEventType[];
  from?: string;
  to?: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  locale: SupportedLocale;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

export type AddKeyInput = WriteOptions & {
  cabinetId: string;
  slotId: string;
  name: string;
  note?: string;
};

export type UpdateKeyInput = WriteOptions & {
  keyId: string;
  name?: string;
  note?: string;
};

export type RenameCabinetInput = WriteOptions & {
  cabinetId: string;
  name: string;
};

export type CheckOutKeyInput = WriteOptions & {
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt?: string;
  expectedReturnAt?: string;
};

export type ReturnKeyInput = WriteOptions & {
  keyId: string;
  returnedAt?: string;
};

export type MockStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type QrResolution = {
  qr: CabinetQr;
  sku: ProductSku;
  cabinet?: Cabinet;
};

export type BindCabinetResult = {
  cabinet: Cabinet;
  membership: CabinetMembership;
};
