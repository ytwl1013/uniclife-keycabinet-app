import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useApp } from '@/app-state';

const OFFLINE_RETRY_INTERVAL_MS = 5_000;

// iOS network authorization does not always change the physical network state.
// Also retry while offline so dismissing that prompt can recover an earlier request.
export function NetworkRecovery() {
  const { actions, state } = useApp();
  const { hydrated, online, sessionStatus } = state;

  useEffect(() => {
    if (!hydrated) return;
    let disposed = false;
    let recovering = false;
    const recover = async () => {
      if (disposed || recovering || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      if (sessionStatus !== 'authenticated' && online) return;
      recovering = true;
      try {
        if (sessionStatus === 'authenticated') await actions.refreshIfStale();
        else await actions.hydrate();
      } catch {
        // The request layer retains the offline/error state for the next retry.
      } finally {
        recovering = false;
      }
    };

    const networkSubscription = addNetworkStateListener((network) => {
      const connected = Boolean(network.isConnected && network.isInternetReachable !== false);
      if (!connected) {
        if (online && typeof actions.setOnline === 'function') {
          void actions.setOnline({ online: false }).catch(() => undefined);
        }
        return;
      }
      if (!online) {
        if (typeof actions.setOnline === 'function') {
          void actions.setOnline({ online: true }).catch(() => undefined);
        } else {
          void recover();
        }
        return;
      }
      void recover();
    });
    const appSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !online) void recover();
    });
    const timer = !online ? setInterval(() => void recover(), OFFLINE_RETRY_INTERVAL_MS) : undefined;

    return () => {
      disposed = true;
      networkSubscription.remove();
      appSubscription.remove();
      if (timer) clearInterval(timer);
    };
  }, [actions, hydrated, online, sessionStatus]);

  return null;
}
