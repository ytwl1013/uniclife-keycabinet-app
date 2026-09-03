import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { ProductImage } from '@/components/ui/product-image';
import { TranslationKey, useTranslation } from '@/i18n';

import { CabinetView } from '../types';

const trKey = (key: string) => key as TranslationKey;

export function PrototypeCabinetCard({ cabinet }: { cabinet: CabinetView }) {
  const { t } = useTranslation();
  const statusTone = cabinet.status === 'online' ? 'green' : cabinet.status === 'maintenance' ? 'orange' : 'gray';

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3.5 rounded-card border border-line bg-surface p-3.5 shadow-card active:opacity-75"
      onPress={() => router.push({ pathname: '/cabinets/[cabinetId]', params: { cabinetId: cabinet.id } })}>
      <View className="h-[88px] w-[88px] items-center justify-center rounded-[18px] bg-background">
        <ProductImage accessibilityLabel={`${cabinet.model} ${cabinet.color}`} assetKey={cabinet.imageAsset} imagePath={cabinet.imagePath} variant="thumbnail" />
      </View>
      <View className="min-w-0 flex-1 gap-1.5">
        <View className="flex-row items-start gap-2">
          <AppText className="flex-1" numberOfLines={2} variant="title" tone="foreground">{cabinet.name}</AppText>
          <AppIcon name="chevronRight" size={22} tone="muted" />
        </View>
        <View className="flex-row items-center gap-2">
          <AppText className="min-w-0 flex-1" numberOfLines={1} variant="caption" tone="content">{cabinet.location}</AppText>
          <Pill tone={statusTone}>{t(trKey(`cabinet.status.${cabinet.status}`))}</Pill>
        </View>
        <AppText numberOfLines={1} variant="caption" tone="muted">{cabinet.model} · {cabinet.color}</AppText>
        <View className="flex-row items-center gap-3 pt-1">
          <CompactMetric label={t(trKey('cabinet.available'))} tone="success" value={cabinet.availableCount} />
          <CompactMetric label={t(trKey('cabinet.checkedOut'))} tone="warning" value={cabinet.checkedOutCount} />
          {cabinet.overdueCount ? <CompactMetric label={t(trKey('cabinet.overdue'))} tone="danger" value={cabinet.overdueCount} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function CompactMetric({ label, tone, value }: { label: string; tone: 'success' | 'warning' | 'danger'; value: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <AppText variant="label" tone={tone}>{value}</AppText>
      <AppText variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}
