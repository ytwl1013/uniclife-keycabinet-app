import { assertMock, MockAppError } from './errors';
import { developerToolsEnabled as defaultDeveloperToolsEnabled } from './developer-tools';
import { parseCabinetQrPayload } from './qr-payload';
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
  Cabinet,
  CabinetEvent,
  CabinetMembership,
  CheckOutKeyInput,
  ConsentKind,
  Key,
  MockAppState,
  MockStorage,
  QrResolution,
  RegisterInput,
  RenameCabinetInput,
  ReturnKeyInput,
  UpdateKeyInput,
  UserAccount,
  WriteOptions,
  supportedLocales,
} from './types';

const LEGAL_POLICY_VERSION = 'legal-draft-2026-07';

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
  updateProfile(input: { displayName: string; avatarUri?: string | null } & WriteOptions): Promise<UserAccount>;
  updateEmail(input: { email: string } & WriteOptions): Promise<UserAccount>;
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  deleteAccount(input?: WriteOptions): Promise<void>;
  resolveQr(input: { code: string } | string): Promise<QrResolution>;
  bindCabinet(input: { qrCode: string; name?: string } & WriteOptions): Promise<BindCabinetResult>;
  renameCabinet(input: RenameCabinetInput): Promise<Cabinet>;
  removeMember(input: { cabinetId: string; membershipId: string } & WriteOptions): Promise<void>;
  addKey(input: AddKeyInput): Promise<Key>;
  updateKey(input: UpdateKeyInput): Promise<Key>;
  deleteKey(input: { keyId: string } & WriteOptions): Promise<void>;
  checkOutKey(input: CheckOutKeyInput): Promise<{ key: Key; event: CabinetEvent }>;
  returnKey(input: ReturnKeyInput): Promise<{ key: Key; event: CabinetEvent }>;
  deleteCabinetKeys(input: { cabinetId: string } & WriteOptions): Promise<{ deletedCount: number }>;
  switchAccount(input: { userId: string }): Promise<UserAccount>;
  setOnline(input: { online: boolean }): Promise<void>;
  expireSession(): Promise<void>;
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
  now?: () => Date;
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
  const now = options.now ?? (() => new Date());
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
    return assertMember(draft, cabinetId, userId);
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
      draft.now = now().toISOString();
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
      state = overlay
        ? { ...overlay, hydrated: true, now: now().toISOString() }
        : { ...state, hydrated: true, now: now().toISOString() };
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
    assertMock(developerToolsEnabled, 'PERMISSION_DENIED');
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

  const updateProfile: MockAppActions['updateProfile'] = async (input) => {
    return commit('update-profile', omitWriteOptions(input), (draft, user) => {
      const displayName = input.displayName.trim();
      assertMock(displayName.length > 0, 'INVALID_INPUT');
      const account = draft.users.find((candidate) => candidate.id === user.id);
      assertMock(account, 'USER_NOT_FOUND');
      account.displayName = displayName;
      if (input.avatarUri !== undefined) {
        const avatarUri = input.avatarUri?.trim();
        if (avatarUri) {
          account.avatarUri = avatarUri;
        } else {
          delete account.avatarUri;
        }
      }
      return account;
    });
  };

  const updateEmail: MockAppActions['updateEmail'] = async (input) => {
    return commit('update-email', omitWriteOptions(input), (draft, user) => {
      const email = normalizedEmail(input.email);
      assertMock(isEmail(email), 'INVALID_INPUT');
      assertMock(
        !draft.users.some(
          (candidate) =>
            candidate.id !== user.id && candidate.email.toLowerCase() === email,
        ),
        'EMAIL_ALREADY_REGISTERED',
      );
      const account = draft.users.find((candidate) => candidate.id === user.id);
      assertMock(account, 'USER_NOT_FOUND');
      account.email = email;
      return account;
    });
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
      delete account.avatarUri;
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
    const parsed = parseCabinetQrPayload(code);
    assertMock(parsed, 'QR_NOT_FOUND');
    const sku = state.skus.find((candidate) => candidate.sku === parsed.sku);
    assertMock(sku, 'SKU_NOT_FOUND');
    const qr = state.qrs.find(
      (candidate) =>
        candidate.code === parsed.canonical &&
        candidate.skuId === sku.id &&
        candidate.deviceUuid === parsed.uuid,
    );
    assertMock(qr, 'QR_NOT_FOUND');
    assertMock(qr.status === 'active', 'QR_DISABLED');
    const cabinet = state.cabinets.find(
      (candidate) =>
        candidate.skuId === sku.id && candidate.deviceUuid === qr.deviceUuid,
    );
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
    const parsed = parseCabinetQrPayload(input.qrCode);
    assertMock(parsed, 'QR_NOT_FOUND');
    const sku = state.skus.find((candidate) => candidate.sku === parsed.sku);
    assertMock(sku, 'SKU_NOT_FOUND');
    const qr = state.qrs.find(
      (candidate) =>
        candidate.code === parsed.canonical &&
        candidate.skuId === sku.id &&
        candidate.deviceUuid === parsed.uuid,
    );
    assertMock(qr, 'QR_NOT_FOUND');
    assertMock(qr.status === 'active', 'QR_DISABLED');
    const existingCabinet = state.cabinets.find(
      (candidate) =>
        candidate.skuId === sku.id && candidate.deviceUuid === qr.deviceUuid,
    );
    const existing = existingCabinet
      ? state.memberships.find(
          (membership) =>
            membership.cabinetId === existingCabinet.id &&
            membership.userId === user.id &&
            membership.active,
        )
      : undefined;
    if (existing && existingCabinet) {
      return clone({ cabinet: existingCabinet, membership: existing });
    }
    return commit('bind-cabinet', omitWriteOptions(input), (draft, currentUser) => {
      const draftSku = draft.skus.find((candidate) => candidate.sku === parsed.sku);
      const draftQr = draft.qrs.find(
        (candidate) =>
          candidate.code === parsed.canonical &&
          candidate.skuId === draftSku?.id &&
          candidate.deviceUuid === parsed.uuid,
      );
      assertMock(draftSku, 'SKU_NOT_FOUND');
      assertMock(draftQr, 'QR_NOT_FOUND');
      let cabinet = draft.cabinets.find(
        (candidate) =>
          candidate.skuId === draftSku.id && candidate.deviceUuid === draftQr.deviceUuid,
      );
      if (!cabinet) {
        const cabinetId = id('cabinet');
        cabinet = {
          id: cabinetId,
          skuId: draftSku.id,
          deviceUuid: draftQr.deviceUuid,
          name: input.name?.trim() || draftSku.name,
          location: '',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          status: 'online',
          lastSyncedAt: draft.now,
          createdAt: draft.now,
          version: 0,
        };
        draft.cabinets.push(cabinet);
        for (let position = 1; position <= draftSku.capacity; position += 1) {
          draft.slots.push({
            id: id('slot'),
            cabinetId,
            position,
            keyId: null,
          });
        }
      }
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
      if (!hasMembers && input.name !== undefined) {
        assertMock(input.name.trim().length > 0, 'INVALID_INPUT');
        cabinet.name = input.name.trim();
      }
      const membership: CabinetMembership = previousMembership ?? {
        id: id('membership'),
        cabinetId: cabinet.id,
        userId: currentUser.id,
        role: 'admin',
        active: true,
        joinedAt: draft.now,
      };
      if (previousMembership) {
        previousMembership.active = true;
        previousMembership.joinedAt = draft.now;
        previousMembership.role = 'admin';
        delete previousMembership.removedAt;
      } else {
        draft.memberships.push(membership);
      }
      appendEvent(draft, {
        cabinetId: cabinet.id,
        actorId: currentUser.id,
        type: 'cabinet_bound',
        reversible: false,
        summaryData: {
          membershipId: membership.id,
          role: membership.role,
          sku: draftSku.sku,
          deviceUuid: draftQr.deviceUuid,
        },
      });
      touchCabinet(draft, cabinet.id);
      return { cabinet, membership };
    });
  };

  const renameCabinet: MockAppActions['renameCabinet'] = async (input) =>
    commit('rename-cabinet', input, (draft, user) => {
      assertManager(draft, input.cabinetId, user.id);
      assertMock(input.name.trim().length > 0, 'INVALID_INPUT');
      const cabinet = draft.cabinets.find((candidate) => candidate.id === input.cabinetId);
      assertMock(cabinet, 'CABINET_NOT_FOUND');
      const previousName = cabinet.name;
      cabinet.name = input.name.trim();
      appendEvent(draft, {
        cabinetId: cabinet.id,
        actorId: user.id,
        type: 'cabinet_renamed',
        reversible: false,
        summaryData: { previousName, nextName: cabinet.name },
      });
      touchCabinet(draft, cabinet.id);
      return cabinet;
    });

  const removeMember: MockAppActions['removeMember'] = async (input) =>
    commit('remove-member', input, (draft, user) => {
      assertManager(draft, input.cabinetId, user.id);
      const target = draft.memberships.find(
        (membership) =>
          membership.id === input.membershipId &&
          membership.cabinetId === input.cabinetId &&
          membership.active,
      );
      assertMock(target, 'MEMBER_NOT_FOUND');
      assertMock(target.userId !== user.id, 'PERMISSION_DENIED');
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

  const deleteKey: MockAppActions['deleteKey'] = async (input) =>
    commit('delete-key', input, (draft, user) => {
      const key = draft.keys.find((candidate) => candidate.id === input.keyId);
      assertMock(key, 'KEY_NOT_FOUND');
      assertManager(draft, key.cabinetId, user.id);
      assertMock(
        !draft.loans.some((loan) => loan.keyId === key.id && loan.status === 'active'),
        'ACTIVE_LOANS_BLOCK_CLEAR',
      );
      const slot = draft.slots.find((candidate) => candidate.id === key.slotId);
      if (slot) slot.keyId = null;
      draft.keys = draft.keys.filter((candidate) => candidate.id !== key.id);
      appendEvent(draft, {
        cabinetId: key.cabinetId,
        keyId: key.id,
        actorId: user.id,
        type: 'key_deleted',
        reversible: false,
        summaryData: { keyName: key.name, slotId: key.slotId },
      });
      touchCabinet(draft, key.cabinetId);
    });

  const checkOutKey: MockAppActions['checkOutKey'] = async (input) =>
    commit('checkout-key', input, (draft, user) => {
      const key = draft.keys.find((candidate) => candidate.id === input.keyId);
      assertMock(key, 'KEY_NOT_FOUND');
      assertMember(draft, key.cabinetId, user.id);
      assertMock(key.status === 'available', 'KEY_NOT_AVAILABLE');
      assertMock(input.borrowerName.trim().length > 0, 'INVALID_INPUT');
      const checkedOutAt = input.checkedOutAt ?? draft.now;
      assertMock(Number.isFinite(Date.parse(checkedOutAt)), 'INVALID_INPUT');
      if (input.expectedReturnAt) {
        assertMock(
          Number.isFinite(Date.parse(input.expectedReturnAt)) &&
            Date.parse(input.expectedReturnAt) > Date.parse(checkedOutAt),
          'EXPECTED_RETURN_INVALID',
        );
      }
      const loanId = id('loan');
      const event = appendEvent(draft, {
        cabinetId: key.cabinetId,
        keyId: key.id,
        actorId: user.id,
        type: 'checkout',
        occurredAt: checkedOutAt,
        reversible: false,
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
        reversible: false,
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

  const deleteCabinetKeys: MockAppActions['deleteCabinetKeys'] = async (input) =>
    commit('delete-cabinet-keys', input, (draft, user) => {
      assertManager(draft, input.cabinetId, user.id);
      const keys = draft.keys.filter((key) => key.cabinetId === input.cabinetId);
      assertMock(keys.length > 0, 'NO_KEYS_TO_CLEAR');
      const deletedIds = new Set(keys.map((key) => key.id));
      for (const key of keys) {
        const slot = draft.slots.find((candidate) => candidate.id === key.slotId);
        if (slot) slot.keyId = null;
      }
      draft.keys = draft.keys.filter((key) => !deletedIds.has(key.id));
      appendEvent(draft, {
        cabinetId: input.cabinetId,
        actorId: user.id,
        type: 'keys_deleted',
        reversible: false,
        summaryData: { keyCount: keys.length },
      });
      touchCabinet(draft, input.cabinetId);
      return { deletedCount: keys.length };
    });

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
    updateProfile,
    updateEmail,
    changePassword,
    deleteAccount,
    resolveQr,
    bindCabinet,
    renameCabinet,
    removeMember,
    addKey,
    updateKey,
    deleteKey,
    checkOutKey,
    returnKey,
    deleteCabinetKeys,
    switchAccount,
    setOnline,
    expireSession,
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
