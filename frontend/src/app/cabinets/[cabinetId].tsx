import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { SearchBox } from '@/components/ui/search-box';
import { CabinetSummaryCard } from '@/features/cabinets/components/cabinet-summary-card';
import { KeySlotGrid } from '@/features/cabinets/components/key-slot-grid';
import { mainCabinetDetail } from '@/features/cabinets/demo-data';
import { TranslationKey, useTranslation } from '@/i18n';

const filters = [
  { key: 'cabinetDetail.all', tone: 'blue' },
  { key: 'cabinetDetail.available', tone: 'gray' },
  { key: 'cabinetDetail.checkedOut', tone: 'gray' },
  { key: 'cabinetDetail.overdue', tone: 'gray' },
] as const satisfies readonly { key: TranslationKey; tone: PillTone }[];

export default function CabinetDetailRoute() {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityLabel={t('navigation.cabinets')} className="h-11 w-9 items-center justify-center active:opacity-70" onPress={() => router.back()}>
          <AppIcon name="back" size={28} tone="brand" />
        </Pressable>
        <View className="flex-1 items-center gap-1.5">
          <AppText className="text-center" variant="pageTitle" tone="foreground">{t(mainCabinetDetail.nameKey)}</AppText>
          <View className="flex-row items-center gap-1">
            <AppIcon name="location" size={18} tone="brand" />
            <AppText variant="body" tone="muted">
              {t('common.locationFloor', { location: t(mainCabinetDetail.locationKey), floor: t(mainCabinetDetail.floorKey) })}
            </AppText>
          </View>
        </View>
        <Pressable className="active:opacity-70">
          <AppIcon name="more" size={28} tone="brand" />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        {filters.map((filter) => <Pill key={filter.key} tone={filter.tone}>{t(filter.key)}</Pill>)}
      </View>

      <CabinetSummaryCard cabinet={mainCabinetDetail} />

      <View className="flex-row">
        <SearchBox placeholder={t('cabinetDetail.searchPlaceholder')} />
        <Pressable className="w-[58px] items-center justify-center rounded-r-control border border-l-0 border-line bg-surface active:opacity-70">
          <AppIcon name="filter" size={24} tone="muted" />
        </Pressable>
      </View>

      <KeySlotGrid slots={mainCabinetDetail.slots} totalSlots={mainCabinetDetail.capacity} />
    </AppScreen>
  );
}
