import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { backendApi } from '@/api/backend';
import { ApiError, isApiError, isNetworkApiError } from '@/api/client';
import {
  loadLocalProfileAvatar,
  removeLocalProfileAvatar,
  saveLocalProfileAvatar,
} from '@/api/profile-avatar-storage';
import {
  clearRegisteredPushToken,
  loadRegisteredPushToken,
} from '@/api/push-token-storage';
import {
  clearSessionToken,
  loadSessionToken,
  saveSessionToken,
} from '@/api/session-token';
import {
  clearSessionUser,
  loadSessionUser,
  saveSessionUser,
} from '@/api/session-user-storage';
import {
  clearOfflineWorkspace,
  loadOfflineOutbox,
  loadOfflineMode,
  loadOfflineServerWorkspaceSnapshot,
  loadOfflineWorkspaceSnapshot,
  saveOfflineOutbox,
  saveOfflineMode,
  saveOfflineServerWorkspaceSnapshot,
  saveOfflineWorkspaceSnapshot,
  snapshotFromState,
  stateFromOfflineSnapshot,
  type OfflineOperation,
  type OfflineWorkspaceSnapshot,
} from '@/api/offline-storage';
import { getNetworkStateAsync } from 'expo-network';

import { uniqueById } from './collections';
import { AppSelectors, createAppSelectors } from './selectors';
import type {
  AddKeyRequest,
  CabinetEvent,
  CheckoutKeyRequest,
  Key,
  Loan,
  ReturnKeyRequest,
  UpdateKeyRequest,
  WriteOptions,
} from '@uniclife/shared';
import type {
  AppActions,
  AppState,
  CabinetAccessResult,
  CurrentUserAccount,
  QrResolution,
} from './types';

export type AppContextValue = {
  state: AppState;
  currentUser: CurrentUserAccount | null;
  actions: AppActions;
  selectors: AppSelectors;
};

const emptyState = (): AppState => ({
  hydrated: false,
  currentUserId: null,
  currentUser: null,
  sessionStatus: 'anonymous',
  online: true,
  offlineMode: false,
  offlineSyncStatus: 'idle',
  offlineSnapshotAt: null,
  offlinePendingCount: 0,
  offlineConflictCount: 0,
  now: new Date().toISOString(),
  version: 0,
  users: [],
  skus: [],
  qrs: [],
  cabinets: [],
  memberships: [],
  slots: [],
  keys: [],
  loans: [],
  events: [],
  feedbackThreads: [],
});

const AppContext = createContext<AppContextValue | null>(null);
const SESSION_RESTORE_TIMEOUT_MS = 4_000;

function isSessionError(error: unknown): boolean {
  return isApiError(error) &&
    (error.status === 401 || error.code === 'SESSION_REQUIRED' || error.code === 'SESSION_EXPIRED');
}

async function withLocalProfileAvatar(
  user: CurrentUserAccount,
): Promise<CurrentUserAccount> {
  const { avatarUri: _remoteAvatarUri, ...userWithoutAvatar } = user;
  const avatarUri = await loadLocalProfileAvatar(user.id);
  return avatarUri ? { ...userWithoutAvatar, avatarUri } : userWithoutAvatar;
}

function offlineOperationId(prefix: string): string {
  return `offline-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isOfflineWriteAllowed(state: AppState, cabinetId: string, userId: string): boolean {
  const members = state.memberships.filter(
    (membership) => membership.cabinetId === cabinetId && membership.active,
  );
  return members.length === 1 && members[0]?.userId === userId;
}

function bumpLocalCabinet(state: AppState, cabinetId: string): AppState {
  return {
    ...state,
    cabinets: state.cabinets.map((cabinet) =>
      cabinet.id === cabinetId
        ? { ...cabinet, version: cabinet.version + 1 }
        : cabinet,
    ),
    version: state.version + 1,
  };
}

function applyOfflineOperation(
  state: AppState,
  operation: OfflineOperation,
): {
  state: AppState;
  key?: Key;
  event?: CabinetEvent;
  cabinet?: AppState['cabinets'][number];
} {
  const occurredAt = operation.createdAt;
  if (operation.type === 'add_key') {
    const slot = state.slots.find((candidate) => candidate.id === operation.input.slotId);
    if (!slot || slot.cabinetId !== operation.cabinetId) {
      throw new ApiError(404, 'SLOT_NOT_FOUND', '槽位不存在');
    }
    if (slot.keyId) {
      throw new ApiError(409, 'SLOT_OCCUPIED', '该槽位已有钥匙');
    }
    const keyId = `local-key-${operation.id}`;
    const key: Key = {
      id: keyId,
      cabinetId: operation.cabinetId,
      slotId: slot.id,
      name: operation.input.name,
      note: operation.input.note ?? '',
      status: 'available',
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    const event: CabinetEvent = {
      id: `local-event-${operation.id}`,
      cabinetId: operation.cabinetId,
      keyId,
      actorId: operation.actorUserId,
      type: 'key_added',
      occurredAt,
      reversible: false,
      summaryData: { keyName: key.name, slotId: slot.id, position: slot.position },
    };
    const nextState = bumpLocalCabinet({
      ...state,
      slots: state.slots.map((candidate) => candidate.id === slot.id ? { ...candidate, keyId } : candidate),
      keys: uniqueById([key, ...state.keys]),
      events: uniqueById([event, ...state.events]),
    }, operation.cabinetId);
    return { state: nextState, key, event };
  }

  if (operation.type === 'rename_cabinet') {
    const cabinet = state.cabinets.find((candidate) => candidate.id === operation.cabinetId);
    if (!cabinet) throw new ApiError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
    const nextState = bumpLocalCabinet({
      ...state,
      cabinets: state.cabinets.map((candidate) =>
        candidate.id === operation.cabinetId
          ? { ...candidate, name: operation.input.name }
          : candidate,
      ),
    }, operation.cabinetId);
    return {
      state: nextState,
      cabinet: nextState.cabinets.find((candidate) => candidate.id === operation.cabinetId),
    };
  }

  if (operation.type === 'delete_cabinet_keys') {
    const cabinet = state.cabinets.find((candidate) => candidate.id === operation.cabinetId);
    if (!cabinet) throw new ApiError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
    if (state.loans.some((loan) => loan.cabinetId === operation.cabinetId && loan.status === 'active')) {
      throw new ApiError(409, 'ACTIVE_LOANS_BLOCK_CLEAR', '请先归还正在借用的钥匙');
    }
    const keyIds = new Set(state.keys.filter((key) => key.cabinetId === operation.cabinetId).map((key) => key.id));
    const nextState = bumpLocalCabinet({
      ...state,
      keys: state.keys.filter((key) => key.cabinetId !== operation.cabinetId),
      slots: state.slots.map((slot) => slot.cabinetId === operation.cabinetId ? { ...slot, keyId: null } : slot),
      loans: state.loans.filter((loan) => !keyIds.has(loan.keyId)),
    }, operation.cabinetId);
    return { state: nextState };
  }

  if (operation.type === 'delete_cabinet') {
    const cabinet = state.cabinets.find((candidate) => candidate.id === operation.cabinetId);
    if (!cabinet) throw new ApiError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
    if (state.loans.some((loan) => loan.cabinetId === operation.cabinetId && loan.status === 'active')) {
      throw new ApiError(409, 'ACTIVE_LOANS_BLOCK_DELETE', '请先归还正在借用的钥匙');
    }
    const keyIds = new Set(state.keys.filter((key) => key.cabinetId === operation.cabinetId).map((key) => key.id));
    const nextState = {
      ...state,
      cabinets: state.cabinets.filter((candidate) => candidate.id !== operation.cabinetId),
      memberships: state.memberships.filter((membership) => membership.cabinetId !== operation.cabinetId),
      slots: state.slots.filter((slot) => slot.cabinetId !== operation.cabinetId),
      keys: state.keys.filter((key) => key.cabinetId !== operation.cabinetId),
      loans: state.loans.filter((loan) => loan.cabinetId !== operation.cabinetId && !keyIds.has(loan.keyId)),
      events: state.events.filter((event) => event.cabinetId !== operation.cabinetId),
      version: state.version + 1,
    };
    return { state: nextState };
  }

  const key = state.keys.find((candidate) => candidate.id === operation.keyId);
  if (!key) throw new ApiError(404, 'KEY_NOT_FOUND', '钥匙不存在');

  if (operation.type === 'update_key') {
    const nextKey = {
      ...key,
      ...(operation.input.name !== undefined ? { name: operation.input.name } : {}),
      ...(operation.input.note !== undefined ? { note: operation.input.note } : {}),
      updatedAt: occurredAt,
    };
    const nextState = bumpLocalCabinet({
      ...state,
      keys: state.keys.map((candidate) => candidate.id === key.id ? nextKey : candidate),
    }, operation.cabinetId);
    return { state: nextState, key: nextKey };
  }

  if (operation.type === 'delete_key') {
    const activeLoan = state.loans.find(
      (candidate) => candidate.keyId === key.id && candidate.status === 'active',
    );
    if (activeLoan) {
      throw new ApiError(409, 'ACTIVE_LOANS_BLOCK_CLEAR', '请先归还该钥匙');
    }
    const event: CabinetEvent = {
      id: `local-event-${operation.id}`,
      cabinetId: operation.cabinetId,
      keyId: key.id,
      actorId: operation.actorUserId,
      type: 'key_deleted',
      occurredAt,
      reversible: false,
      summaryData: { keyName: key.name, slotId: key.slotId },
    };
    const nextState = bumpLocalCabinet({
      ...state,
      keys: state.keys.filter((candidate) => candidate.id !== key.id),
      slots: state.slots.map((candidate) => candidate.id === key.slotId ? { ...candidate, keyId: null } : candidate),
      events: uniqueById([event, ...state.events]),
    }, operation.cabinetId);
    return { state: nextState, event };
  }

  if (operation.type === 'checkout') {
    if (key.status !== 'available') {
      throw new ApiError(409, 'KEY_NOT_AVAILABLE', '钥匙当前不可领取');
    }
    const event: CabinetEvent = {
      id: `local-event-${operation.id}`,
      cabinetId: operation.cabinetId,
      keyId: key.id,
      actorId: operation.actorUserId,
      type: 'checkout',
      occurredAt,
      reversible: false,
      relatedLoanId: `local-loan-${operation.id}`,
      summaryData: {
        borrowerName: operation.input.borrowerName,
        keyName: key.name,
      },
    };
    const loan: Loan = {
      id: `local-loan-${operation.id}`,
      cabinetId: operation.cabinetId,
      keyId: key.id,
      borrowerName: operation.input.borrowerName,
      borrowerContact: operation.input.borrowerContact,
      checkedOutAt: operation.input.checkedOutAt ?? occurredAt,
      expectedReturnAt: operation.input.expectedReturnAt,
      status: 'active',
      operatorId: operation.actorUserId,
      checkoutEventId: event.id,
    };
    const nextKey = { ...key, status: 'borrowed' as const, updatedAt: occurredAt };
    const nextState = bumpLocalCabinet({
      ...state,
      keys: state.keys.map((candidate) => candidate.id === key.id ? nextKey : candidate),
      loans: uniqueById([loan, ...state.loans]),
      events: uniqueById([event, ...state.events]),
    }, operation.cabinetId);
    return { state: nextState, key: nextKey, event };
  }

  const loan = state.loans.find(
    (candidate) => candidate.keyId === key.id && candidate.status === 'active',
  );
  if (!loan) throw new ApiError(409, 'NO_ACTIVE_LOAN', '该钥匙没有正在进行的借用');
  const event: CabinetEvent = {
    id: `local-event-${operation.id}`,
    cabinetId: operation.cabinetId,
    keyId: key.id,
    actorId: operation.actorUserId,
    type: 'return',
    occurredAt,
    reversible: false,
    relatedLoanId: loan.id,
    summaryData: { keyName: key.name },
  };
  const returnedAt = operation.input.returnedAt ?? occurredAt;
  const nextLoan: Loan = {
    ...loan,
    status: 'returned',
    returnedAt,
    returnOperatorId: operation.actorUserId,
    returnEventId: event.id,
  };
  const nextKey = { ...key, status: 'available' as const, updatedAt: returnedAt };
  const nextState = bumpLocalCabinet({
    ...state,
    keys: state.keys.map((candidate) => candidate.id === key.id ? nextKey : candidate),
    loans: state.loans.map((candidate) => candidate.id === loan.id ? nextLoan : candidate),
    events: uniqueById([event, ...state.events]),
  }, operation.cabinetId);
  return { state: nextState, key: nextKey, event };
}

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(emptyState);
  const stateRef = useRef(state);
  const tokenRef = useRef<string | null>(null);
  const lastSuccessfulRefreshAtRef = useRef(0);
  const latestRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const hydratePromiseRef = useRef<Promise<void> | null>(null);
  const offlineOverrideRef = useRef(false);
  const offlineModeRef = useRef(false);
  const pendingRefreshCountRef = useRef(0);
  const refreshQueueRef = useRef<Promise<void>>(Promise.resolve());
  const offlineSyncPromiseRef = useRef<Promise<void> | null>(null);
  const resetPreviewCodes = useRef(new Map<string, string>());
  const locallyReadSupportAtRef = useRef(new Map<string, string>());

  const updateState = useCallback((update: (current: AppState) => AppState) => {
    setState((current) => {
      const next = update(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const restoreOfflineWorkspace = useCallback(async (
    user: CurrentUserAccount,
  ): Promise<OfflineWorkspaceSnapshot | null> => {
    const [snapshot, outbox, offlineMode] = await Promise.all([
      loadOfflineWorkspaceSnapshot(user.id).catch(() => null),
      loadOfflineOutbox(user.id).catch(() => []),
      loadOfflineMode(user.id).catch(() => false),
    ]);
    updateState((current) => {
      const restored = snapshot ? stateFromOfflineSnapshot(current, snapshot) : current;
      return {
        ...restored,
        hydrated: true,
        currentUserId: user.id,
        currentUser: user,
        sessionStatus: 'authenticated',
        online: false,
        offlineMode,
        offlineSyncStatus: outbox.some((operation) => operation.status === 'conflict') ? 'conflict' : 'idle',
        offlineSnapshotAt: snapshot?.syncedAt ?? restored.offlineSnapshotAt,
        offlinePendingCount: outbox.filter((operation) => operation.status === 'pending').length,
        offlineConflictCount: outbox.filter((operation) => operation.status === 'conflict').length,
        now: new Date().toISOString(),
        users: uniqueById([user, ...restored.users]),
        version: restored.version + 1,
      };
    });
    offlineModeRef.current = offlineMode;
    return snapshot;
  }, [updateState]);

  const persistOfflineSnapshot = useCallback(async (nextState: AppState, userId: string) => {
    await saveOfflineWorkspaceSnapshot(
      userId,
      snapshotFromState(nextState, nextState.offlineSnapshotAt ?? nextState.now),
    ).catch(() => undefined);
  }, []);

  const persistRemoteSnapshot = useCallback(async (nextState: AppState, userId: string) => {
    const snapshot = snapshotFromState(
      nextState,
      nextState.offlineSnapshotAt ?? nextState.now,
    );
    await Promise.all([
      saveOfflineWorkspaceSnapshot(userId, snapshot),
      saveOfflineServerWorkspaceSnapshot(userId, snapshot),
    ]).catch(() => undefined);
  }, []);

  const updateOfflineQueueCounts = useCallback(async (userId: string) => {
    const outbox = await loadOfflineOutbox(userId).catch(() => []);
    updateState((current) => ({
      ...current,
      offlinePendingCount: outbox.filter((operation) => operation.status === 'pending').length,
      offlineConflictCount: outbox.filter((operation) => operation.status === 'conflict').length,
    }));
    return outbox;
  }, [updateState]);

  const clearAuthentication = useCallback(async (expired = false) => {
    const previousUserId = stateRef.current.currentUserId;
    tokenRef.current = null;
    lastSuccessfulRefreshAtRef.current = 0;
    offlineOverrideRef.current = false;
    offlineModeRef.current = false;
    locallyReadSupportAtRef.current.clear();
    await clearSessionToken();
    await clearSessionUser();
    await clearRegisteredPushToken();
    if (previousUserId) await clearOfflineWorkspace(previousUserId).catch(() => undefined);
    updateState((current) => ({
      ...emptyState(),
      hydrated: true,
      online: current.online,
      sessionStatus: expired ? 'expired' : 'anonymous',
      version: current.version + 1,
    }));
  }, [updateState]);

  const loadWorkspace = useCallback(async (token: string, currentUser: CurrentUserAccount) => {
    await saveSessionUser(currentUser).catch(() => undefined);
    const persistedOfflineMode = await loadOfflineMode(currentUser.id).catch(() => false);
    const persistedOutbox = await loadOfflineOutbox(currentUser.id).catch(() => []);
    const persistedPendingCount = persistedOutbox.filter((operation) => operation.status === 'pending').length;
    const persistedConflictCount = persistedOutbox.filter((operation) => operation.status === 'conflict').length;
    offlineModeRef.current = persistedOfflineMode;
    let summaries;
    try {
      summaries = await backendApi.listCabinets(token);
    } catch (error) {
      if (isSessionError(error)) throw error;
      await restoreOfflineWorkspace(currentUser);
      return;
    }

    const detailRequests = summaries.map(({ cabinet }) =>
      backendApi.getCabinet(token, cabinet.id),
    );
    const [detailResults, loansResult, eventsResult, feedbackResult] = await Promise.all([
      Promise.allSettled(detailRequests),
      backendApi.listLoans(token).then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason: unknown) => ({ status: 'rejected', reason }) as const,
      ),
      backendApi.listEvents(token).then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason: unknown) => ({ status: 'rejected', reason }) as const,
      ),
      backendApi.listFeedbackHistory(token).then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason: unknown) => ({ status: 'rejected', reason }) as const,
      ),
    ]);
    const failures = [
      ...detailResults.flatMap((result) => result.status === 'rejected' ? [result.reason] : []),
      ...(loansResult.status === 'rejected' ? [loansResult.reason] : []),
      ...(eventsResult.status === 'rejected' ? [eventsResult.reason] : []),
      ...(feedbackResult.status === 'rejected' ? [feedbackResult.reason] : []),
    ];
    const sessionFailure = failures.find(isSessionError);
    if (sessionFailure) throw sessionFailure;

    const details = detailResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failedDetailCabinetIds = new Set(
      detailResults.flatMap((result, index) =>
        result.status === 'rejected' ? [summaries[index]!.cabinet.id] : [],
      ),
    );
    const previous = stateRef.current;
    const retainedMemberships = previous.memberships.filter((membership) =>
      failedDetailCabinetIds.has(membership.cabinetId),
    );
    const retainedMemberUsers = retainedMemberships.flatMap((membership) => {
      const user = previous.users.find((candidate) => candidate.id === membership.userId);
      return user ? [user] : [];
    });
    const memberships = [
      ...details.flatMap((detail) => detail.members.map(({ membership }) => membership)),
      ...retainedMemberships,
    ];
    const memberUsers = [
      ...details.flatMap((detail) => detail.members.map(({ user }) => user)),
      ...retainedMemberUsers,
    ];
    const currentCabinetIds = new Set(summaries.map(({ cabinet }) => cabinet.id));
    const retainedQrs = previous.qrs;

    const refreshedAt = Date.now();
    const refreshedAtIso = new Date(refreshedAt).toISOString();
    if (failures.length === 0) lastSuccessfulRefreshAtRef.current = refreshedAt;
    let nextState: AppState = stateRef.current;
    updateState((current) => {
      nextState = {
      hydrated: true,
      currentUserId: currentUser.id,
      currentUser,
      sessionStatus: 'authenticated',
      online: failures.length === 0,
      offlineMode: persistedOfflineMode,
      offlineSyncStatus: persistedConflictCount > 0
        ? 'conflict'
        : current.offlineSyncStatus === 'success' && persistedPendingCount === 0
          ? 'success'
          : current.offlineSyncStatus === 'syncing' && persistedPendingCount > 0
            ? 'syncing'
            : 'idle',
      offlineSnapshotAt: failures.length === 0
        ? refreshedAtIso
        : current.offlineSnapshotAt,
      offlinePendingCount: persistedPendingCount,
      offlineConflictCount: persistedConflictCount,
      now: refreshedAtIso,
      version: current.version + 1,
      users: uniqueById([
        currentUser,
        ...memberUsers,
        ...(eventsResult.status === 'fulfilled' ? eventsResult.value.actors : []),
      ]),
      skus: uniqueById(summaries.map(({ sku }) => sku)),
      qrs: retainedQrs,
      cabinets: summaries.map(({ cabinet }) => cabinet),
      memberships: uniqueById(memberships),
      slots: uniqueById([
        ...details.flatMap((detail) => detail.slots),
        ...previous.slots.filter((slot) => failedDetailCabinetIds.has(slot.cabinetId)),
      ]),
      keys: uniqueById([
        ...details.flatMap((detail) => detail.keys),
        ...previous.keys.filter((key) => failedDetailCabinetIds.has(key.cabinetId)),
      ]),
      loans: loansResult.status === 'fulfilled'
        ? loansResult.value.items
        : previous.loans.filter((loan) => currentCabinetIds.has(loan.cabinetId)),
      events: eventsResult.status === 'fulfilled'
        ? eventsResult.value.items
        : previous.events.filter((event) => currentCabinetIds.has(event.cabinetId)),
      feedbackThreads: (feedbackResult.status === 'fulfilled'
        ? feedbackResult.value.items
        : previous.feedbackThreads).map((thread) => {
        const locallyReadAt = locallyReadSupportAtRef.current.get(thread.id);
        if (
          locallyReadAt &&
          thread.latestSupportMessageAt &&
          Date.parse(thread.latestSupportMessageAt) <= Date.parse(locallyReadAt)
        ) {
          return { ...thread, unreadMessageCount: 0 };
        }
        if (locallyReadAt && thread.latestSupportMessageAt) {
          locallyReadSupportAtRef.current.delete(thread.id);
        }
        return thread;
      }),
      };
      return nextState;
    });
    if (failures.length === 0) {
      await persistRemoteSnapshot(nextState, currentUser.id);
    }
  }, [persistRemoteSnapshot, restoreOfflineWorkspace, updateState]);

  const handleAuthorizedError = useCallback(async (error: unknown) => {
    if (isSessionError(error)) {
      await clearAuthentication(true);
    } else if (isNetworkApiError(error)) {
      updateState((current) => ({ ...current, online: false, now: new Date().toISOString() }));
    }
    throw error;
  }, [clearAuthentication, updateState]);

  const requireToken = useCallback(() => {
    if (offlineOverrideRef.current) {
      throw new ApiError(0, 'OFFLINE', '网络不可用');
    }
    if (!tokenRef.current) {
      throw new ApiError(401, 'SESSION_REQUIRED', '请先登录');
    }
    return tokenRef.current;
  }, []);

  const enqueueOfflineOperation = useCallback(async (operation: OfflineOperation) => {
    const userId = stateRef.current.currentUserId;
    if (!userId || !isOfflineWriteAllowed(stateRef.current, operation.cabinetId, userId)) {
      throw new ApiError(0, 'OFFLINE_MULTI_USER_WRITE_BLOCKED', '多人柜体离线时不能修改');
    }
    const outbox = await loadOfflineOutbox(userId).catch(() => []);
    const nextOutbox = [...outbox, operation];
    const applied = applyOfflineOperation(stateRef.current, operation);
    const pendingCount = nextOutbox.filter((candidate) => candidate.status === 'pending').length;
    const conflictCount = nextOutbox.filter((candidate) => candidate.status === 'conflict').length;
    updateState((current) => ({
      ...applied.state,
      currentUser: current.currentUser,
      currentUserId: current.currentUserId,
      sessionStatus: current.sessionStatus,
      online: current.online,
      offlineMode: current.offlineMode,
      offlineSyncStatus: current.offlineSyncStatus,
      offlineSnapshotAt: current.offlineSnapshotAt,
      offlinePendingCount: pendingCount,
      offlineConflictCount: conflictCount,
      now: new Date().toISOString(),
    }));
    await saveOfflineOutbox(userId, nextOutbox);
    await persistOfflineSnapshot({
      ...applied.state,
      currentUser: stateRef.current.currentUser,
      currentUserId: userId,
      sessionStatus: 'authenticated',
      online: false,
      offlineSnapshotAt: stateRef.current.offlineSnapshotAt,
      offlinePendingCount: pendingCount,
      offlineConflictCount: conflictCount,
      hydrated: true,
      now: new Date().toISOString(),
    }, userId);
    return applied;
  }, [persistOfflineSnapshot, updateState]);

  const flushOfflineQueue = useCallback((token: string): Promise<void> => {
    if (offlineSyncPromiseRef.current) return offlineSyncPromiseRef.current;
    const operation = (async () => {
      const userId = stateRef.current.currentUserId;
      if (!userId) return;
      let outbox = await loadOfflineOutbox(userId).catch(() => []);
      const hadPending = outbox.some((operation) => operation.status === 'pending');
      if (hadPending) {
        updateState((current) => ({ ...current, offlineSyncStatus: 'syncing' }));
      }
      const replayOperation = async (operation: OfflineOperation) => {
        if (operation.type === 'checkout') {
          await backendApi.checkoutKey(token, operation.keyId, operation.input);
        } else if (operation.type === 'return') {
          await backendApi.returnKey(token, operation.keyId, operation.input);
        } else if (operation.type === 'update_key') {
          await backendApi.updateKey(token, operation.keyId, operation.input);
        } else if (operation.type === 'add_key') {
          await backendApi.addKey(token, operation.cabinetId, operation.input);
        } else if (operation.type === 'delete_key') {
          await backendApi.deleteKey(token, operation.keyId, operation.input);
        } else if (operation.type === 'delete_cabinet_keys') {
          await backendApi.deleteCabinetKeys(token, operation.cabinetId, operation.input);
        } else if (operation.type === 'delete_cabinet') {
          await backendApi.deleteCabinet(token, operation.cabinetId, operation.input);
        } else {
          await backendApi.renameCabinet(token, operation.cabinetId, operation.input);
        }
      };
      for (const pending of outbox) {
        if (pending.status === 'conflict') break;
        let syncError: unknown;
        try {
          await replayOperation(pending);
        } catch (error) {
          const actualVersion = isApiError(error) && error.code === 'VERSION_CONFLICT'
            ? error.details?.actualVersion
            : undefined;
          const autoRebaseAllowed = pending.type !== 'delete_cabinet' && pending.type !== 'delete_cabinet_keys';
          if (autoRebaseAllowed && typeof actualVersion === 'number') {
            const rebased = {
              ...pending,
              baseCabinetVersion: actualVersion,
              input: { ...pending.input, expectedVersion: actualVersion },
            } as OfflineOperation;
            outbox = outbox.map((candidate) => candidate.id === pending.id ? rebased : candidate);
            await saveOfflineOutbox(userId, outbox);
            try {
              await replayOperation(rebased);
            } catch (retryError) {
              syncError = retryError;
            }
          } else {
            syncError = error;
          }
        }
        if (syncError) {
          const error = syncError;
          if (isSessionError(error)) throw error;
          if (isNetworkApiError(error)) {
            updateState((current) => ({
              ...current,
              online: false,
              offlineSyncStatus: 'idle',
              now: new Date().toISOString(),
            }));
            break;
          }
          const conflictOutbox = outbox.map((candidate) =>
            candidate.id === pending.id
              ? {
                  ...candidate,
                  status: 'conflict' as const,
                  conflictCode: isApiError(error) ? error.code : 'SYNC_FAILED',
                }
              : candidate,
          );
          outbox = conflictOutbox;
          await saveOfflineOutbox(userId, outbox);
          await updateOfflineQueueCounts(userId);
          updateState((current) => ({ ...current, offlineSyncStatus: 'conflict' }));
          break;
        }
        outbox = outbox.filter((candidate) => candidate.id !== pending.id);
        await saveOfflineOutbox(userId, outbox);
        await updateOfflineQueueCounts(userId);
      }
      if (hadPending && outbox.length === 0) {
        updateState((current) => ({ ...current, offlineSyncStatus: 'success' }));
        setTimeout(() => {
          updateState((current) => current.offlineSyncStatus === 'success'
            ? { ...current, offlineSyncStatus: 'idle' }
            : current);
        }, 2_000);
      }
    })();
    offlineSyncPromiseRef.current = operation;
    void operation.finally(() => {
      if (offlineSyncPromiseRef.current === operation) offlineSyncPromiseRef.current = null;
    });
    return operation;
  }, [updateOfflineQueueCounts, updateState]);

  const performRefresh = useCallback(async () => {
    const token = requireToken();
    try {
      const { user } = await backendApi.session(token);
      await flushOfflineQueue(token);
      await loadWorkspace(token, await withLocalProfileAvatar(user));
    } catch (error) {
      await handleAuthorizedError(error);
    }
  }, [flushOfflineQueue, handleAuthorizedError, loadWorkspace, requireToken]);

  const refresh = useCallback(() => {
    pendingRefreshCountRef.current += 1;
    const operation = refreshQueueRef.current
      .catch(() => undefined)
      .then(performRefresh);

    latestRefreshPromiseRef.current = operation;
    refreshQueueRef.current = operation.then(
      () => undefined,
      () => undefined,
    );
    void operation.then(
      () => {
        pendingRefreshCountRef.current -= 1;
        if (latestRefreshPromiseRef.current === operation) {
          latestRefreshPromiseRef.current = null;
        }
      },
      () => {
        pendingRefreshCountRef.current -= 1;
        if (latestRefreshPromiseRef.current === operation) {
          latestRefreshPromiseRef.current = null;
        }
      },
    );

    return operation;
  }, [performRefresh]);

  const refreshIfStale = useCallback((input: { staleAfterMs?: number } = {}) => {
    if (pendingRefreshCountRef.current > 0 && latestRefreshPromiseRef.current) {
      return latestRefreshPromiseRef.current;
    }

    const staleAfterMs = Math.max(0, input.staleAfterMs ?? 0);
    if (Date.now() - lastSuccessfulRefreshAtRef.current < staleAfterMs) {
      return Promise.resolve();
    }

    return refresh();
  }, [refresh]);

  const hydrate = useCallback(() => {
    if (hydratePromiseRef.current) return hydratePromiseRef.current;

    const operation = (async () => {
      let cachedUser: CurrentUserAccount | null = null;
      try {
        const [token, storedUser] = await Promise.all([
          loadSessionToken(),
          loadSessionUser().catch(() => null),
        ]);
        cachedUser = storedUser;
        if (!token) {
          await clearSessionUser().catch(() => undefined);
          updateState((current) => ({ ...current, hydrated: true, online: true, sessionStatus: 'anonymous' }));
          return;
        }
        tokenRef.current = token;
        const { user } = await backendApi.session(token, SESSION_RESTORE_TIMEOUT_MS);
        await loadWorkspace(token, await withLocalProfileAvatar(user));
      } catch (error) {
        if (isSessionError(error)) {
          await clearAuthentication(false);
          return;
        }
        if (cachedUser) {
          await restoreOfflineWorkspace(cachedUser);
        } else {
          updateState((current) => ({
            ...current,
            hydrated: true,
            online: false,
            sessionStatus: 'anonymous',
          }));
        }
      }
    })();

    hydratePromiseRef.current = operation;
    const release = () => {
      if (hydratePromiseRef.current === operation) hydratePromiseRef.current = null;
    };
    void operation.then(release, release);
    return operation;
  }, [clearAuthentication, loadWorkspace, restoreOfflineWorkspace, updateState]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const actions = useMemo<AppActions>(() => ({
    hydrate,
    refresh,
    refreshIfStale,
    async setOfflineMode({ enabled }) {
      const userId = stateRef.current.currentUserId;
      if (!userId) throw new ApiError(401, 'SESSION_REQUIRED', '请先登录');
      if (enabled) {
        offlineModeRef.current = true;
        await saveOfflineMode(userId, true);
        updateState((current) => ({ ...current, offlineMode: true }));
        return;
      }

      const network = await getNetworkStateAsync().catch(() => ({
        isConnected: false,
        isInternetReachable: false,
      }));
      if (!network.isConnected || network.isInternetReachable === false) {
        throw new ApiError(0, 'NETWORK_UNAVAILABLE', '网络仍不可用');
      }
      offlineModeRef.current = false;
      await saveOfflineMode(userId, false);
      updateState((current) => ({ ...current, offlineMode: false }));
      try {
        await refresh();
      } catch (error) {
        offlineModeRef.current = true;
        await saveOfflineMode(userId, true).catch(() => undefined);
        updateState((current) => ({ ...current, offlineMode: true, online: false }));
        throw error;
      }
    },
    async retryOfflineConflicts() {
      const userId = stateRef.current.currentUserId;
      if (!userId) throw new ApiError(401, 'SESSION_REQUIRED', '请先登录');
      await refresh();
      const latest = stateRef.current;
      if (!latest.online) throw new ApiError(0, 'NETWORK_UNAVAILABLE', '网络仍不可用');
      const outbox = await loadOfflineOutbox(userId).catch(() => []);
      const rebased = outbox.map((operation) => {
        if (operation.status !== 'conflict') return operation;
        const cabinet = latest.cabinets.find((candidate) => candidate.id === operation.cabinetId);
        if (!cabinet) return operation;
        if (!isOfflineWriteAllowed(latest, operation.cabinetId, userId)) return operation;
        if ('keyId' in operation && !latest.keys.some((key) => key.id === operation.keyId)) {
          return operation;
        }
        return {
          ...operation,
          status: 'pending' as const,
          conflictCode: undefined,
          input: { ...operation.input, expectedVersion: cabinet.version },
          baseCabinetVersion: cabinet.version,
        } as OfflineOperation;
      });
      const rebasedCount = rebased.filter((operation, index) => operation.status === 'pending' && outbox[index]?.status === 'conflict').length;
      if (!rebasedCount) return;
      await saveOfflineOutbox(userId, rebased);
      updateState((current) => ({
        ...current,
        offlineSyncStatus: 'idle',
        offlinePendingCount: rebased.filter((operation) => operation.status === 'pending').length,
        offlineConflictCount: rebased.filter((operation) => operation.status === 'conflict').length,
        now: new Date().toISOString(),
      }));
      await refresh();
    },
    async discardOfflineConflicts() {
      const userId = stateRef.current.currentUserId;
      if (!userId) return;
      const outbox = await loadOfflineOutbox(userId).catch(() => []);
      const hasConflicts = outbox.some((operation) => operation.status === 'conflict');
      if (!hasConflicts) {
        updateState((current) => ({ ...current, offlineSyncStatus: 'idle' }));
        return;
      }
      const remaining = outbox.filter((operation) => operation.status !== 'conflict');
      await saveOfflineOutbox(userId, remaining);
      await updateOfflineQueueCounts(userId);
      const serverSnapshot = await loadOfflineServerWorkspaceSnapshot(userId).catch(() => null);
      if (serverSnapshot) {
        let resetState = stateFromOfflineSnapshot(stateRef.current, serverSnapshot);
        for (const pending of remaining) {
          try {
            resetState = applyOfflineOperation(resetState, pending).state;
          } catch {
            // Keep an unrelated pending operation in the queue for the next sync attempt.
          }
        }
        const nextState: AppState = {
          ...resetState,
          hydrated: true,
          currentUserId: userId,
          currentUser: stateRef.current.currentUser,
          sessionStatus: 'authenticated',
          online: stateRef.current.online,
          offlineSnapshotAt: serverSnapshot.syncedAt,
          offlinePendingCount: remaining.filter((operation) => operation.status === 'pending').length,
          offlineConflictCount: 0,
          offlineSyncStatus: 'idle',
          now: new Date().toISOString(),
        };
        updateState(() => nextState);
        await persistOfflineSnapshot(nextState, userId);
      } else {
        updateState((current) => ({ ...current, offlineSyncStatus: 'idle' }));
      }
      await refresh().catch(() => undefined);
    },
    async signIn(input) {
      const result = await backendApi.signIn(input);
      await saveSessionToken(result.session.token);
      tokenRef.current = result.session.token;
      const user = await withLocalProfileAvatar(result.user);
      await saveSessionUser(user).catch(() => undefined);
      await loadWorkspace(result.session.token, user);
      return user;
    },
    async register(input) {
      const result = await backendApi.register(input);
      await saveSessionToken(result.session.token);
      tokenRef.current = result.session.token;
      const user = await withLocalProfileAvatar(result.user);
      await saveSessionUser(user).catch(() => undefined);
      await loadWorkspace(result.session.token, user);
      return user;
    },
    async signOut() {
      const token = tokenRef.current;
      try {
        if (token && stateRef.current.online) {
          const pushToken = await loadRegisteredPushToken().catch(() => null);
          if (pushToken) {
            await backendApi.unregisterPushToken(token, pushToken).catch(() => undefined);
          }
          await backendApi.signOut(token);
        }
      } finally {
        await clearAuthentication(false);
      }
    },
    async markHomeGuidePrompted() {
      const token = requireToken();
      try {
        const remoteUser = await backendApi.markHomeGuidePrompted(token, {
          requestId: 'home-guide-prompted',
        });
        const user = await withLocalProfileAvatar(remoteUser);
        await saveSessionUser(user).catch(() => undefined);
        updateState((current) => ({
          ...current,
          currentUser: user,
          users: uniqueById([user, ...current.users]),
          version: current.version + 1,
        }));
        return user;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async requestPasswordReset({ email }) {
      const result = await backendApi.requestPasswordReset(email);
      if (result.previewCode) resetPreviewCodes.current.set(result.challengeId, result.previewCode);
      return { challengeId: result.challengeId };
    },
    async getPasswordResetPreview({ challengeId }) {
      const code = resetPreviewCodes.current.get(challengeId);
      if (!code) throw new ApiError(404, 'RESET_PREVIEW_UNAVAILABLE', '本地验证码预览未启用');
      return { code };
    },
    async verifyReset({ challengeId, code }) {
      const result = await backendApi.verifyPasswordReset(challengeId, code);
      return { resetToken: result.resetToken };
    },
    async resetPassword({ resetToken, newPassword }) {
      await backendApi.completePasswordReset(resetToken, newPassword);
      resetPreviewCodes.current.clear();
    },
    async updateProfile(input) {
      const token = requireToken();
      try {
        const { avatarUri, ...profileInput } = input;
        const remoteUser = await backendApi.updateProfile(token, {
          ...profileInput,
          // Clear device-local paths left by older app versions.
          avatarUri: null,
        });
        const localAvatarUri = avatarUri === undefined
          ? await loadLocalProfileAvatar(remoteUser.id)
          : avatarUri === null
            ? await removeLocalProfileAvatar(remoteUser.id).then(() => undefined)
            : await saveLocalProfileAvatar(remoteUser.id, avatarUri);
        const { avatarUri: _remoteAvatarUri, ...userWithoutAvatar } = remoteUser;
        const user = localAvatarUri
          ? { ...userWithoutAvatar, avatarUri: localAvatarUri }
          : userWithoutAvatar;
        await saveSessionUser(user).catch(() => undefined);
        updateState((current) => ({
          ...current,
          currentUser: user,
          users: uniqueById([user, ...current.users]),
          version: current.version + 1,
        }));
        return user;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async updateEmail(input) {
      const token = requireToken();
      try {
        const remoteUser = await backendApi.updateEmail(token, input);
        const user = await withLocalProfileAvatar(remoteUser);
        await saveSessionUser(user).catch(() => undefined);
        updateState((current) => ({
          ...current,
          currentUser: user,
          users: uniqueById([user, ...current.users]),
          version: current.version + 1,
        }));
        return user;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async changePassword(input) {
      const token = requireToken();
      try {
        await backendApi.changePassword(token, input);
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async deleteAccount(input = {}) {
      const token = requireToken();
      try {
        await backendApi.deleteAccount(token, input);
        if (stateRef.current.currentUserId) {
          await removeLocalProfileAvatar(stateRef.current.currentUserId).catch(() => undefined);
        }
        await clearAuthentication(false);
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async registerPushToken(input) {
      const token = requireToken();
      try {
        await backendApi.registerPushToken(token, input);
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async unregisterPushToken(input) {
      const token = requireToken();
      try {
        await backendApi.unregisterPushToken(token, input);
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async submitFeedback(input) {
      const token = requireToken();
      try {
        const result = await backendApi.submitFeedback(token, input);
        const { messages: _messages, ...summary } = result.thread;
        updateState((current) => ({
          ...current,
          feedbackThreads: uniqueById([summary, ...current.feedbackThreads]),
          version: current.version + 1,
        }));
        return { submissionId: result.submissionId, submittedAt: result.submittedAt };
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async listFeedbackHistory() {
      const token = requireToken();
      try {
        const result = await backendApi.listFeedbackHistory(token);
        updateState((current) => ({
          ...current,
          feedbackThreads: result.items,
          version: current.version + 1,
        }));
        return result.items;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async getFeedbackThread({ feedbackId }) {
      const token = requireToken();
      try {
        return await backendApi.getFeedbackThread(token, feedbackId);
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async replyToFeedback({ feedbackId, content }) {
      const token = requireToken();
      try {
        const { thread } = await backendApi.replyToFeedback(token, feedbackId, content);
        const { messages: _messages, ...summary } = thread;
        updateState((current) => ({
          ...current,
          feedbackThreads: uniqueById([summary, ...current.feedbackThreads]),
          version: current.version + 1,
        }));
        return thread;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async markFeedbackThreadRead({ feedbackId }) {
      const token = requireToken();
      const currentThread = stateRef.current.feedbackThreads.find(
        (thread) => thread.id === feedbackId,
      );
      const locallyReadAt = currentThread?.latestSupportMessageAt ?? new Date().toISOString();
      const previousUnreadCount = currentThread?.unreadMessageCount ?? 0;
      locallyReadSupportAtRef.current.set(feedbackId, locallyReadAt);
      updateState((current) => ({
        ...current,
        feedbackThreads: current.feedbackThreads.map((thread) =>
          thread.id === feedbackId ? { ...thread, unreadMessageCount: 0 } : thread
        ),
        version: current.version + 1,
      }));
      try {
        await backendApi.markFeedbackThreadRead(token, feedbackId);
      } catch (error) {
        if (locallyReadSupportAtRef.current.get(feedbackId) === locallyReadAt) {
          locallyReadSupportAtRef.current.delete(feedbackId);
        }
        updateState((current) => ({
          ...current,
          feedbackThreads: current.feedbackThreads.map((thread) =>
            thread.id === feedbackId
              ? {
                  ...thread,
                  unreadMessageCount: Math.max(
                    thread.unreadMessageCount,
                    previousUnreadCount,
                  ),
                }
              : thread
          ),
          version: current.version + 1,
        }));
        await handleAuthorizedError(error);
      }
    },
    async resolveQr(input) {
      const token = requireToken();
      try {
        const result: QrResolution = await backendApi.resolveCabinetQr(
          token,
          typeof input === 'string' ? input : input.code,
        );
        updateState((current) => ({
          ...current,
          qrs: result.kind === 'initialize'
            ? uniqueById([result.qr, ...current.qrs])
            : current.qrs,
          skus: uniqueById([result.sku, ...current.skus]),
        }));
        return result;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async initializeCabinet(input) {
      const token = requireToken();
      try {
        const result: CabinetAccessResult = await backendApi.initializeCabinet(token, {
          ...input,
          timeZone: input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        });
        await refresh();
        return result;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async createCabinetJoinInvitation({ cabinetId }) {
      const token = requireToken();
      try {
        const result = await backendApi.createCabinetJoinInvitation(token, cabinetId);
        return result.invitation;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async revokeCabinetJoinInvitation({ cabinetId, invitationId }) {
      const token = requireToken();
      try {
        await backendApi.revokeCabinetJoinInvitation(token, cabinetId, invitationId);
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async joinCabinet(input) {
      const token = requireToken();
      try {
        const result: CabinetAccessResult = await backendApi.joinCabinet(token, input);
        await refresh();
        return result;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async renameCabinet({ cabinetId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const cabinet = current.cabinets.find((candidate) => candidate.id === cabinetId);
      const offlineInput = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('rename-cabinet'),
        expectedVersion: input.expectedVersion ?? cabinet?.version,
      };
      if (
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinetId, userId)
      ) {
        const applied = await enqueueOfflineOperation({
          id: offlineInput.requestId,
          actorUserId: userId,
          cabinetId,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'rename_cabinet',
          input: offlineInput,
        });
        return applied.cabinet!;
      }
      const token = requireToken();
      try {
        const cabinet = await backendApi.renameCabinet(token, cabinetId, offlineInput);
        await refresh();
        return cabinet;
      } catch (error) {
        if (
          isNetworkApiError(error) &&
          userId &&
          cabinet &&
          isOfflineWriteAllowed(stateRef.current, cabinetId, userId)
        ) {
          const applied = await enqueueOfflineOperation({
            id: offlineInput.requestId,
            actorUserId: userId,
            cabinetId,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'rename_cabinet',
            input: offlineInput,
          });
          return applied.cabinet!;
        }
        return handleAuthorizedError(error);
      }
    },
    async disconnectCabinet({ cabinetId, ...input }) {
      const token = requireToken();
      try {
        await backendApi.disconnectCabinet(token, cabinetId, input);
        await refresh();
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async deleteCabinet({ cabinetId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const cabinet = current.cabinets.find((candidate) => candidate.id === cabinetId);
      const offlineInput = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('delete-cabinet'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      if (
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinetId, userId)
      ) {
        await enqueueOfflineOperation({
          id: offlineInput.requestId!,
          actorUserId: userId,
          cabinetId,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'delete_cabinet',
          input: offlineInput,
        });
        return;
      }
      const token = requireToken();
      try {
        await backendApi.deleteCabinet(token, cabinetId, offlineInput);
        await refresh();
      } catch (error) {
        if (isNetworkApiError(error) && userId && cabinet && isOfflineWriteAllowed(stateRef.current, cabinetId, userId)) {
          await enqueueOfflineOperation({
            id: offlineInput.requestId!,
            actorUserId: userId,
            cabinetId,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'delete_cabinet',
            input: offlineInput,
          });
          return;
        }
        await handleAuthorizedError(error);
      }
    },
    async transferCabinetSuperAdmin({ cabinetId, membershipId, ...input }) {
      const token = requireToken();
      try {
        await backendApi.transferCabinetSuperAdmin(token, cabinetId, {
          membershipId,
          ...input,
        });
        await refresh();
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async removeMember({ cabinetId, membershipId, ...input }) {
      const token = requireToken();
      try {
        await backendApi.removeMember(token, cabinetId, membershipId, input);
        await refresh();
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async addKey({ cabinetId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const cabinet = current.cabinets.find((candidate) => candidate.id === cabinetId);
      const offlineInput: AddKeyRequest = {
        ...input,
        note: input.note ?? '',
        requestId: input.requestId ?? offlineOperationId('add-key'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      const canQueue = Boolean(
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinetId, userId),
      );
      if (canQueue && userId && cabinet) {
        const applied = await enqueueOfflineOperation({
          id: offlineInput.requestId!,
          actorUserId: userId,
          cabinetId,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'add_key',
          input: offlineInput,
        });
        return applied.key!;
      }
      const token = requireToken();
      try {
        const result = await backendApi.addKey(token, cabinetId, offlineInput);
        await refresh();
        return result.key;
      } catch (error) {
        if (isNetworkApiError(error) && userId && cabinet && isOfflineWriteAllowed(stateRef.current, cabinetId, userId)) {
          const applied = await enqueueOfflineOperation({
            id: offlineInput.requestId!,
            actorUserId: userId,
            cabinetId,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'add_key',
            input: offlineInput,
          });
          return applied.key!;
        }
        return handleAuthorizedError(error);
      }
    },
    async updateKey({ keyId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const key = current.keys.find((candidate) => candidate.id === keyId);
      const cabinet = key ? current.cabinets.find((candidate) => candidate.id === key.cabinetId) : undefined;
      const offlineInput: UpdateKeyRequest = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('update-key'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      const canQueue = Boolean(
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        key &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinet.id, userId),
      );
      if (canQueue && userId && key && cabinet) {
        const applied = await enqueueOfflineOperation({
          id: offlineInput.requestId!,
          actorUserId: userId,
          cabinetId: cabinet.id,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'update_key',
          keyId,
          input: offlineInput,
        });
        return applied.key!;
      }
      const token = requireToken();
      try {
        const result = await backendApi.updateKey(token, keyId, offlineInput);
        await refresh();
        return result.key;
      } catch (error) {
        if (isNetworkApiError(error) && userId && key && cabinet && isOfflineWriteAllowed(stateRef.current, cabinet.id, userId)) {
          const applied = await enqueueOfflineOperation({
            id: offlineInput.requestId!,
            actorUserId: userId,
            cabinetId: cabinet.id,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'update_key',
            keyId,
            input: offlineInput,
          });
          return applied.key!;
        }
        return handleAuthorizedError(error);
      }
    },
    async deleteKey({ keyId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const key = current.keys.find((candidate) => candidate.id === keyId);
      const cabinet = key ? current.cabinets.find((candidate) => candidate.id === key.cabinetId) : undefined;
      const offlineInput: WriteOptions = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('delete-key'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      const canQueue = Boolean(
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        key &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinet.id, userId),
      );
      if (canQueue && userId && key && cabinet) {
        await enqueueOfflineOperation({
          id: offlineInput.requestId!,
          actorUserId: userId,
          cabinetId: cabinet.id,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'delete_key',
          keyId,
          input: offlineInput,
        });
        return;
      }
      const token = requireToken();
      try {
        await backendApi.deleteKey(token, keyId, offlineInput);
        await refresh();
      } catch (error) {
        if (isNetworkApiError(error) && userId && key && cabinet && isOfflineWriteAllowed(stateRef.current, cabinet.id, userId)) {
          await enqueueOfflineOperation({
            id: offlineInput.requestId!,
            actorUserId: userId,
            cabinetId: cabinet.id,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'delete_key',
            keyId,
            input: offlineInput,
          });
          return;
        }
        await handleAuthorizedError(error);
      }
    },
    async checkOutKey({ keyId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const key = current.keys.find((candidate) => candidate.id === keyId);
      const cabinet = key ? current.cabinets.find((candidate) => candidate.id === key.cabinetId) : undefined;
      const offlineInput: CheckoutKeyRequest = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('checkout'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      const canQueue = Boolean(
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        key &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinet.id, userId),
      );
      if (canQueue && userId && key && cabinet) {
        const applied = await enqueueOfflineOperation({
          id: offlineInput.requestId,
          actorUserId: userId,
          cabinetId: cabinet.id,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'checkout',
          keyId,
          input: offlineInput,
        });
        return { key: applied.key!, event: applied.event! };
      }
      const token = requireToken();
      try {
        const result = await backendApi.checkoutKey(token, keyId, offlineInput);
        await refresh();
        return { key: result.key, event: result.event };
      } catch (error) {
        if (isNetworkApiError(error) && userId && key && cabinet && isOfflineWriteAllowed(stateRef.current, cabinet.id, userId)) {
          const applied = await enqueueOfflineOperation({
            id: offlineInput.requestId,
            actorUserId: userId,
            cabinetId: cabinet.id,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'checkout',
            keyId,
            input: offlineInput,
          });
          return { key: applied.key!, event: applied.event! };
        }
        return handleAuthorizedError(error);
      }
    },
    async returnKey({ keyId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const key = current.keys.find((candidate) => candidate.id === keyId);
      const cabinet = key ? current.cabinets.find((candidate) => candidate.id === key.cabinetId) : undefined;
      const offlineInput: ReturnKeyRequest = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('return'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      const canQueue = Boolean(
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        key &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinet.id, userId),
      );
      if (canQueue && userId && key && cabinet) {
        const applied = await enqueueOfflineOperation({
          id: offlineInput.requestId,
          actorUserId: userId,
          cabinetId: cabinet.id,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'return',
          keyId,
          input: offlineInput,
        });
        return { key: applied.key!, event: applied.event! };
      }
      const token = requireToken();
      try {
        const result = await backendApi.returnKey(token, keyId, offlineInput);
        await refresh();
        return { key: result.key, event: result.event };
      } catch (error) {
        if (isNetworkApiError(error) && userId && key && cabinet && isOfflineWriteAllowed(stateRef.current, cabinet.id, userId)) {
          const applied = await enqueueOfflineOperation({
            id: offlineInput.requestId,
            actorUserId: userId,
            cabinetId: cabinet.id,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'return',
            keyId,
            input: offlineInput,
          });
          return { key: applied.key!, event: applied.event! };
        }
        return handleAuthorizedError(error);
      }
    },
    async deleteCabinetKeys({ cabinetId, ...input }) {
      const current = stateRef.current;
      const userId = current.currentUserId;
      const cabinet = current.cabinets.find((candidate) => candidate.id === cabinetId);
      const offlineInput = {
        ...input,
        requestId: input.requestId ?? offlineOperationId('delete-cabinet-keys'),
        ...(input.expectedVersion === undefined && cabinet ? { expectedVersion: cabinet.version } : {}),
      };
      if (
        (offlineOverrideRef.current || offlineModeRef.current || !current.online) &&
        userId &&
        cabinet &&
        isOfflineWriteAllowed(current, cabinetId, userId)
      ) {
        await enqueueOfflineOperation({
          id: offlineInput.requestId!,
          actorUserId: userId,
          cabinetId,
          createdAt: new Date().toISOString(),
          baseCabinetVersion: cabinet.version,
          status: 'pending',
          type: 'delete_cabinet_keys',
          input: offlineInput,
        });
        return { deletedCount: current.keys.filter((key) => key.cabinetId === cabinetId).length };
      }
      const token = requireToken();
      try {
        const result = await backendApi.deleteCabinetKeys(token, cabinetId, offlineInput);
        await refresh();
        return { deletedCount: result.deletedCount };
      } catch (error) {
        if (isNetworkApiError(error) && userId && cabinet && isOfflineWriteAllowed(stateRef.current, cabinetId, userId)) {
          const deletedCount = current.keys.filter((key) => key.cabinetId === cabinetId).length;
          await enqueueOfflineOperation({
            id: offlineInput.requestId!,
            actorUserId: userId,
            cabinetId,
            createdAt: new Date().toISOString(),
            baseCabinetVersion: cabinet.version,
            status: 'pending',
            type: 'delete_cabinet_keys',
            input: offlineInput,
          });
          return { deletedCount };
        }
        return handleAuthorizedError(error);
      }
    },
    async setOnline({ online }) {
      offlineOverrideRef.current = !online;
      updateState((current) => ({ ...current, online, now: new Date().toISOString() }));
      if (online && tokenRef.current) await refresh();
    },
  }), [
    clearAuthentication,
    enqueueOfflineOperation,
    handleAuthorizedError,
    hydrate,
    loadWorkspace,
    persistOfflineSnapshot,
    refresh,
    refreshIfStale,
    requireToken,
    updateState,
    updateOfflineQueueCounts,
  ]);

  const selectors = useMemo(() => createAppSelectors(state), [state]);
  const value = useMemo<AppContextValue>(() => ({
    state,
    currentUser: state.currentUser,
    actions,
    selectors,
  }), [actions, selectors, state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('APP_PROVIDER_REQUIRED');
  return context;
}
