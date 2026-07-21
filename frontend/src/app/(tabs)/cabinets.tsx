import { Pressable, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { SearchBox } from '@/components/ui/search-box';
import { CabinetCard } from '@/features/cabinets/components/cabinet-card';
import { demoCabinets } from '@/features/cabinets/demo-data';
import { useTranslation } from '@/i18n';

export default function CabinetsRoute() {
  const { formatNumber, t } = useTranslation();

  return (
    <AppScreen>
      <View className="flex-row items-center justify-between">
        <AppText variant="display" tone="foreground">{t('cabinets.title')}</AppText>
        <View className="relative">
          <AppIcon name="notification" size={29} tone="foreground" />
          <View className="absolute -right-1 -top-1 h-[18px] w-[18px] items-center justify-center rounded-pill bg-brand">
            <AppText className="text-[11px] leading-[13px]" tone="onBrand">{formatNumber(2)}</AppText>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <SearchBox placeholder={t('cabinets.searchPlaceholder')} />
        <Pressable className="min-h-[52px] flex-row items-center gap-2 rounded-control bg-brand px-4 active:opacity-70">
          <AppIcon name="scan" size={24} tone="onBrand" />
          <AppText variant="label" tone="onBrand">{t('cabinets.scanToAdd')}</AppText>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between">
        <AppText variant="label" tone="muted">{t('cabinets.count', { count: demoCabinets.length })}</AppText>
        <AppText variant="label" tone="muted">{t('cabinets.sortByName')}</AppText>
      </View>

      <View className="gap-3">
        {demoCabinets.map((cabinet) => <CabinetCard cabinet={cabinet} key={cabinet.id} />)}
      </View>

      <Pressable className="flex-row items-center gap-3 rounded-card border border-line bg-brand-soft p-3.5 active:opacity-70">
        <View className="h-11 w-11 items-center justify-center rounded-pill bg-surface">
          <AppIcon name="shield" size={28} tone="brand" />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText variant="label" tone="foreground">{t('cabinets.securityTitle')}</AppText>
          <AppText variant="caption" tone="muted">{t('cabinets.securityDescription')}</AppText>
        </View>
        <AppIcon name="chevronRight" size={26} tone="muted" />
      </Pressable>

      <View className="hidden"><Pill>{t('common.demoDataOnly')}</Pill></View>
    </AppScreen>
  );
}
