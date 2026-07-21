import { View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { CabinetDetail } from '@/features/cabinets/types';
import { useTranslation } from '@/i18n';

export function CabinetSummaryCard({ cabinet }: { cabinet: CabinetDetail }) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-card shadow-card">
      <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand">
        <AppIcon name="cabinet" size={30} tone="onBrand" />
      </View>
      <Info label={t('cabinetDetail.location')} value={t('common.locationFloor', { location: t(cabinet.locationKey), floor: t(cabinet.floorKey) })} />
      <View className="h-[54px] w-px bg-line" />
      <Info label={t('cabinetDetail.capacity')} value={t('cabinetDetail.capacityValue', { count: cabinet.capacity })} />
      <View className="h-[54px] w-px bg-line" />
      <Info label={t('cabinetDetail.serialNumber')} value={cabinet.serialNumber} />
      <AppIcon name="chevronRight" size={28} tone="muted" />
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1">
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="label" tone="foreground">{value}</AppText>
    </View>
  );
}
