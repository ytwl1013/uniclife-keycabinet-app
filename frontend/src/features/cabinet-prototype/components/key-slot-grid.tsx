import { router } from 'expo-router';
import { ReactElement } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';

import { AppIcon, AppIconTone } from '@/components/ui/app-icon';
import { AppText, AppTextTone } from '@/components/ui/app-text';
import { TranslationKey, useTranslation } from '@/i18n';

import { KeyStatus, SlotView } from '../types';

const trKey = (key: string) => key as TranslationKey;

const config: Record<KeyStatus, { border: string; background: string; iconTone: AppIconTone; textTone: AppTextTone }> = {
  available: { border: 'border-success/45', background: 'bg-success-soft', iconTone: 'success', textTone: 'success' },
  checkedOut: { border: 'border-warning/45', background: 'bg-warning-soft', iconTone: 'warning', textTone: 'warning' },
  overdue: { border: 'border-danger/45', background: 'bg-danger-soft', iconTone: 'danger', textTone: 'danger' },
  empty: { border: 'border-line border-dashed', background: 'bg-background', iconTone: 'muted', textTone: 'muted' },
};

export function PrototypeKeySlotGrid({
  cabinetId,
  empty,
  header,
  slots,
}: {
  cabinetId: string;
  empty: ReactElement;
  header: ReactElement;
  slots: SlotView[];
}) {
  const { width } = useWindowDimensions();
  const columns = width <= 375 ? 2 : 3;

  return (
    <FlatList
      className="min-w-0 flex-1"
      columnWrapperStyle={{ columnGap: 10 }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 20, paddingHorizontal: 20, paddingTop: 20, rowGap: 10 }}
      data={slots}
      key={`key-grid-${columns}`}
      keyExtractor={(slot) => slot.id}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={empty}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={{ marginBottom: 18 }}
      numColumns={columns}
      renderItem={({ item }) => <SlotCell cabinetId={cabinetId} columns={columns} slot={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function SlotCell({ cabinetId, columns, slot }: { cabinetId: string; columns: 2 | 3; slot: SlotView }) {
  const { formatNumber, t } = useTranslation();
  const style = config[slot.status];
  const href = slot.keyId
    ? { pathname: '/cabinets/[cabinetId]/keys/[keyId]' as const, params: { cabinetId, keyId: slot.keyId } }
    : { pathname: '/cabinets/[cabinetId]/keys/new' as const, params: { cabinetId, slotId: slot.id, slotNumber: String(slot.number) } };

  return (
    <Pressable
      accessibilityLabel={`${t(trKey('key.slotNumber'), { number: formatNumber(slot.number) })}. ${slot.keyName ?? t(trKey('key.emptySlot'))}. ${t(trKey(`key.status.${slot.status}`))}`}
      accessibilityRole="button"
      className={`min-h-[112px] gap-2 overflow-hidden rounded-card border p-3 ${style.border} ${style.background} active:opacity-70`}
      style={{ flex: 1, maxWidth: columns === 2 ? '48.7%' : '31.9%' }}
      onPress={() => router.push(href as never)}>
      <View className="flex-row items-center justify-between">
        <AppText variant="caption" tone="muted">{t(trKey('key.slotNumber'), { number: formatNumber(slot.number) })}</AppText>
        <AppIcon name={slot.status === 'empty' ? 'empty' : 'key'} size={18} tone={style.iconTone} />
      </View>
      <AppText className="flex-1" numberOfLines={2} variant="label" tone={slot.keyId ? 'foreground' : 'muted'}>
        {slot.keyName ?? t(trKey('key.addKey'))}
      </AppText>
      <View className="flex-row items-center gap-1.5">
        <View className={`h-4 w-1 rounded-pill ${slot.status === 'available' ? 'bg-success' : slot.status === 'checkedOut' ? 'bg-warning' : slot.status === 'overdue' ? 'bg-danger' : 'bg-muted'}`} />
        <AppText variant="caption" tone={style.textTone}>{t(trKey(`key.status.${slot.status}`))}</AppText>
      </View>
    </Pressable>
  );
}
