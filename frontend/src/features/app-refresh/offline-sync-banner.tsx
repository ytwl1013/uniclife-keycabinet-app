import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { useApp } from '@/app-state';
import { useTranslation } from '@/i18n';

function hasSingleAdminCabinet(
  cabinetIds: string[],
  membersForCabinet: (cabinetId: string) => unknown[],
): boolean {
  return cabinetIds.some((cabinetId) => membersForCabinet(cabinetId).length === 1);
}

export function OfflineModeBadge() {
  const { actions, state } = useApp();
  const { t } = useTranslation();
  const dialog = usePrototypeDialog();
  if (!state.offlineMode) return null;

  const switchOnline = async () => {
    const confirmed = await dialog.present({
      title: t('common.offlineUseSwitchTitle'),
      description: t('common.offlineUseSwitchDescription'),
      confirmLabel: t('common.offlineUseSwitch'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await actions.setOfflineMode({ enabled: false });
    } catch {
      await dialog.present({
        title: t('common.offlineNetworkUnavailableTitle'),
        description: t('common.offlineNetworkUnavailable'),
        confirmLabel: t('common.done'),
      });
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        className="min-h-10 items-center justify-center rounded-control px-2 active:opacity-70"
        onPress={() => void switchOnline()}>
        <AppText variant="label" tone="warning">{t('common.offlineUse')}</AppText>
        <AppText className="text-[10px] leading-3" tone="muted">{t('common.offlineUseSwitch')}</AppText>
      </Pressable>
      {dialog.dialog}
    </>
  );
}

export function OfflineSyncBanner({ compact = false }: { compact?: boolean }) {
  const { actions, selectors, state } = useApp();
  const { t } = useTranslation();
  const dialog = usePrototypeDialog();
  const [retrying, setRetrying] = React.useState(false);
  const cabinetIds = selectors.cabinetsForCurrentUser().map((cabinet) => cabinet.id);
  const singleAdminAvailable = hasSingleAdminCabinet(cabinetIds, (cabinetId) => selectors.membersForCabinet(cabinetId));

  const isSyncing = state.offlineSyncStatus === 'syncing';
  const isSuccess = state.offlineSyncStatus === 'success';
  const hasConflict = state.offlineSyncStatus === 'conflict' || state.offlineConflictCount > 0;
  const changeCount = state.offlinePendingCount + state.offlineConflictCount;
  const visible = !state.offlineMode && (
    !state.online || state.offlinePendingCount > 0 || isSyncing || isSuccess || hasConflict
  );

  const retry = async () => {
    if (retrying || isSyncing) return;
    setRetrying(true);
    try {
      await actions.refresh();
    } catch {
      // The banner remains visible while the network is unavailable.
    } finally {
      setRetrying(false);
    }
  };

  const enterOfflineUse = async () => {
    const confirmed = await dialog.present({
      title: t('common.offlineUseTitle'),
      description: singleAdminAvailable
        ? t('common.offlineUseSingleAdminDescription')
        : t('common.offlineUseSharedDescription'),
      confirmLabel: t('common.offlineUseAction'),
      cancelLabel: t('common.cancel'),
    });
    if (confirmed) await actions.setOfflineMode({ enabled: true });
  };

  const retryConflict = async () => {
    const confirmed = await dialog.present({
      title: t('common.syncConflictTitle'),
      description: t('common.syncRetryConflictDescription'),
      confirmLabel: t('common.syncRetryConflict'),
      cancelLabel: t('common.cancel'),
    });
    if (confirmed) await actions.retryOfflineConflicts();
  };

  const discardConflict = async () => {
    const confirmed = await dialog.present({
      title: t('common.syncConflictTitle'),
      description: t('common.syncConflictDescription'),
      confirmLabel: t('common.syncDiscard'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (confirmed) await actions.discardOfflineConflicts();
  };

  if (!visible) return null;

  const toneClass = isSuccess
    ? 'border-success/25 bg-success-soft'
    : hasConflict
      ? 'border-danger/25 bg-danger-soft'
      : 'border-warning/25 bg-warning-soft';
  const iconTone = isSuccess ? 'success' : hasConflict ? 'danger' : 'warning';
  const title = isSyncing
    ? t('common.syncing')
    : isSuccess
      ? t('common.syncSuccess')
      : hasConflict
        ? t('common.syncConflict')
        : t('common.offlineBannerTitle');

  return (
    <>
      <View className={`${compact ? 'gap-2 p-2.5' : 'gap-2.5 p-3'} rounded-control border ${toneClass}`}>
        <View className="w-full flex-row items-start gap-2">
          {isSyncing ? <ActivityIndicator color="#2563eb" size="small" /> : <AppIcon name={isSuccess ? 'check' : 'error'} size={compact ? 18 : 20} tone={iconTone} />}
          <View className="min-w-0 flex-1 gap-0.5">
            <AppText variant="label" tone="foreground">{title}</AppText>
            {!isSuccess && changeCount > 0 ? (
              <AppText variant="caption" tone="content">{t('common.syncChanges', { count: changeCount })}</AppText>
            ) : null}
            {!isSuccess && hasConflict && state.offlineConflictCount > 0 ? (
              <AppText variant="caption" tone="danger">{t('common.syncConflictCount', { count: state.offlineConflictCount })}</AppText>
            ) : null}
            {!isSuccess && !isSyncing && changeCount === 0 ? (
              <AppText variant="caption" tone="content">{t('common.offlineBannerDescription')}</AppText>
            ) : null}
          </View>
        </View>
        {!isSuccess && !isSyncing ? (
          <View className="w-full flex-row flex-wrap items-center justify-end gap-1.5">
            {hasConflict ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-9 items-center justify-center rounded-control border border-danger/30 bg-surface px-2.5 active:opacity-70"
                onPress={() => void retryConflict()}>
                <AppText variant="caption" tone="danger">{t('common.syncRetryConflict')}</AppText>
              </Pressable>
            ) : null}
            {hasConflict ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-9 items-center justify-center rounded-control border border-danger/30 bg-surface px-2.5 active:opacity-70"
                onPress={() => void discardConflict()}>
                <AppText variant="caption" tone="danger">{t('common.syncUseServer')}</AppText>
              </Pressable>
            ) : null}
            {!hasConflict ? <Pressable
              accessibilityRole="button"
              className="min-h-9 items-center justify-center rounded-control border border-line bg-surface px-2.5 active:opacity-70"
              disabled={retrying}
              onPress={() => void retry()}>
              <AppText variant="caption" tone="brand">{retrying ? t('common.loading') : t('common.syncRetry')}</AppText>
            </Pressable> : null}
            <Pressable
              accessibilityRole="button"
              className="min-h-9 items-center justify-center rounded-control bg-brand px-2.5 active:opacity-75"
              onPress={() => void enterOfflineUse()}>
              <AppText variant="caption" tone="onBrand">{t('common.offlineUseAction')}</AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
      {dialog.dialog}
    </>
  );
}

