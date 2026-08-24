import type {
  Cabinet,
  CabinetEvent,
  CabinetMembership,
  CabinetQr,
  CurrentUserAccount,
  Key,
  KeySlot,
  Loan,
  ProductSku,
  RegisterRequest,
  UserAccount,
  WriteOptions,
} from '@uniclife/shared';

export type {
  Cabinet,
  CabinetEvent,
  CabinetMembership,
  CabinetQr,
  CurrentUserAccount,
  Key,
  KeySlot,
  Loan,
  ProductSku,
  UserAccount,
  WriteOptions,
} from '@uniclife/shared';

export type SessionStatus = 'anonymous' | 'authenticated' | 'expired';

export type AppState = {
  hydrated: boolean;
  currentUserId: string | null;
  currentUser: CurrentUserAccount | null;
  sessionStatus: SessionStatus;
  online: boolean;
  now: string;
  version: number;
  users: UserAccount[];
  skus: ProductSku[];
  qrs: CabinetQr[];
  cabinets: Cabinet[];
  memberships: CabinetMembership[];
  slots: KeySlot[];
  keys: Key[];
  loans: Loan[];
  events: CabinetEvent[];
};

export type EventFilter = {
  cabinetId?: string;
  keyId?: string;
  actorId?: string;
  types?: CabinetEvent['type'][];
  from?: string;
  to?: string;
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

export type AppActions = {
  hydrate(): Promise<void>;
  refresh(): Promise<void>;
  signIn(input: { email: string; password: string }): Promise<CurrentUserAccount>;
  register(input: RegisterRequest): Promise<CurrentUserAccount>;
  signOut(): Promise<void>;
  markHomeGuidePrompted(): Promise<CurrentUserAccount>;
  requestPasswordReset(input: { email: string }): Promise<{ challengeId: string }>;
  getPasswordResetPreview(input: { challengeId: string }): Promise<{ code: string }>;
  verifyReset(input: { challengeId: string; code: string }): Promise<{ resetToken: string }>;
  resetPassword(input: { resetToken: string; newPassword: string }): Promise<void>;
  updateProfile(
    input: { displayName: string; avatarUri?: string | null } & WriteOptions,
  ): Promise<CurrentUserAccount>;
  updateEmail(input: { email: string } & WriteOptions): Promise<CurrentUserAccount>;
  changePassword(
    input: { currentPassword: string; newPassword: string } & WriteOptions,
  ): Promise<void>;
  deleteAccount(input?: WriteOptions): Promise<void>;
  resolveQr(input: { code: string } | string): Promise<QrResolution>;
  bindCabinet(
    input: { qrCode: string; name?: string; timeZone?: string } & WriteOptions,
  ): Promise<BindCabinetResult>;
  renameCabinet(input: { cabinetId: string; name: string } & WriteOptions): Promise<Cabinet>;
  removeMember(
    input: { cabinetId: string; membershipId: string } & WriteOptions,
  ): Promise<void>;
  addKey(
    input: {
      cabinetId: string;
      slotId: string;
      name: string;
      note?: string;
    } & WriteOptions,
  ): Promise<Key>;
  updateKey(
    input: { keyId: string; name?: string; note?: string } & WriteOptions,
  ): Promise<Key>;
  deleteKey(input: { keyId: string } & WriteOptions): Promise<void>;
  checkOutKey(
    input: {
      keyId: string;
      borrowerName: string;
      borrowerContact?: string;
      checkedOutAt?: string;
      expectedReturnAt?: string;
    } & WriteOptions,
  ): Promise<{ key: Key; event: CabinetEvent }>;
  returnKey(
    input: { keyId: string; returnedAt?: string } & WriteOptions,
  ): Promise<{ key: Key; event: CabinetEvent }>;
  deleteCabinetKeys(
    input: { cabinetId: string } & WriteOptions,
  ): Promise<{ deletedCount: number }>;
  setOnline(input: { online: boolean }): Promise<void>;
};
