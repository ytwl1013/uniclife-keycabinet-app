import { generateExportArtifact, saveExportArtifact } from './exports';
import { assertMock, MockAppError } from './errors';
import { developerToolsEnabled as defaultDeveloperToolsEnabled } from './developer-tools';
import { createMockSelectors } from './selectors';
import { createInitialMockState } from './seed';
import {
  asyncStorageAdapter,
  clearStateOverlay,
  loadStateOverlay,
  saveStateOverlay,
} from './storage';
import {
  AddKeyInput,
  BindCabinetResult,
  CabinetEvent,
  CabinetMembership,
  CabinetRole,
  CheckOutKeyInput,
  ConsentKind,
  ExportArtifact,
  ExportLogOptions,
  Key,
  KeyClearBatch,
  MockAppState,
  MockStorage,
  QrResolution,
  RegisterInput,
  ReturnKeyInput,
  UpdateKeyInput,
  UserAccount,
  WriteOptions,
  supportedLocales,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const LEGAL_POLICY_VERSION = 'legal-draft-2026-07';
const MARKETING_POLICY_VERSION = 'marketing-draft-2026-07';

type ResetChallenge = {
  id: string;
  userId: string;
  code: string;
  expiresAt: number;
  verified: boolean;
};

type ResetToken = {
  userId: string;
  expiresAt: number;
};

export type MockAppActions = {
  hydrate(): Promise<void>;
  signIn(input: { email: string; password: string }): Promise<UserAccount>;
  register(input: RegisterInput): Promise<UserAccount>;
  signOut(): Promise<void>;
  requestPasswordReset(input: { email: string }): Promise<{ challengeId: string }>;
  getPasswordResetPreview(input: { challengeId: string }): Promise<{ code: string }>;
  verifyReset(input: { challengeId: string; code: string }): Promise<{ resetToken: string }>;
  resetPassword(input: { resetToken: string; newPassword: string }): Promise<void>;
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  deleteAccount(input?: { releaseSoleCabinets?: boolean } & WriteOptions): Promise<void>;
  setMarketingConsent(input: { granted: boolean } & WriteOptions): Promise<void>;
  resolveQr(input: { code: string } | string): Promise<QrResolution>;
  bindCabinet(input: { qrCode: string } & WriteOptions): Promise<BindCabinetResult>;
  removeMember(input: { cabinetId: string; membershipId: string } & WriteOptions): Promise<void>;
  setMemberRole(input: {
    cabinetId: string;
    membershipId: string;
    role: Extract<CabinetRole, 'admin' | 'member'>;
  } & WriteOptions): Promise<CabinetMembership>;
  transferOwnership(input: {
    cabinetId: string;
    newOwnerUserId: string;
  } & WriteOptions): Promise<void>;
  addKey(input: AddKeyInput): Promise<Key>;
  updateKey(input: UpdateKeyInput): Promise<Key>;
  checkOutKey(input: CheckOutKeyInput): Promise<{ key: Key; event: CabinetEvent }>;
  returnKey(input: ReturnKeyInput): Promise<{ key: Key; event: CabinetEvent }>;
  undoEvent(input: { eventId: string } & WriteOptions): Promise<CabinetEvent>;
  clearCabinetKeys(input: { cabinetId: string } & WriteOptions): Promise<KeyClearBatch>;
  restoreClearBatch(input: { batchId: string } & WriteOptions): Promise<KeyClearBatch>;
  exportCabinetLog(input: ExportLogOptions): Promise<ExportArtifact>;
  downloadCabinetLog(input: ExportLogOptions): Promise<string>;
  saveExport(artifact: ExportArtifact): Promise<string>;
  switchAccount(input: { userId: string }): Promise<UserAccount>;
  setOnline(input: { online: boolean }): Promise<void>;
  expireSession(): Promise<void>;
  advanceTime(input: { days?: number; milliseconds?: number }): Promise<string>;
  resetData(): Promise<void>;
};

export type MockAppService = {
  getState(): MockAppState;
  subscribe(listener: () => void): () => void;
  actions: MockAppActions;
};

export type CreateMockAppServiceOptions = {
  storage?: MockStorage;
  latencyMs?: number;
  initialState?: MockAppState;
  resetCodeFactory?: () => string;
  developerToolsEnabled?: boolean;
};

function clone<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function omitWriteOptions<T extends WriteOptions>(input: T): WriteOptions {
  return { expectedVersion: input.expectedVersion, requestId: input.requestId };
}

export function createMockAppService(
  options: CreateMockAppServiceOptions = {},
): MockAppService {
  const storage = options.storage ?? asyncStorageAdapter;
  const latencyMs = options.latencyMs ?? 240;
  const developerToolsEnabled =
    options.developerToolsEnabled ?? defaultDeveloperToolsEnabled;
  let state = clone(options.initialState ?? createInitialMockState());
  const listeners = new Set<() => void>();
  const requestResults = new Map<string, unknown>();
  const transientPasswords = new Map<string, string>();
  const resetChallenges = new Map<string, ResetChallenge>();
  const resetTokens = new Map<string, ResetToken>();
  let commitTail: Promise<void> = Promise.resolve();
  let sessionRevision = 0;
  let idSequence = 0;

  const hasEntityId = (candidateId: string): boolean => {
    const collections: (readonly { id: string }[])[] = [
      state.users,
      state.skus,
      state.qrs,
      state.cabinets,
      state.memberships,
      state.slots,
      state.keys,
      state.loans,
      state.events,
      state.clearBatches,
      state.consents,
    ];
    return collections.some((collection) => collection.some((entity) => entity.id === candidateId));
  };

  const id = (prefix: string): string => {
    let candidate: string;
    do {
      idSequence += 1;
      candidate = `${prefix}-${Date.parse(state.now).toString(36)}-${idSequence.toString(36)}`;
    } while (hasEntityId(candidate));
    return candidate;
  };

  const waitForNetwork = async () => {
    if (latencyMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
    }
  };

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const replaceState = async (next: MockAppState, persist = true) => {
    const sessionChanged =
      next.currentUserId !== state.currentUserId || next.sessionStatus !== state.sessionStatus;
    if (persist) {
      await saveStateOverlay(storage, next);
    }
    state = next;
    if (sessionChanged) {
      sessionRevision += 1;
    }
    emit();
  };

  const assertOnline = () => {
    assertMock(state.online, 'OFFLINE');
  };

  const assertSession = (): UserAccount => {
    if (state.sessionStatus === 'expired') {
      throw new MockAppError('SESSION_EXPIRED');
    }
    assertMock(state.sessionStatus === 'authenticated' && state.currentUserId, 'SESSION_REQUIRED');
    const user = state.users.find(
      (candidate) => candidate.id === state.currentUserId && candidate.status === 'active',
    );
    assertMock(user, 'SESSION_REQUIRED');
    return user;
  };

  const assertNetworkSession = (): UserAccount => {
    assertOnline();
    return assertSession();
  };

  const withCommitLock = async <T>(operation: () => Promise<T>): Promise<T> => {
    const previous = commitTail;
    let release: () => void = () => undefined;
    commitTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  };

  const assertMember = (
    draft: MockAppState,
    cabinetId: string,
    userId: string,
  ): CabinetMembership => {
    const membership = draft.memberships.find(
      (candidate) =>
        candidate.cabinetId === cabinetId && candidate.userId === userId && candidate.active,
    );
    assertMock(membership, 'MEMBERSHIP_REQUIRED', { cabinetId });
    return membership;
  };

  const assertManager = (
    draft: MockAppState,
    cabinetId: string,
    userId: string,
  ): CabinetMembership => {
    const membership = assertMember(draft, cabinetId, userId);
    assertMock(membership.role === 'owner' || membership.role === 'admin', 'PERMISSION_DENIED');
    return membership;
  };

  const touchCabinet = (draft: MockAppState, cabinetId: string) => {
    const cabinet = draft.cabinets.find((candidate) => candidate.id === cabinetId);
    assertMock(cabinet, 'CABINET_NOT_FOUND', { cabinetId });
    cabinet.version += 1;
    cabinet.lastSyncedAt = draft.now;
  };

  const appendEvent = (
    draft: MockAppState,
    input: Omit<CabinetEvent, 'id' | 'occurredAt'> & { occurredAt?: string },
  ): CabinetEvent => {
    const event: CabinetEvent = {
      ...input,
      id: id('event'),
      occurredAt: input.occurredAt ?? draft.now,
    };
    draft.events.push(event);
    return event;
  };

  const commit = async <T>(
    operation: string,
    writeOptions: WriteOptions,
    mutate: (draft: MockAppState, currentUser: UserAccount) => T,
  ): Promise<T> => {
    const initialUser = assertNetworkSession();
    const initialSessionRevision = sessionRevision;
    await waitForNetwork();
    return withCommitLock(async () => {
      const user = assertNetworkSession();
      assertMock(
        user.id === initialUser.id && sessionRevision === initialSessionRevision,
        'SESSION_EXPIRED',
      );
      const requestKey = writeOptions.requestId
        ? `${operation}:${user.id}:${writeOptions.requestId}`
        : null;
      if (requestKey && requestResults.has(requestKey)) {
        return clone(requestResults.get(requestKey) as T);
      }
      if (
        writeOptions.expectedVersion !== undefined &&
        writeOptions.expectedVersion !== state.version
      ) {
        throw new MockAppError('VERSION_CONFLICT', {
          expectedVersion: writeOptions.expectedVersion,
          actualVersion: state.version,
        });
      }
      const draft = clone(state);
      const result = mutate(draft, user);
      draft.version += 1;
      await replaceState(draft);
      if (requestKey) {
        requestResults.set(requestKey, clone(result));
      }
      return clone(result);
    });
  };

  const hydrate = async () => {
    try {
      const overlay = await loadStateOverlay(storage);
      state = overlay ? { ...overlay, hydrated: true } : { ...state, hydrated: true };
    } catch {
      await clearStateOverlay(storage);
      state = { ...createInitialMockState(), hydrated: true };
    }
    sessionRevision += 1;
    emit();
  };

  const signIn: MockAppActions['signIn'] = async ({ email, password }) => {
    assertOnline();
    await waitForNetwork();
    const normalized = normalizedEmail(email);
    assertMock(isEmail(normalized) && password.length >= 8, 'INVALID_CREDENTIALS');
    const user = state.users.find(
      (candidate) => candidate.email.toLowerCase() === normalized && candidate.status === 'active',
    );
    assertMock(user, 'INVALID_CREDENTIALS');
    const knownPassword = transientPasswords.get(user.id);
    assertMock(knownPassword, 'PASSWORD_RESET_REQUIRED');
    assertMock(knownPassword === password, 'INVALID_CREDENTIALS');
    await replaceState({
      ...state,
      currentUserId: user.id,
      sessionStatus: 'authenticated',
    });
    return clone(user);
  };

  const register: MockAppActions['register'] = async (input) => {
    assertOnline();
    await waitForNetwork();
    const email = normalizedEmail(input.email);
    assertMock(
      isEmail(email) && input.password.length >= 8 && input.displayName.trim().length > 0,
      'INVALID_INPUT',
    );
    assertMock(input.acceptedTerms && input.acceptedPrivacy, 'INVALID_INPUT');
    assertMock(supportedLocales.includes(input.locale), 'INVALID_INPUT');
    assertMock(
      !state.users.some((candidate) => candidate.email.toLowerCase() === email),
      'EMAIL_ALREADY_REGISTERED',
    );
    const user: UserAccount = {
      id: id('user'),
      email,
      displayName: input.displayName.trim(),
      locale: input.locale,
      status: 'active',
      createdAt: state.now,
    };
    const draft = clone(state);
    draft.users.push(user);
    const recordConsent = (kind: ConsentKind, granted: boolean, policyVersion: string) => {
      draft.consents.push({
        id: id(`consent-${kind}`),
        userId: user.id,
        kind,
        granted,
        policyVersion,
        locale: user.locale,
        recordedAt: draft.now,
      });
    };
    recordConsent('terms', true, LEGAL_POLICY_VERSION);
    recordConsent('privacy', true, LEGAL_POLICY_VERSION);
    recordConsent('marketing', input.marketingOptIn, MARKETING_POLICY_VERSION);
    draft.currentUserId = user.id;
    draft.sessionStatus = 'authenticated';
    draft.version += 1;
    transientPasswords.set(user.id, input.password);
    await replaceState(draft);
    return clone(user);
  };

  const signOut = async () => {
    await replaceState({ ...state, currentUserId: null, sessionStatus: 'anonymous' });
  };

  const requestPasswordReset: MockAppActions['requestPasswordReset'] = async ({ email }) => {
    assertOnline();
    await waitForNetwork();
    const user = state.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === normalizedEmail(email) && candidate.status === 'active',
    );
    assertMock(user, 'USER_NOT_FOUND');
    const challengeId = id('reset-challenge');
    const resetCode =
      options.resetCodeFactory?.() ?? String(100000 + Math.floor(Math.random() * 900000));
    assertMock(/^\d{6}$/.test(resetCode), 'INVALID_INPUT');
    resetChallenges.set(challengeId, {
      id: challengeId,
      userId: user.id,
      code: resetCode,
      expiresAt: Date.parse(state.now) + 10 * 60 * 1000,
      verified: false,
    });
    return { challengeId };
  };

  const getPasswordResetPreview: MockAppActions['getPasswordResetPreview'] = async ({
    challengeId,
  }) => {
    assertMock(developerToolsEnabled, 'PERMISSION_DENIED');
    const challenge = resetChallenges.get(challengeId);
    assertMock(
      challenge && !challenge.verified && challenge.expiresAt >= Date.parse(state.now),
      'RESET_CHALLENGE_INVALID',
    );
    return { code: challenge.code };
  };

  const verifyReset: MockAppActions['verifyReset'] = async ({ challengeId, code }) => {
    assertOnline();
    await waitForNetwork();
    const challenge = resetChallenges.get(challengeId);
    assertMock(
      challenge && !challenge.verified && challenge.expiresAt >= Date.parse(state.now),
      'RESET_CHALLENGE_INVALID',
    );
    assertMock(challenge.code === code.trim(), 'RESET_CODE_INVALID');
    challenge.verified = true;
    const resetToken = id('reset-token');
    resetTokens.set(resetToken, {
      userId: challenge.userId,
      expiresAt: Date.parse(state.now) + 10 * 60 * 1000,
    });
    resetChallenges.delete(challengeId);
    return { resetToken };
  };

  const resetPassword: MockAppActions['resetPassword'] = async ({ resetToken, newPassword }) => {
    assertOnline();
    await waitForNetwork();
    const token = resetTokens.get(resetToken);
    assertMock(token && token.expiresAt >= Date.parse(state.now), 'RESET_CHALLENGE_INVALID');
    assertMock(newPassword.length >= 8, 'INVALID_INPUT');
    transientPasswords.set(token.userId, newPassword);
    resetTokens.delete(resetToken);
  };

  const changePassword: MockAppActions['changePassword'] = async ({
    currentPassword,
    newPassword,
  }) => {
    const initialUser = assertNetworkSession();
    const initialSessionRevision = sessionRevision;
    await waitForNetwork();
    const user = assertNetworkSession();
    assertMock(
      user.id === initialUser.id && sessionRevision === initialSessionRevision,
      'SESSION_EXPIRED',
    );
    assertMock(currentPassword.length >= 8 && newPassword.length >= 8, 'INVALID_INPUT');
    const knownPassword = transientPasswords.get(user.id);
    assertMock(knownPassword, 'PASSWORD_RESET_REQUIRED');
    assertMock(knownPassword === currentPassword, 'INVALID_CREDENTIALS');
    transientPasswords.set(user.id, newPassword);
  };

  const deleteAccount: MockAppActions['deleteAccount'] = async (input = {}) => {
    const deletingUserId = state.currentUserId;
    await commit('delete-account', input, (draft, user) => {
      const owned = draft.memberships.filter(
        (membership) => membership.userId === user.id && membership.active && membership.role === 'owner',
      );
      for (const membership of owned) {
        const others = draft.memberships.filter(
          (candidate) =>
            candidate.cabinetId === membership.cabinetId &&
            candidate.userId !== user.id &&
            candidate.active,
        );
        if (others.length > 0 || !input.releaseSoleCabinets) {
          throw new MockAppError('OWNER_TRANSFER_REQUIRED', { cabinetId: membership.cabinetId });
        }
      }
      const membershipsToRemove = draft.memberships.filter(
        (candidate) => candidate.userId === user.id && candidate.active,
      );
      for (const membership of membershipsToRemove) {
        membership.active = false;
        membership.removedAt = draft.now;
        appendEvent(draft, {
          cabinetId: membership.cabinetId,
          actorId: user.id,
          type: 'member_removed',
          reversible: false,
          summaryData: {
            membershipId: membership.id,
            removedUserId: user.id,
            reason: 'account_deleted',
          },
        });
        touchCabinet(draft, membership.cabinetId);
      }
      const account = draft.users.find((candidate) => candidate.id === user.id);
      assertMock(account, 'USER_NOT_FOUND');
      let deletedEmailSequence = 0;
      let deletedEmail = `deleted-${user.id}@example.com`;
      while (
        draft.users.some(
          (candidate) =>
            candidate.id !== user.id && candidate.email.toLowerCase() === deletedEmail.toLowerCase(),
        )
      ) {
        deletedEmailSequence += 1;
        deletedEmail = `deleted-${user.id}-${deletedEmailSequence}@example.com`;
      }
      account.email = deletedEmail;
      account.displayName = 'Deleted account';
      account.status = 'disabled';
      draft.consents = draft.consents.filter((consent) => consent.userId !== user.id);
      draft.currentUserId = null;
      draft.sessionStatus = 'anonymous';
    });
    if (deletingUserId) {
      transientPasswords.delete(deletingUserId);
      for (const [challengeId, challenge] of resetChallenges) {
        if (challenge.userId === deletingUserId) {
          resetChallenges.delete(challengeId);
        }
      }
      for (const [tokenId, token] of resetTokens) {
        if (token.userId === deletingUserId) {
          resetTokens.delete(tokenId);
        }
      }
    }
  };

  const setMarketingConsent: MockAppActions['setMarketingConsent'] = async (input) =>
    commit('marketing-consent', input, (draft, user) => {
      const current = [...draft.consents]
        .reverse()
        .find((record) => record.userId === user.id && record.kind === 'marketing');
      if (current?.granted && !input.granted && !current.withdrawnAt) {
        current.withdrawnAt = draft.now;
      }
      draft.consents.push({
        id: id('consent-marketing'),
        userId: user.id,
        kind: 'marketing',
        granted: input.granted,
        policyVersion: MARKETING_POLICY_VERSION,
        locale: user.locale,
        recordedAt: draft.now,
      });
    });

  const resolveQr: MockAppActions['resolveQr'] = async (input) => {
    const initialUser = assertNetworkSession();
    const initialSessionRevision = sessionRevision;
    await waitForNetwork();
    const user = assertNetworkSession();
    assertMock(
      user.id === initialUser.id && sessionRevision === initialSessionRevision,
      'SESSION_EXPIRED',
    );
    const code = typeof input === 'string' ? input : input.code;
    const qr = state.qrs.find((candidate) => candidate.code === code.trim());
    assertMock(qr, 'QR_NOT_FOUND');
    assertMock(qr.status === 'active', 'QR_DISABLED');
    const sku = state.skus.find((candidate) => candidate.id === qr.skuId);
    const cabinet = state.cabinets.find((candidate) => candidate.id === qr.cabinetId);
    assertMock(sku, 'SKU_NOT_FOUND');
    assertMock(cabinet, 'CABINET_NOT_FOUND');
    return clone({ qr, sku, cabinet });
  };

  const bindCabinet: MockAppActions['bindCabinet'] = async (input) => {
    const initialUser = assertNetworkSession();
    const initialSessionRevision = sessionRevision;
    await waitForNetwork();
    const user = assertNetworkSession();
    assertMock(
      user.id === initialUser.id && sessionRevision === initialSessionRevision,
      'SESSION_EXPIRED',
    );
    const qr = state.qrs.find((candidate) => candidate.code === input.qrCode.trim());
    assertMock(qr, 'QR_NOT_FOUND');
    assertMock(qr.status === 'active', 'QR_DISABLED');
    const existing = state.memberships.find(
      (membership) =>
        membership.cabinetId === qr.cabinetId && membership.userId === user.id && membership.active,
    );
    if (existing) {
      const cabinet = state.cabinets.find((candidate) => candidate.id === qr.cabinetId);
      assertMock(cabinet, 'CABINET_NOT_FOUND');
      return clone({ cabinet, membership: existing });
    }
    return commit('bind-cabinet', omitWriteOptions(input), (draft, currentUser) => {
      const cabinet = draft.cabinets.find((candidate) => candidate.id === qr.cabinetId);
      assertMock(cabinet, 'CABINET_NOT_FOUND');
      const previousMembership = draft.memberships.find(
        (membership) =>
          membership.cabinetId === cabinet.id && membership.userId === currentUser.id,
      );
      if (previousMembership?.active) {
        return { cabinet, membership: previousMembership };
      }
      const hasMembers = draft.memberships.some(
        (membership) => membership.cabinetId === cabinet.id && membership.active,
      );
      const membership: CabinetMembership = previousMembership ?? {
        id: id('membership'),
        cabinetId: cabinet.id,
        userId: currentUser.id,
        role: hasMembers ? 'member' : 'owner',
        active: true,
        joinedAt: draft.now,
      };
      if (previousMembership) {
        previousMembership.active = true;
        previousMembership.joinedAt = draft.now;
        previousMembership.role = hasMembers ? 'member' : 'owner';
        delete previousMembership.removedAt;
      } else {
        draft.memberships.push(membership);
      }
      appendEvent(draft, {
        cabinetId: cabinet.id,
        actorId: currentUser.id,
        type: 'cabinet_bound',
        reversible: false,
        summaryData: { membershipId: membership.id, role: membership.role },
      });
      touchCabinet(draft, cabinet.id);
      return { cabinet, membership };
    });
  };

  const removeMember: MockAppActions['removeMember'] = async (input) =>
    commit('remove-member', input, (draft, user) => {
      const actor = assertManager(draft, input.cabinetId, user.id);
      const target = draft.memberships.find(
        (membership) =>
          membership.id === input.membershipId &&
          membership.cabinetId === input.cabinetId &&
          membership.active,
      );
      assertMock(target, 'MEMBER_NOT_FOUND');
      assertMock(target.userId !== user.id && target.role !== 'owner', 'CANNOT_REMOVE_OWNER');
      assertMock(actor.role === 'owner' || target.role === 'member', 'PERMISSION_DENIED');
      target.active = false;
      target.removedAt = draft.now;
      appendEvent(draft, {
        cabinetId: input.cabinetId,
        actorId: user.id,
        type: 'member_removed',
        reversible: false,
        summaryData: { membershipId: target.id, removedUserId: target.userId },
      });
      touchCabinet(draft, input.cabinetId);
    });

  const setMemberRole: MockAppActions['setMemberRole'] = async (input) =>
    commit('set-member-role', input, (draft, user) => {
      const actor = assertMember(draft, input.cabinetId, user.id);
      assertMock(actor.role === 'owner', 'PERMISSION_DENIED');
      const target = draft.memberships.find(
        (membership) =>
          membership.id === input.membershipId &&
          membership.cabinetId === input.cabinetId &&
          membership.active,
      );
      assertMock(target, 'MEMBER_NOT_FOUND');
      assertMock(target.role !== 'owner', 'PERMISSION_DENIED');
      target.role = input.role;
      appendEvent(draft, {
        cabinetId: input.cabinetId,
        actorId: user.id,
        type: 'member_role_changed',
        reversible: false,
        summaryData: { membershipId: target.id, role: target.role },
      });
      touchCabinet(draft, input.cabinetId);
      return target;
    });

  const transferOwnership: MockAppActions['transferOwnership'] = async (input) =>
    commit('transfer-ownership', input, (draft, user) => {
      const current = assertMember(draft, input.cabinetId, user.id);
      assertMock(current.role === 'owner', 'PERMISSION_DENIED');
      const next = draft.memberships.find(
        (membership) =>
          membership.cabinetId === input.cabinetId &&
          membership.userId === input.newOwnerUserId &&
          membership.active,
      );
      assertMock(next, 'MEMBER_NOT_FOUND');
      current.role = 'admin';
      next.role = 'owner';
      appendEvent(draft, {
        cabinetId: input.cabinetId,
        actorId: user.id,
        type: 'ownership_transferred',
        reversible: false,
        summaryData: { previousOwnerId: user.id, newOwnerId: next.userId },
      });
      touchCabinet(draft, input.cabinetId);
    });

  const addKey: MockAppActions['addKey'] = async (input) =>
    commit('add-key', input, (draft, user) => {
      assertMember(draft, input.cabinetId, user.id);
      assertMock(input.name.trim().length > 0, 'INVALID_INPUT');
      const slot = draft.slots.find(
        (candidate) => candidate.id === input.slotId && candidate.cabinetId === input.cabinetId,
      );
      assertMock(slot, 'SLOT_NOT_FOUND');
      assertMock(!slot.keyId, 'SLOT_OCCUPIED');
      const key: Key = {
        id: id('key'),
        cabinetId: input.cabinetId,
        slotId: slot.id,
        name: input.name.trim(),
        note: input.note?.trim() ?? '',
        status: 'available',
        createdAt: draft.now,
        updatedAt: draft.now,
      };
      draft.keys.push(key);
      slot.keyId = key.id;
      appendEvent(draft, {
        cabinetId: key.cabinetId,
        keyId: key.id,
        actorId: user.id,
        type: 'key_added',
        reversible: false,
        summaryData: { keyName: key.name, slotId: slot.id, position: slot.position },
      });
      touchCabinet(draft, input.cabinetId);
      return key;
    });

  const updateKey: MockAppActions['updateKey'] = async (input) =>
    commit('update-key', input, (draft, user) => {
      const key = draft.keys.find((candidate) => candidate.id === input.keyId);
      assertMock(key, 'KEY_NOT_FOUND');
      assertMock(!key.deletedAt, 'KEY_DELETED');
      assertMember(draft, key.cabinetId, user.id);
      const previousName = key.name;
      const previousNote = key.note;
      if (input.name !== undefined) {
        assertMock(input.name.trim().length > 0, 'INVALID_INPUT');
        key.name = input.name.trim();
      }
      if (input.note !== undefined) {
        key.note = input.note.trim();
      }
      key.updatedAt = draft.now;
      appendEvent(draft, {
        cabinetId: key.cabinetId,
        keyId: key.id,
        actorId: user.id,
        type: 'key_updated',
        reversible: false,
        summaryData: {
          changedName: input.name !== undefined,
          changedNote: input.note !== undefined,
          keyName: key.name,
          previousName,
          nextName: key.name,
          previousNote,
          nextNote: key.note,
        },
      });
      touchCabinet(draft, key.cabinetId);
      return key;
    });

  const checkOutKey: MockAppActions['checkOutKey'] = async (input) =>
    commit('checkout-key', input, (draft, user) => {
      const key = draft.keys.find((candidate) => candidate.id === input.keyId);
      assertMock(key, 'KEY_NOT_FOUND');
      assertMock(!key.deletedAt, 'KEY_DELETED');
      assertMember(draft, key.cabinetId, user.id);
      assertMock(key.status === 'available', 'KEY_NOT_AVAILABLE');
      assertMock(input.borrowerName.trim().length > 0, 'INVALID_INPUT');
      const checkedOutAt = input.checkedOutAt ?? draft.now;
      assertMock(
        Number.isFinite(Date.parse(checkedOutAt)) &&
          Number.isFinite(Date.parse(input.expectedReturnAt)) &&
          Date.parse(input.expectedReturnAt) > Date.parse(checkedOutAt),
        'EXPECTED_RETURN_INVALID',
      );
      const loanId = id('loan');
      const event = appendEvent(draft, {
        cabinetId: key.cabinetId,
        keyId: key.id,
        actorId: user.id,
        type: 'checkout',
        occurredAt: checkedOutAt,
        reversible: true,
        relatedLoanId: loanId,
        summaryData: { borrowerName: input.borrowerName.trim(), keyName: key.name },
      });
      draft.loans.push({
        id: loanId,
        cabinetId: key.cabinetId,
        keyId: key.id,
        borrowerName: input.borrowerName.trim(),
        borrowerContact: input.borrowerContact?.trim() || undefined,
        checkedOutAt,
        expectedReturnAt: input.expectedReturnAt,
        status: 'active',
        operatorId: user.id,
        checkoutEventId: event.id,
      });
      key.status = 'borrowed';
      key.updatedAt = checkedOutAt;
      touchCabinet(draft, key.cabinetId);
      return { key, event };
    });

  const returnKey: MockAppActions['returnKey'] = async (input) =>
    commit('return-key', input, (draft, user) => {
      const key = draft.keys.find((candidate) => candidate.id === input.keyId);
      assertMock(key, 'KEY_NOT_FOUND');
      assertMock(!key.deletedAt, 'KEY_DELETED');
      assertMember(draft, key.cabinetId, user.id);
      assertMock(key.status === 'borrowed', 'KEY_NOT_BORROWED');
      const loan = draft.loans.find(
        (candidate) => candidate.keyId === key.id && candidate.status === 'active',
      );
      assertMock(loan, 'ACTIVE_LOAN_NOT_FOUND');
      const returnedAt = input.returnedAt ?? draft.now;
      assertMock(
        Number.isFinite(Date.parse(returnedAt)) && Date.parse(returnedAt) >= Date.parse(loan.checkedOutAt),
        'INVALID_INPUT',
      );
      const event = appendEvent(draft, {
        cabinetId: key.cabinetId,
        keyId: key.id,
        actorId: user.id,
        type: 'return',
        occurredAt: returnedAt,
        reversible: true,
        relatedLoanId: loan.id,
        summaryData: { keyName: key.name },
      });
      loan.status = 'returned';
      loan.returnedAt = returnedAt;
      loan.returnOperatorId = user.id;
      loan.returnEventId = event.id;
      key.status = 'available';
      key.updatedAt = returnedAt;
      touchCabinet(draft, key.cabinetId);
      return { key, event };
    });

  const undoEvent: MockAppActions['undoEvent'] = async (input) =>
    commit('undo-event', input, (draft, user) => {
      const original = draft.events.find((candidate) => candidate.id === input.eventId);
      assertMock(
        original?.keyId &&
          original.actorId === user.id &&
          original.reversible &&
          !original.reversedByEventId &&
          (original.type === 'checkout' || original.type === 'return'),
        'UNDO_NOT_ALLOWED',
      );
      assertMember(draft, original.cabinetId, user.id);
      const latestKeyEvent = [...draft.events]
        .reverse()
        .find((candidate) => candidate.keyId === original.keyId);
      assertMock(latestKeyEvent?.id === original.id, 'UNDO_NOT_ALLOWED');
      const key = draft.keys.find((candidate) => candidate.id === original.keyId);
      const loan = original.relatedLoanId
        ? draft.loans.find((candidate) => candidate.id === original.relatedLoanId)
        : undefined;
      assertMock(key && loan, 'UNDO_NOT_ALLOWED');

      if (original.type === 'checkout') {
        assertMock(loan.status === 'active' && key.status === 'borrowed', 'UNDO_NOT_ALLOWED');
        loan.status = 'cancelled';
        key.status = 'available';
      } else {
        assertMock(
          loan.status === 'returned' && loan.returnEventId === original.id && key.status === 'available',
          'UNDO_NOT_ALLOWED',
        );
        loan.status = 'active';
        delete loan.returnedAt;
        delete loan.returnOperatorId;
        delete loan.returnEventId;
        key.status = 'borrowed';
      }
      key.updatedAt = draft.now;
      const reversal = appendEvent(draft, {
        cabinetId: original.cabinetId,
        keyId: original.keyId,
        actorId: user.id,
        type: original.type === 'checkout' ? 'undo_checkout' : 'undo_return',
        reversible: false,
        relatedLoanId: loan.id,
        summaryData: { keyName: key.name, originalEventId: original.id },
      });
      original.reversedByEventId = reversal.id;
      original.reversible = false;
      touchCabinet(draft, original.cabinetId);
      return reversal;
    });

  const clearCabinetKeys: MockAppActions['clearCabinetKeys'] = async (input) =>
    commit('clear-cabinet-keys', input, (draft, user) => {
      assertManager(draft, input.cabinetId, user.id);
      assertMock(
        !draft.loans.some(
          (loan) => loan.cabinetId === input.cabinetId && loan.status === 'active',
        ),
        'ACTIVE_LOANS_BLOCK_CLEAR',
      );
      const keys = draft.keys.filter(
        (key) => key.cabinetId === input.cabinetId && !key.deletedAt,
      );
      assertMock(keys.length > 0, 'NO_KEYS_TO_CLEAR');
      const batchId = id('clear-batch');
      const recoverableUntil = new Date(Date.parse(draft.now) + 7 * DAY_MS).toISOString();
      const batch: KeyClearBatch = {
        id: batchId,
        cabinetId: input.cabinetId,
        actorId: user.id,
        clearedAt: draft.now,
        recoverableUntil,
        status: 'restorable',
        keySnapshots: clone(keys),
        slotKeyMap: keys.map((key) => ({ slotId: key.slotId, keyId: key.id })),
      };
      draft.clearBatches.push(batch);
      for (const key of keys) {
        key.deletedAt = draft.now;
        key.recoverableUntil = recoverableUntil;
        key.clearBatchId = batchId;
        key.updatedAt = draft.now;
        const slot = draft.slots.find((candidate) => candidate.id === key.slotId);
        if (slot) {
          slot.keyId = null;
        }
      }
      appendEvent(draft, {
        cabinetId: input.cabinetId,
        actorId: user.id,
        type: 'keys_cleared',
        reversible: false,
        summaryData: {
          batchId,
          keyCount: keys.length,
          recoverableUntil,
        },
      });
      touchCabinet(draft, input.cabinetId);
      return batch;
    });

  const restoreClearBatch: MockAppActions['restoreClearBatch'] = async (input) =>
    commit('restore-clear-batch', input, (draft, user) => {
      const batch = draft.clearBatches.find((candidate) => candidate.id === input.batchId);
      assertMock(batch, 'CLEAR_BATCH_NOT_FOUND');
      assertMember(draft, batch.cabinetId, user.id);
      assertMock(batch.status !== 'restored', 'CLEAR_BATCH_ALREADY_RESTORED');
      assertMock(
        batch.status === 'restorable' && Date.parse(draft.now) <= Date.parse(batch.recoverableUntil),
        'CLEAR_BATCH_EXPIRED',
      );
      for (const mapping of batch.slotKeyMap) {
        const slot = draft.slots.find((candidate) => candidate.id === mapping.slotId);
        assertMock(slot, 'SLOT_NOT_FOUND');
        assertMock(!slot.keyId || slot.keyId === mapping.keyId, 'RESTORE_CONFLICT', {
          slotId: mapping.slotId,
        });
      }
      for (const snapshot of batch.keySnapshots) {
        const index = draft.keys.findIndex((candidate) => candidate.id === snapshot.id);
        const restored = { ...clone(snapshot), updatedAt: draft.now };
        if (index >= 0) {
          draft.keys[index] = restored;
        } else {
          draft.keys.push(restored);
        }
        const slot = draft.slots.find((candidate) => candidate.id === snapshot.slotId);
        assertMock(slot, 'SLOT_NOT_FOUND');
        slot.keyId = snapshot.id;
      }
      batch.status = 'restored';
      batch.restoredAt = draft.now;
      appendEvent(draft, {
        cabinetId: batch.cabinetId,
        actorId: user.id,
        type: 'keys_restored',
        reversible: false,
        summaryData: { batchId: batch.id, keyCount: batch.keySnapshots.length },
      });
      touchCabinet(draft, batch.cabinetId);
      return batch;
    });

  const exportCabinetLog: MockAppActions['exportCabinetLog'] = async (input) => {
    const user = assertSession();
    const membership = assertMember(state, input.cabinetId, user.id);
    if (input.includeFullContact) {
      assertMock(
        membership.role === 'owner' || membership.role === 'admin',
        'EXPORT_FULL_CONTACT_FORBIDDEN',
      );
    }
    const selectors = createMockSelectors(state);
    const rows = selectors.logRows(
      { ...input.filter, cabinetId: input.cabinetId },
      input.includeFullContact ?? false,
    );
    return generateExportArtifact({
      cabinetId: input.cabinetId,
      format: input.format,
      rows,
      generatedAt: state.now,
      fontBytes: input.fontBytes,
    });
  };

  const downloadCabinetLog: MockAppActions['downloadCabinetLog'] = async (input) =>
    saveExportArtifact(await exportCabinetLog(input));

  const switchAccount: MockAppActions['switchAccount'] = async ({ userId }) => {
    const user = state.users.find(
      (candidate) => candidate.id === userId && candidate.status === 'active',
    );
    assertMock(user, 'USER_NOT_FOUND');
    await replaceState({
      ...state,
      currentUserId: user.id,
      sessionStatus: 'authenticated',
    });
    return clone(user);
  };

  const setOnline: MockAppActions['setOnline'] = async ({ online }) => {
    await replaceState({ ...state, online });
  };

  const expireSession = async () => {
    await replaceState({ ...state, currentUserId: null, sessionStatus: 'expired' });
  };

  const advanceTime: MockAppActions['advanceTime'] = async ({ days = 0, milliseconds = 0 }) => {
    const increment = days * DAY_MS + milliseconds;
    assertMock(Number.isFinite(increment) && increment >= 0, 'INVALID_INPUT');
    const now = new Date(Date.parse(state.now) + increment).toISOString();
    const draft = clone(state);
    draft.now = now;
    for (const batch of draft.clearBatches) {
      if (batch.status === 'restorable' && Date.parse(now) > Date.parse(batch.recoverableUntil)) {
        batch.status = 'expired';
      }
    }
    await replaceState(draft);
    return now;
  };

  const resetData = async () => {
    const previousUserId = state.currentUserId;
    requestResults.clear();
    resetChallenges.clear();
    resetTokens.clear();
    transientPasswords.clear();
    await clearStateOverlay(storage);
    const next = createInitialMockState({
      currentUserId: previousUserId,
      hydrated: true,
    });
    if (previousUserId && !next.users.some((user) => user.id === previousUserId)) {
      next.currentUserId = null;
      next.sessionStatus = 'anonymous';
    }
    await replaceState(next);
  };

  const actions: MockAppActions = {
    hydrate,
    signIn,
    register,
    signOut,
    requestPasswordReset,
    getPasswordResetPreview,
    verifyReset,
    resetPassword,
    changePassword,
    deleteAccount,
    setMarketingConsent,
    resolveQr,
    bindCabinet,
    removeMember,
    setMemberRole,
    transferOwnership,
    addKey,
    updateKey,
    checkOutKey,
    returnKey,
    undoEvent,
    clearCabinetKeys,
    restoreClearBatch,
    exportCabinetLog,
    downloadCabinetLog,
    saveExport: saveExportArtifact,
    switchAccount,
    setOnline,
    expireSession,
    advanceTime,
    resetData,
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions,
  };
}
