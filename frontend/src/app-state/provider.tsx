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

import { uniqueById } from './collections';
import { AppSelectors, createAppSelectors } from './selectors';
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

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(emptyState);
  const stateRef = useRef(state);
  const tokenRef = useRef<string | null>(null);
  const lastSuccessfulRefreshAtRef = useRef(0);
  const latestRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const hydratePromiseRef = useRef<Promise<void> | null>(null);
  const offlineOverrideRef = useRef(false);
  const pendingRefreshCountRef = useRef(0);
  const refreshQueueRef = useRef<Promise<void>>(Promise.resolve());
  const resetPreviewCodes = useRef(new Map<string, string>());
  const locallyReadSupportAtRef = useRef(new Map<string, string>());

  const updateState = useCallback((update: (current: AppState) => AppState) => {
    setState((current) => {
      const next = update(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const clearAuthentication = useCallback(async (expired = false) => {
    tokenRef.current = null;
    lastSuccessfulRefreshAtRef.current = 0;
    offlineOverrideRef.current = false;
    locallyReadSupportAtRef.current.clear();
    await clearSessionToken();
    await clearSessionUser();
    await clearRegisteredPushToken();
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
    let summaries;
    try {
      summaries = await backendApi.listCabinets(token);
    } catch (error) {
      if (isSessionError(error)) throw error;

      const refreshedAt = Date.now();
      updateState((current) => ({
        ...current,
        hydrated: true,
        currentUserId: currentUser.id,
        currentUser,
        sessionStatus: 'authenticated',
        online: false,
        now: new Date(refreshedAt).toISOString(),
        users: uniqueById([currentUser, ...current.users]),
        version: current.version + 1,
      }));
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
    if (failures.length === 0) lastSuccessfulRefreshAtRef.current = refreshedAt;
    updateState((current) => ({
      hydrated: true,
      currentUserId: currentUser.id,
      currentUser,
      sessionStatus: 'authenticated',
      online: failures.length === 0,
      now: new Date(refreshedAt).toISOString(),
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
    }));
  }, [updateState]);

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

  const performRefresh = useCallback(async () => {
    const token = requireToken();
    try {
      const { user } = await backendApi.session(token);
      await loadWorkspace(token, await withLocalProfileAvatar(user));
    } catch (error) {
      await handleAuthorizedError(error);
    }
  }, [handleAuthorizedError, loadWorkspace, requireToken]);

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

        updateState((current) => ({
          ...current,
          hydrated: true,
          currentUserId: cachedUser?.id ?? current.currentUserId,
          currentUser: cachedUser ?? current.currentUser,
          online: false,
          sessionStatus: 'authenticated',
          users: cachedUser ? uniqueById([cachedUser, ...current.users]) : current.users,
        }));
      }
    })();

    hydratePromiseRef.current = operation;
    const release = () => {
      if (hydratePromiseRef.current === operation) hydratePromiseRef.current = null;
    };
    void operation.then(release, release);
    return operation;
  }, [clearAuthentication, loadWorkspace, updateState]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const actions = useMemo<AppActions>(() => ({
    hydrate,
    refresh,
    refreshIfStale,
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
      const token = requireToken();
      try {
        const cabinet = await backendApi.renameCabinet(token, cabinetId, input);
        await refresh();
        return cabinet;
      } catch (error) {
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
      const token = requireToken();
      try {
        await backendApi.deleteCabinet(token, cabinetId, input);
        await refresh();
      } catch (error) {
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
      const token = requireToken();
      try {
        const result = await backendApi.addKey(token, cabinetId, input);
        await refresh();
        return result.key;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async updateKey({ keyId, ...input }) {
      const token = requireToken();
      try {
        const result = await backendApi.updateKey(token, keyId, input);
        await refresh();
        return result.key;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async deleteKey({ keyId, ...input }) {
      const token = requireToken();
      try {
        await backendApi.deleteKey(token, keyId, input);
        await refresh();
      } catch (error) {
        await handleAuthorizedError(error);
      }
    },
    async checkOutKey({ keyId, ...input }) {
      const token = requireToken();
      try {
        const result = await backendApi.checkoutKey(token, keyId, {
          ...input,
          requestId: input.requestId ?? `checkout-${keyId}-${Date.now()}`,
        });
        await refresh();
        return { key: result.key, event: result.event };
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async returnKey({ keyId, ...input }) {
      const token = requireToken();
      try {
        const result = await backendApi.returnKey(token, keyId, {
          ...input,
          requestId: input.requestId ?? `return-${keyId}-${Date.now()}`,
        });
        await refresh();
        return { key: result.key, event: result.event };
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async deleteCabinetKeys({ cabinetId, ...input }) {
      const token = requireToken();
      try {
        const result = await backendApi.deleteCabinetKeys(token, cabinetId, input);
        await refresh();
        return { deletedCount: result.deletedCount };
      } catch (error) {
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
    handleAuthorizedError,
    hydrate,
    loadWorkspace,
    refresh,
    refreshIfStale,
    requireToken,
    updateState,
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
