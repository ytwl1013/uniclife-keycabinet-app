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
import { ApiError, isApiError } from '@/api/client';
import {
  clearSessionToken,
  loadSessionToken,
  saveSessionToken,
} from '@/api/session-token';

import { uniqueById } from './collections';
import { AppSelectors, createAppSelectors } from './selectors';
import type {
  AppActions,
  AppState,
  BindCabinetResult,
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
});

const AppContext = createContext<AppContextValue | null>(null);

function isSessionError(error: unknown): boolean {
  return isApiError(error) &&
    (error.status === 401 || error.code === 'SESSION_REQUIRED' || error.code === 'SESSION_EXPIRED');
}

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(emptyState);
  const stateRef = useRef(state);
  const tokenRef = useRef<string | null>(null);
  const resetPreviewCodes = useRef(new Map<string, string>());

  const updateState = useCallback((update: (current: AppState) => AppState) => {
    setState((current) => {
      const next = update(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const clearAuthentication = useCallback(async (expired = false) => {
    tokenRef.current = null;
    await clearSessionToken();
    updateState((current) => ({
      ...emptyState(),
      hydrated: true,
      online: current.online,
      sessionStatus: expired ? 'expired' : 'anonymous',
      version: current.version + 1,
    }));
  }, [updateState]);

  const loadWorkspace = useCallback(async (token: string, currentUser: CurrentUserAccount) => {
    const summaries = await backendApi.listCabinets(token);
    const [details, loansResult, eventsResult] = await Promise.all([
      Promise.all(summaries.map(({ cabinet }) => backendApi.getCabinet(token, cabinet.id))),
      backendApi.listLoans(token),
      backendApi.listEvents(token),
    ]);

    const memberships = details.flatMap((detail) =>
      detail.members.map(({ membership }) => membership),
    );
    const memberUsers = details.flatMap((detail) => detail.members.map(({ user }) => user));
    const retainedQrs = stateRef.current.qrs;

    updateState((current) => ({
      hydrated: true,
      currentUserId: currentUser.id,
      currentUser,
      sessionStatus: 'authenticated',
      online: true,
      now: new Date().toISOString(),
      version: current.version + 1,
      users: uniqueById([currentUser, ...memberUsers, ...eventsResult.actors]),
      skus: uniqueById(summaries.map(({ sku }) => sku)),
      qrs: retainedQrs,
      cabinets: summaries.map(({ cabinet }) => cabinet),
      memberships: uniqueById(memberships),
      slots: uniqueById(details.flatMap((detail) => detail.slots)),
      keys: uniqueById(details.flatMap((detail) => detail.keys)),
      loans: loansResult.items,
      events: eventsResult.items,
    }));
  }, [updateState]);

  const handleAuthorizedError = useCallback(async (error: unknown) => {
    if (isSessionError(error)) {
      await clearAuthentication(true);
    } else if (isApiError(error) && error.code === 'OFFLINE') {
      updateState((current) => ({ ...current, online: false, now: new Date().toISOString() }));
    }
    throw error;
  }, [clearAuthentication, updateState]);

  const requireToken = useCallback(() => {
    if (!stateRef.current.online) {
      throw new ApiError(0, 'OFFLINE', '网络不可用');
    }
    if (!tokenRef.current) {
      throw new ApiError(401, 'SESSION_REQUIRED', '请先登录');
    }
    return tokenRef.current;
  }, []);

  const refresh = useCallback(async () => {
    const token = requireToken();
    try {
      const { user } = await backendApi.session(token);
      await loadWorkspace(token, user);
    } catch (error) {
      await handleAuthorizedError(error);
    }
  }, [handleAuthorizedError, loadWorkspace, requireToken]);

  const hydrate = useCallback(async () => {
    try {
      const token = await loadSessionToken();
      if (!token) {
        updateState((current) => ({ ...current, hydrated: true, sessionStatus: 'anonymous' }));
        return;
      }
      tokenRef.current = token;
      const { user } = await backendApi.session(token);
      await loadWorkspace(token, user);
    } catch (error) {
      if (isSessionError(error)) {
        await clearAuthentication(false);
        return;
      }
      updateState((current) => ({
        ...current,
        hydrated: true,
        online: false,
        sessionStatus: 'anonymous',
      }));
    }
  }, [clearAuthentication, loadWorkspace, updateState]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const actions = useMemo<AppActions>(() => ({
    hydrate,
    refresh,
    async signIn(input) {
      const result = await backendApi.signIn(input);
      await saveSessionToken(result.session.token);
      tokenRef.current = result.session.token;
      await loadWorkspace(result.session.token, result.user);
      return result.user;
    },
    async register(input) {
      const result = await backendApi.register(input);
      await saveSessionToken(result.session.token);
      tokenRef.current = result.session.token;
      await loadWorkspace(result.session.token, result.user);
      return result.user;
    },
    async signOut() {
      const token = tokenRef.current;
      try {
        if (token && stateRef.current.online) await backendApi.signOut(token);
      } finally {
        await clearAuthentication(false);
      }
    },
    async markHomeGuidePrompted() {
      const token = requireToken();
      try {
        const user = await backendApi.markHomeGuidePrompted(token, {
          requestId: 'home-guide-prompted',
        });
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
        const user = await backendApi.updateProfile(token, input);
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
        const user = await backendApi.updateEmail(token, input);
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
        await clearAuthentication(false);
      } catch (error) {
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
          qrs: uniqueById([result.qr, ...current.qrs]),
          skus: uniqueById([result.sku, ...current.skus]),
        }));
        return result;
      } catch (error) {
        return handleAuthorizedError(error);
      }
    },
    async bindCabinet(input) {
      const token = requireToken();
      try {
        const result: BindCabinetResult = await backendApi.bindCabinet(token, {
          ...input,
          timeZone: input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        });
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
      updateState((current) => ({ ...current, online, now: new Date().toISOString() }));
      if (online && tokenRef.current) await refresh();
    },
  }), [
    clearAuthentication,
    handleAuthorizedError,
    hydrate,
    loadWorkspace,
    refresh,
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
