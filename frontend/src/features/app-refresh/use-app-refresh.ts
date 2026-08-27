import { useToast } from 'heroui-native/toast';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useApp } from '@/app-state';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

const FOCUS_REFRESH_STALE_AFTER_MS = 60_000;

export function useAppRefresh() {
  const { actions } = useApp();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);

  useFocusEffect(useCallback(() => {
    void actions.refreshIfStale({ staleAfterMs: FOCUS_REFRESH_STALE_AFTER_MS })
      .catch(() => undefined);
  }, [actions]));

  const onRefresh = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      await actions.refresh();
    } catch (error: unknown) {
      toast.show({
        duration: 3000,
        id: 'app-refresh-error',
        label: t(authErrorKey(error)),
        placement: 'bottom',
        variant: 'danger',
      });
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }, [actions, t, toast]);

  return { onRefresh, refreshing };
}
