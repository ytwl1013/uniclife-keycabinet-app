export type CabinetRole = 'owner' | 'admin' | 'member';

export type CabinetStatus = 'online' | 'offline' | 'maintenance';

export type KeyStatus = 'available' | 'checkedOut' | 'overdue' | 'empty';

export type CabinetView = {
  id: string;
  name: string;
  location: string;
  timezone: string;
  status: CabinetStatus;
  lastSyncedAt: string;
  skuId: string;
  skuCode: string;
  model: string;
  color: string;
  capacity: number;
  manualUrl?: string;
  imageUri?: string;
  role: CabinetRole;
  availableCount: number;
  checkedOutCount: number;
  overdueCount: number;
  clearRestoreUntil?: string;
};

export type SlotView = {
  id: string;
  cabinetId: string;
  number: number;
  keyId?: string;
  keyName?: string;
  status: KeyStatus;
  holder?: string;
};

export type KeyView = {
  id: string;
  cabinetId: string;
  slotId: string;
  slotNumber: number;
  name: string;
  note: string;
  status: Exclude<KeyStatus, 'empty'>;
  activeLoan?: LoanView;
};

export type LoanView = {
  id: string;
  cabinetId: string;
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt: string;
  expectedReturnAt: string;
  returnedAt?: string;
  operatorUserId: string;
};

export type MemberView = {
  id: string;
  cabinetId: string;
  userId: string;
  name: string;
  email: string;
  role: CabinetRole;
  boundAt: string;
};

export type CabinetEventKind =
  | 'checkOut'
  | 'return'
  | 'keyAdded'
  | 'keyUpdated'
  | 'undo'
  | 'memberAdded'
  | 'memberRemoved'
  | 'roleChanged'
  | 'keysCleared'
  | 'keysRestored'
  | 'admin';

export type EventView = {
  id: string;
  cabinetId: string;
  keyId?: string;
  keyName?: string;
  actorUserId: string;
  actorName: string;
  kind: CabinetEventKind;
  createdAt: string;
  title: string;
  detail?: string;
  borrowerContact?: string;
  reversible?: boolean;
};

export type ActivityFilters = {
  cabinetId?: string;
  kind?: CabinetEventKind | 'all' | 'borrowed';
  actorUserId?: string;
  keyId?: string;
  from?: string;
  to?: string;
};

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export type CheckoutInput = {
  cabinetId: string;
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt: string;
  expectedReturnAt: string;
};

export type ExportArtifactView = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type PrototypeSnapshot = {
  cabinets: CabinetView[];
  members: MemberView[];
  slots: SlotView[];
  keys: KeyView[];
  loans: LoanView[];
  events: EventView[];
  currentUserId: string;
  now: string;
  isOffline: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
};

export type PrototypeActions = {
  addKey(input: { cabinetId: string; slotId: string; name: string; note: string }): Promise<void>;
  updateKey(input: { keyId: string; name: string; note: string }): Promise<void>;
  checkoutKey(input: CheckoutInput): Promise<void>;
  returnKey(input: { cabinetId: string; keyId: string; returnedAt?: string }): Promise<void>;
  undoEvent(input: { eventId: string }): Promise<void>;
  setMemberRole(input: { cabinetId: string; membershipId: string; role: 'admin' | 'member' }): Promise<void>;
  removeMember(input: { cabinetId: string; membershipId: string }): Promise<void>;
  clearKeys(input: { cabinetId: string }): Promise<void>;
  restoreLastClear(input: { cabinetId: string }): Promise<void>;
  exportLog(input: { cabinetId: string; format: ExportFormat; includeFullContact: boolean }): Promise<ExportArtifactView>;
};

export type PrototypeApp = PrototypeSnapshot & PrototypeActions;
