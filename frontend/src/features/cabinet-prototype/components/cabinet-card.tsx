import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { TranslationKey, useTranslation } from '@/i18n';

import { CabinetView } from '../types';
import { Stat } from './prototype-ui';

const trKey = (key: string) => key as TranslationKey;

export function PrototypeCabinetCard({ cabinet }: { cabinet: CabinetView }) {
  const { t } = useTranslation();
  const statusTone = cabinet.status === 'online' ? 'green' : cabinet.status === 'maintenance' ? 'orange' : 'gray';

  return (
    <Pressable
      accessibilityRole="button"
      className="gap-4 rounded-card border border-line bg-surface p-card shadow-card active:opacity-75"
      onPress={() => router.push({ pathname: '/cabinets/[cabinetId]', params: { cabinetId: cabinet.id } })}>
      <View className="flex-row items-center gap-3.5">
        <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-brand-soft">
          <AppIcon name="cabinet" size={29} tone="brand" />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <AppText numberOfLines={1} variant="title" tone="foreground">{cabinet.name}</AppText>
          <AppText numberOfLines={1} variant="caption" tone="content">{cabinet.location}</AppText>
          <AppText numberOfLines={1} variant="caption" tone="muted">{cabinet.skuCode} · {cabinet.model} · {cabinet.color}</AppText>
        </View>
        <View className="items-end gap-2">
          <Pill tone={statusTone}>{t(trKey(`cabinet.status.${cabinet.status}`))}</Pill>
          <AppIcon name="chevronRight" size={24} tone="muted" />
        </View>
      </View>
      <View className="flex-row gap-2 border-t border-line pt-3.5">
        <Stat label={t(trKey('cabinet.available'))} tone="success" value={cabinet.availableCount} />
        <Stat label={t(trKey('cabinet.checkedOut'))} tone="warning" value={cabinet.checkedOutCount} />
        <Stat label={t(trKey('cabinet.overdue'))} tone="danger" value={cabinet.overdueCount} />
      </View>
    </Pressable>
  );
}
