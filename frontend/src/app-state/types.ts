import type {
  Cabinet,
  CabinetEvent,
  CabinetJoinInvitation,
  CabinetMembership,
  CabinetQrResolution,
  CurrentUserAccount,
  FeedbackRequest,
  FeedbackThread,
  FeedbackThreadSummary,
  Key,
  KeySlot,
  Loan,
  ProductQr,
  ProductSku,
  PushTokenRequest,
  RegisterRequest,
  UserAccount,
  WriteOptions,
} from '@uniclife/shared';

export type {
  Cabinet,
  CabinetEvent,
  CabinetMembership,
  CabinetJoinInvitation,
  CabinetQrResolution,
  CurrentUserAccount,
  Key,
  KeySlot,
  Loan,
  ProductQr,
  ProductSku,
  UserAccount,
  WriteOptions,
} from '@uniclife/shared';

export type SessionStatus = 'anonymous' | 'authenticated' | 'expired';
export type OfflineSyncStatus = 'idle' | 'syncing' | 'success' | 'conflict';

export type AppState = {
  hydrated: boolean;
  currentUserId: string | null;
  currentUser: CurrentUserAccount | null;
  sessionStatus: SessionStatus;
  online: boolean;
  offlineMode: boolean;
  offlineSyncStatus: OfflineSyncStatus;
  offlineSnapshotAt: string | null;
  offlinePendingCount: number;
  offlineConflictCount: number;
  now: string;
  version: number;
  users: UserAccount[];
  skus: ProductSku[];
  qrs: ProductQr[];
  cabinets: Cabinet[];
  memberships: CabinetMembership[];
  slots: KeySlot[];
  keys: Key[];
  loans: Loan[];
  events: CabinetEvent[];
  feedbackThreads: FeedbackThreadSummary[];
};

export type EventFilter = {
  cabinetId?: string;
  keyId?: string;
  actorId?: string;
  types?: CabinetEvent['type'][];
  from?: string;
  to?: string;
};

export type QrResolution = CabinetQrResolution;

export type CabinetAccessResult = {
  cabinet: Cabinet;
  membership: CabinetMembership;
};

export type AppActions = {
  hydrate(): Promise<void>;
  refresh(): Promise<void>;
  refreshIfStale(input?: { staleAfterMs?: number }): Promise<void>;
  setOfflineMode(input: { enabled: boolean }): Promise<void>;
  retryOfflineConflicts(): Promise<void>;
  discardOfflineConflicts(): Promise<void>;
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
  registerPushToken(input: PushTokenRequest): Promise<void>;
  unregisterPushToken(input: PushTokenRequest): Promise<void>;
  submitFeedback(input: FeedbackRequest): Promise<{ submissionId: string; submittedAt: string }>;
  listFeedbackHistory(): Promise<FeedbackThreadSummary[]>;
  getFeedbackThread(input: { feedbackId: string }): Promise<FeedbackThread>;
  replyToFeedback(input: { feedbackId: string; content: string }): Promise<FeedbackThread>;
  markFeedbackThreadRead(input: { feedbackId: string }): Promise<void>;
  resolveQr(input: { code: string } | string): Promise<QrResolution>;
  initializeCabinet(
    input: { productQrCode: string; name: string; timeZone?: string } & WriteOptions,
  ): Promise<CabinetAccessResult>;
  createCabinetJoinInvitation(input: { cabinetId: string }): Promise<CabinetJoinInvitation>;
  revokeCabinetJoinInvitation(input: {
    cabinetId: string;
    invitationId: string;
  }): Promise<void>;
  joinCabinet(
    input: { joinQrCode: string } & WriteOptions,
  ): Promise<CabinetAccessResult>;
  renameCabinet(input: { cabinetId: string; name: string } & WriteOptions): Promise<Cabinet>;
  disconnectCabinet(input: { cabinetId: string } & WriteOptions): Promise<void>;
  deleteCabinet(input: { cabinetId: string } & WriteOptions): Promise<void>;
  transferCabinetSuperAdmin(
    input: { cabinetId: string; membershipId: string } & WriteOptions,
  ): Promise<void>;
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
