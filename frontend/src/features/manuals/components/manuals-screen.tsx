import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useToast } from 'heroui-native/toast';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { useApp } from '@/app-state';
import { AppIcon } from '@/components/ui/app-icon';
import { AppRefreshControl } from '@/components/ui/app-refresh-control';
import { AppText } from '@/components/ui/app-text';
import { ProductImage } from '@/components/ui/product-image';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { useAppRefresh } from '@/features/app-refresh/use-app-refresh';
import { ScreenHeader, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import {
  type CabinetManual,
  selectCabinetManuals,
} from '@/features/manuals/select-cabinet-manuals';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

export function ManualsScreen() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { selectors } = useApp();
  const { onRefresh, refreshing } = useAppRefresh();
  const { palette } = useAppTheme();
  const [openingCabinetId, setOpeningCabinetId] = useState<string>();
  const manuals = selectCabinetManuals(
    selectors.cabinetsForCurrentUser(),
    selectors.skuById,
  );

  const openManual = async (item: CabinetManual) => {
    if (openingCabinetId) return;
    setOpeningCabinetId(item.cabinet.id);
    try {
      await WebBrowser.openBrowserAsync(item.url);
    } catch {
      toast.show({
        duration: 3000,
        id: `manual-open-error-${item.cabinet.id}`,
        label: t('manuals.openFailed'),
        placement: 'bottom',
        variant: 'danger',
      });
    } finally {
      setOpeningCabinetId(undefined);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
          <ScreenHeader
            onBack={() => router.back()}
            subtitle={t('manuals.subtitle', { count: manuals.length })}
            title={t('manuals.title')}
          />
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1">
        <FlatList
          alwaysBounceVertical
          className="min-w-0 flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 20, rowGap: 12 }}
          data={manuals}
          keyExtractor={(item) => item.cabinet.id}
          ListEmptyComponent={(
            <StatePanel
              description={t('manuals.emptyDescription')}
              icon="manual"
              title={t('manuals.emptyTitle')}
            />
          )}
          refreshControl={<AppRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
          renderItem={({ item }) => {
            const opening = openingCabinetId === item.cabinet.id;
            return (
              <Pressable
                accessibilityLabel={t('manuals.openAccessibilityLabel', {
                  cabinet: item.cabinet.name,
                })}
                accessibilityRole="link"
                accessibilityState={{ busy: opening, disabled: Boolean(openingCabinetId) }}
                className={`flex-row items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card ${
                  openingCabinetId ? 'opacity-60' : 'active:opacity-75'
                }`}
                disabled={Boolean(openingCabinetId)}
                onPress={() => void openManual(item)}
                testID={`manual-item-${item.cabinet.id}`}>
                <View className="h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-[16px] bg-background">
                  <ProductImage
                    accessibilityLabel={item.sku.name}
                    assetKey={item.sku.imageAsset}
                    imagePath={item.sku.imagePath}
                    variant="thumbnail"
                  />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <AppText numberOfLines={2} variant="title" tone="foreground">
                    {item.cabinet.name}
                  </AppText>
                  <AppText numberOfLines={1} variant="caption" tone="content">
                    {item.sku.name}
                  </AppText>
                  {/* <AppText numberOfLines={1} variant="caption" tone="muted">
                    {item.sku.sku}
                  </AppText> */}
                </View>
                <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft">
                  {opening ? (
                    <ActivityIndicator color={palette.brand} size="small" />
                  ) : (
                    <AppIcon name="chevronRight" size={22} tone="brand" />
                  )}
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
