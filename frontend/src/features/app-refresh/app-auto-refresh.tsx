import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { createRealtimeWebSocket, parseRealtimeEvent } from '@/api/realtime';
import { loadSessionToken } from '@/api/session-token';
import { useApp } from '@/app-state';

import {
  REALTIME_CHANGE_DEBOUNCE_MS,
  REALTIME_FALLBACK_REFRESH_INTERVAL_MS,
  realtimeReconnectDelay,
} from './realtime-policy';

function isAppActive(): boolean {
  return AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
}

export function AppAutoRefresh() {
  const { actions, state } = useApp();
  const authenticated = state.sessionStatus === 'authenticated';
  const cabinetVersions = useRef(new Map<string, number>());
  cabinetVersions.current = new Map(
    state.cabinets.map((cabinet) => [cabinet.id, cabinet.version]),
  );

  useEffect(() => {
    if (!authenticated) return;

    let active = isAppActive();
    let changeRefreshTimer: ReturnType<typeof setTimeout> | undefined;
    let connectionNeedsCatchup = true;
    let connecting = false;
    let disposed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;

    const refreshQuietly = (staleAfterMs = 0) => {
      void actions.refreshIfStale({ staleAfterMs }).catch(() => undefined);
    };

    const clearReconnectTimer = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    };

    const scheduleReconnect = () => {
      if (disposed || !active || reconnectTimer) return;
      const delay = realtimeReconnectDelay(reconnectAttempt);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (
        disposed ||
        !active ||
        connecting ||
        socket?.readyState === WebSocket.CONNECTING ||
        socket?.readyState === WebSocket.OPEN
      ) return;

      connecting = true;
      const token = await loadSessionToken().catch(() => null);
      connecting = false;
      if (disposed || !active) return;
      if (!token) {
        refreshQuietly();
        scheduleReconnect();
        return;
      }

      const nextSocket = createRealtimeWebSocket(token);
      socket = nextSocket;
      nextSocket.onopen = () => {
        reconnectAttempt = 0;
        if (connectionNeedsCatchup) {
          connectionNeedsCatchup = false;
          refreshQuietly();
        }
      };
      nextSocket.onmessage = (message) => {
        const event = parseRealtimeEvent(message.data);
        if (!event) return;
        if (event.type === 'support.message_created') {
          refreshQuietly();
          return;
        }
        if (event.type !== 'workspace.changed') return;
        const currentVersion = cabinetVersions.current.get(event.cabinetId);
        if (currentVersion !== undefined && currentVersion >= event.cabinetVersion) return;
        if (changeRefreshTimer) clearTimeout(changeRefreshTimer);
        changeRefreshTimer = setTimeout(() => {
          changeRefreshTimer = undefined;
          refreshQuietly();
        }, REALTIME_CHANGE_DEBOUNCE_MS);
      };
      nextSocket.onerror = () => undefined;
      nextSocket.onclose = (event) => {
        if (socket === nextSocket) socket = null;
        if (active) connectionNeedsCatchup = true;
        if (event.code === 4001) refreshQuietly();
        scheduleReconnect();
      };
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        active = true;
        connectionNeedsCatchup = false;
        refreshQuietly();
        void connect();
      } else {
        active = false;
        clearReconnectTimer();
        socket?.close(1000, 'app-background');
        socket = null;
      }
    });
    const fallbackInterval = setInterval(() => {
      if (active && socket?.readyState !== WebSocket.OPEN) {
        refreshQuietly(REALTIME_FALLBACK_REFRESH_INTERVAL_MS);
      }
    }, REALTIME_FALLBACK_REFRESH_INTERVAL_MS);

    if (active) void connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      if (changeRefreshTimer) clearTimeout(changeRefreshTimer);
      clearInterval(fallbackInterval);
      subscription.remove();
      socket?.close(1000, 'app-disposed');
      socket = null;
    };
  }, [actions, authenticated]);

  return null;
}
