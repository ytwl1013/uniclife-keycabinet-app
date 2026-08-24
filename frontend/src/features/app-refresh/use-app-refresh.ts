import { useToast } from 'heroui-native/toast';
import { useCallback, useRef, useState } from 'react';

import { useApp } from '@/app-state';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

export function useAppRefresh() {
  const { actions } = useApp();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);

  const onRefresh = useCallback(() => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    setRefreshing(true);
    void actions.refresh()
      .catch((error: unknown) => {
        toast.show({
          duration: 3000,
          id: 'app-refresh-error',
          label: t(authErrorKey(error)),
          placement: 'bottom',
          variant: 'danger',
        });
      })
      .finally(() => {
        refreshInFlight.current = false;
        setRefreshing(false);
      });
  }, [actions, t, toast]);

  return { onRefresh, refreshing };
}
