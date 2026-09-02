import { router } from 'expo-router';
import { Dialog } from 'heroui-native/dialog';
import { useToast } from 'heroui-native/toast';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { type Cabinet, useApp } from '@/app-state';
import { AppIcon } from '@/components/ui/app-icon';
import { AppRefreshControl } from '@/components/ui/app-refresh-control';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { ProductImage } from '@/components/ui/product-image';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import {
  Notice,
  ScreenHeader,
  StatePanel,
} from '@/features/cabinet-prototype/components/prototype-ui';
import { useAppRefresh } from '@/features/app-refresh/use-app-refresh';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

export default function CabinetManagementRoute() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { actions, selectors, state } = useApp();
  const { palette } = useAppTheme();
  const { onRefresh, refreshing } = useAppRefresh();
  const cabinets = selectors.cabinetsForCurrentUser();
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet>();
  const [removingCabinetId, setRemovingCabinetId] = useState<string>();
  const selectedIsSuperAdmin = Boolean(
    selectedCabinet && selectors.isCabinetSuperAdmin(selectedCabinet.id),
  );

  const setConfirmationOpen = (open: boolean) => {
    if (!open && !removingCabinetId) setSelectedCabinet(undefined);
  };

  const removeCabinet = async () => {
    if (!selectedCabinet || removingCabinetId) return;
    const cabinet = selectedCabinet;
    const isSuperAdmin = selectors.isCabinetSuperAdmin(cabinet.id);
    setRemovingCabinetId(cabinet.id);
    try {
      const writeOptions = {
        cabinetId: cabinet.id,
        expectedVersion: cabinet.version,
        requestId: `${isSuperAdmin ? 'delete' : 'disconnect'}-cabinet-${cabinet.id}-${cabinet.version}`,
      };
      if (isSuperAdmin) {
        await actions.deleteCabinet(writeOptions);
      } else {
        await actions.disconnectCabinet(writeOptions);
      }
      setSelectedCabinet(undefined);
      toast.show({
        duration: 3000,
        id: `cabinet-removed-${cabinet.id}`,
        label: t(
          isSuperAdmin
            ? 'cabinetManagement.deletedSuccess'
            : 'cabinetManagement.removedSuccess',
          { cabinet: cabinet.name },
        ),
        placement: 'bottom',
        variant: 'success',
      });
    } catch {
      setSelectedCabinet(undefined);
      toast.show({
        duration: 3000,
        id: `cabinet-remove-error-${cabinet.id}`,
        label: t('cabinetManagement.actionFailed'),
        placement: 'bottom',
        variant: 'danger',
      });
    } finally {
      setRemovingCabinetId(undefined);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
          <ScreenHeader
            onBack={() => router.back()}
            subtitle={t('cabinetManagement.description')}
            title={t('cabinetManagement.title')}
          />
        </View>
      </View>

      <ScrollView
        alwaysBounceVertical
        className="min-w-0 flex-1"
        contentContainerClassName="mx-auto w-full max-w-content gap-4 px-screen pb-screen pt-screen"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<AppRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        {!state.online ? (
          <Notice
            description={t('cabinetManagement.offlineDescription')}
            title={t('cabinetManagement.offlineTitle')}
            tone="warning"
          />
        ) : null}

        {cabinets.length ? cabinets.map((cabinet) => {
          const sku = selectors.skuById(cabinet.skuId);
          const metrics = selectors.cabinetMetrics(cabinet.id);
          const isSuperAdmin = selectors.isCabinetSuperAdmin(cabinet.id);
          const removing = removingCabinetId === cabinet.id;
          return (
            <View
              className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card"
              key={cabinet.id}
              testID={`cabinet-management-item-${cabinet.id}`}>
              <View className="h-[82px] w-[82px] items-center justify-center rounded-[16px] bg-background">
                <ProductImage
                  accessibilityLabel={sku?.name ?? cabinet.name}
                  assetKey={sku?.imageAsset}
                  variant="thumbnail"
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <AppText numberOfLines={1} variant="title" tone="foreground">
                  {cabinet.name}
                </AppText>
                <AppText numberOfLines={1} variant="caption" tone="muted">
                  {sku?.model ?? sku?.sku ?? cabinet.location}
                </AppText>
                <AppText variant="caption" tone="content">
                  {t('common.cabinetMeta', {
                    overdue: metrics.overdue,
                    slots: metrics.capacity,
                  })}
                </AppText>
                {isSuperAdmin ? (
                  <View className="items-start">
                    <Pill tone="purple">{t('cabinet.role.superAdmin')}</Pill>
                  </View>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel={t('cabinetManagement.removeAccessibilityLabel', {
                  cabinet: cabinet.name,
                })}
                accessibilityRole="button"
                accessibilityState={{ disabled: !state.online || Boolean(removingCabinetId) }}
                className={`h-11 w-11 items-center justify-center rounded-pill bg-danger-soft ${
                  !state.online || removingCabinetId ? 'opacity-45' : 'active:opacity-70'
                }`}
                disabled={!state.online || Boolean(removingCabinetId)}
                hitSlop={8}
                onPress={() => setSelectedCabinet(cabinet)}
                testID={`cabinet-management-remove-${cabinet.id}`}>
                {removing ? (
                  <ActivityIndicator color={palette.danger} size="small" />
                ) : (
                  <AppIcon name="trash" size={21} tone="danger" />
                )}
              </Pressable>
            </View>
          );
        }) : (
          <StatePanel
            description={t('cabinetManagement.emptyDescription')}
            icon="cabinet"
            title={t('cabinetManagement.emptyTitle')}
          />
        )}
      </ScrollView>

      <Dialog isOpen={Boolean(selectedCabinet)} onOpenChange={setConfirmationOpen}>
        <Dialog.Portal unstable_accessibilityContainerViewIsModal>
          <Dialog.Overlay />
          <Dialog.Content
            className="w-full max-w-[430px] gap-4"
            isSwipeable={false}
            testID="cabinet-remove-confirmation-modal">
            <View className="items-center gap-4 py-2">
              <View className="h-16 w-16 items-center justify-center rounded-pill bg-danger-soft">
                <AppIcon name="trash" size={29} tone="danger" />
              </View>
              <View className="items-center gap-2">
                <Dialog.Title className="text-center">
                  {t(selectedIsSuperAdmin
                    ? 'cabinetManagement.deleteConfirmTitle'
                    : 'cabinetManagement.confirmTitle', {
                    cabinet: selectedCabinet?.name ?? '',
                  })}
                </Dialog.Title>
                <Dialog.Description className="text-center">
                  {t(selectedIsSuperAdmin
                    ? 'cabinetManagement.deleteConfirmDescription'
                    : 'cabinetManagement.confirmDescription')}
                </Dialog.Description>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                className={`min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 ${
                  removingCabinetId ? 'opacity-45' : 'active:opacity-70'
                }`}
                disabled={Boolean(removingCabinetId)}
                onPress={() => setSelectedCabinet(undefined)}>
                <AppText variant="label" tone="foreground">
                  {t('common.cancel')}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-control bg-danger px-4 ${
                  removingCabinetId ? 'opacity-60' : 'active:opacity-75'
                }`}
                disabled={Boolean(removingCabinetId)}
                onPress={() => void removeCabinet()}
                testID="cabinet-remove-confirm-button">
                {removingCabinetId ? (
                  <ActivityIndicator color={palette.onBrand} size="small" />
                ) : (
                  <AppIcon name="trash" size={19} tone="onBrand" />
                )}
                <AppText variant="label" tone="onBrand">
                  {removingCabinetId
                    ? t('cabinetManagement.removing')
                    : t(selectedIsSuperAdmin
                      ? 'cabinetManagement.deleteConfirm'
                      : 'cabinetManagement.removeConfirm')}
                </AppText>
              </Pressable>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </SafeAreaView>
  );
}
