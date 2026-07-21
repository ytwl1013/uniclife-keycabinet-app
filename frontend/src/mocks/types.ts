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
  cabinetId: string;
  status: 'active' | 'disabled';
  createdAt: string;
};

export type Cabinet = {
  id: string;
  skuId: string;
  qrId: string;
  name: string;
  location: string;
  timeZone: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncedAt: string;
  createdAt: string;
  version: number;
};

export type CabinetRole = 'owner' | 'admin' | 'member';

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
  deletedAt?: string;
  recoverableUntil?: string;
  clearBatchId?: string;
};

export type Loan = {
  id: string;
  cabinetId: string;
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt: string;
  expectedReturnAt: string;
  returnedAt?: string;
  status: 'active' | 'returned' | 'cancelled';
  operatorId: string;
  returnOperatorId?: string;
  checkoutEventId: string;
  returnEventId?: string;
};

export const cabinetEventTypes = [
  'cabinet_bound',
  'member_removed',
  'member_role_changed',
  'ownership_transferred',
  'key_added',
  'key_updated',
  'checkout',
  'return',
  'undo_checkout',
  'undo_return',
  'keys_cleared',
  'keys_restored',
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

export type KeyClearBatch = {
  id: string;
  cabinetId: string;
  actorId: string;
  clearedAt: string;
  recoverableUntil: string;
  restoredAt?: string;
  status: 'restorable' | 'restored' | 'expired';
  keySnapshots: Key[];
  slotKeyMap: { slotId: string; keyId: string }[];
};

export type ConsentKind = 'terms' | 'privacy' | 'marketing';

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
  clearBatches: KeyClearBatch[];
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
  marketingOptIn: boolean;
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

export type CheckOutKeyInput = WriteOptions & {
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt?: string;
  expectedReturnAt: string;
};

export type ReturnKeyInput = WriteOptions & {
  keyId: string;
  returnedAt?: string;
};

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ExportLogOptions = {
  cabinetId: string;
  format: ExportFormat;
  includeFullContact?: boolean;
  filter?: Omit<EventFilter, 'cabinetId'>;
  fontBytes?: Uint8Array;
};

export type ExportArtifact = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type LogExportRow = {
  event_id: string;
  occurred_at: string;
  operation: CabinetEventType;
  cabinet_id: string;
  key_id: string;
  key_name: string;
  actor_id: string;
  actor_name: string;
  borrower_name: string;
  borrower_contact: string;
};

export type MockStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type QrResolution = {
  qr: CabinetQr;
  sku: ProductSku;
  cabinet: Cabinet;
};

export type BindCabinetResult = {
  cabinet: Cabinet;
  membership: CabinetMembership;
};
