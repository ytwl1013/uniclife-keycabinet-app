import type { CabinetJoinInvitation } from '@uniclife/shared';
import type { ActivityEvent, ActivityEventKind } from '@/features/activity/types';

export type CabinetRole = 'superAdmin' | 'admin';

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
  imageAsset?: string;
  role: CabinetRole;
  availableCount: number;
  checkedOutCount: number;
  overdueCount: number;
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
  expectedReturnAt?: string;
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

export type CabinetEventKind = ActivityEventKind;

export type EventView = ActivityEvent;

export type ActivityFilters = {
  cabinetId?: string;
  kind?: CabinetEventKind | 'all' | 'borrowed';
  actorUserId?: string;
  keyId?: string;
  from?: string;
  to?: string;
};

export type CheckoutInput = {
  cabinetId: string;
  keyId: string;
  borrowerName: string;
  borrowerContact?: string;
  checkedOutAt: string;
  expectedReturnAt?: string;
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
  deleteKey(input: { keyId: string }): Promise<void>;
  renameCabinet(input: { cabinetId: string; name: string }): Promise<void>;
  checkoutKey(input: CheckoutInput): Promise<void>;
  returnKey(input: { cabinetId: string; keyId: string; returnedAt?: string }): Promise<void>;
  removeMember(input: { cabinetId: string; membershipId: string }): Promise<void>;
  transferSuperAdmin(input: { cabinetId: string; membershipId: string }): Promise<void>;
  deleteAllKeys(input: { cabinetId: string }): Promise<void>;
  createJoinInvitation(input: { cabinetId: string }): Promise<CabinetJoinInvitation>;
  revokeJoinInvitation(input: {
    cabinetId: string;
    invitationId: string;
  }): Promise<void>;
};

export type PrototypeApp = PrototypeSnapshot & PrototypeActions;
