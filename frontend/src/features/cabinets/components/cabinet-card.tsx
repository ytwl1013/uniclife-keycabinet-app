import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { CabinetListItem, CabinetStatus } from '@/features/cabinets/types';
import { TranslationKey, useTranslation } from '@/i18n';

const statusKeys: Record<CabinetStatus, TranslationKey> = {
  online: 'common.online',
  offline: 'common.offline',
  maintenance: 'common.maintenance',
};

const metricDotClasses = {
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
} as const;

export function CabinetCard({ cabinet }: { cabinet: CabinetListItem }) {
  const { t } = useTranslation();
  const total = cabinet.metrics.available + cabinet.metrics.checkedOut + cabinet.metrics.overdue;
  const location = t(cabinet.locationKey);
  const floor = t(cabinet.floorKey);

  return (
    <Link asChild href={{ pathname: '/cabinets/[cabinetId]', params: { cabinetId: cabinet.id } }}>
      <Pressable className="gap-card rounded-card border border-line bg-surface p-card shadow-card active:opacity-70">
        <View className="flex-row items-center gap-3.5">
          <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand">
            <AppIcon name="cabinet" size={30} tone="onBrand" />
          </View>
          <View className="flex-1 gap-1">
            <AppText variant="title" tone="foreground">{t(cabinet.nameKey)}</AppText>
            <View className="flex-row items-center gap-1">
              <AppIcon name="location" size={15} tone="brand" />
              <AppText variant="caption" tone="content">{t('common.locationFloor', { location, floor })}</AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {t('common.modelCapacity', { model: cabinet.model, count: cabinet.capacity })}
            </AppText>
          </View>
          <View className="flex-row items-center gap-0.5">
            <Pill tone={cabinet.status === 'online' ? 'green' : 'gray'}>{t(statusKeys[cabinet.status])}</Pill>
            <AppIcon name="chevronRight" size={26} tone="muted" />
          </View>
        </View>

        <View className="flex-row border-t border-line pt-3.5">
          <Metric label={t('cabinets.available')} percent={total ? Math.round((cabinet.metrics.available / total) * 100) : 0} tone="green" value={cabinet.metrics.available} />
          <View className="w-px bg-line" />
          <Metric label={t('cabinets.checkedOut')} percent={total ? Math.round((cabinet.metrics.checkedOut / total) * 100) : 0} tone="orange" value={cabinet.metrics.checkedOut} />
          <View className="w-px bg-line" />
          <Metric label={t('cabinets.overdue')} percent={total ? Math.round((cabinet.metrics.overdue / total) * 100) : 0} tone="red" value={cabinet.metrics.overdue} />
        </View>
      </Pressable>
    </Link>
  );
}

function Metric({ label, value, percent, tone }: { label: string; value: number; percent: number; tone: keyof typeof metricDotClasses }) {
  const { formatNumber } = useTranslation();

  return (
    <View className="flex-1 items-center gap-1">
      <AppText className="text-center" variant="caption" tone="muted">{label}</AppText>
      <AppText variant="metric" tone="foreground">{formatNumber(value)}</AppText>
      <View className="flex-row items-center gap-1.5">
        <View className={`h-2 w-2 rounded-pill ${metricDotClasses[tone]}`} />
        <AppText variant="caption" tone="muted">{formatNumber(percent)}%</AppText>
      </View>
    </View>
  );
}
