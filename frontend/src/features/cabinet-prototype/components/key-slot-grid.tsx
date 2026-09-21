import { router } from 'expo-router';
import { ReactElement, useCallback, useLayoutEffect, useRef } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';

import { AppIcon, AppIconTone } from '@/components/ui/app-icon';
import { useAppRefreshControl } from '@/components/ui/app-refresh-control';
import { AppText, AppTextTone } from '@/components/ui/app-text';
import { SpotlightRect } from '@/features/home/components/home-spotlight-guide';
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
  onRefresh,
  onSpotlightRect,
  refreshing,
  slots,
  spotlightSlotId,
}: {
  cabinetId: string;
  empty: ReactElement;
  header: ReactElement;
  onRefresh: () => void;
  onSpotlightRect?: (rect: SpotlightRect) => void;
  refreshing: boolean;
  slots: SlotView[];
  spotlightSlotId?: string;
}) {
  const { width } = useWindowDimensions();
  const refreshControl = useAppRefreshControl({ onRefresh, refreshing });
  const columns = width <= 375 ? 2 : 3;

  return (
    <FlatList
      alwaysBounceVertical
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
      refreshControl={refreshControl}
      renderItem={({ item }) => (
        <SlotCell
          cabinetId={cabinetId}
          columns={columns}
          onSpotlightRect={item.id === spotlightSlotId ? onSpotlightRect : undefined}
          slot={item}
          spotlighted={item.id === spotlightSlotId}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

function SlotCell({
  cabinetId,
  columns,
  onSpotlightRect,
  slot,
  spotlighted,
}: {
  cabinetId: string;
  columns: 2 | 3;
  onSpotlightRect?: (rect: SpotlightRect) => void;
  slot: SlotView;
  spotlighted: boolean;
}) {
  const { formatNumber, t } = useTranslation();
  const cellRef = useRef<View>(null);
  const spotlightFrame = useRef<number | undefined>(undefined);
  const style = config[slot.status];
  const href = !slot.keyId
    ? { pathname: '/cabinets/[cabinetId]/keys/new' as const, params: { cabinetId, slotId: slot.id, slotNumber: String(slot.number) } }
    : slot.status === 'available'
      ? { pathname: '/cabinets/[cabinetId]/loans/[keyId]' as const, params: { cabinetId, keyId: slot.keyId } }
      : { pathname: '/cabinets/[cabinetId]/keys/[keyId]' as const, params: { cabinetId, keyId: slot.keyId } };

  const reportSpotlightRect = useCallback(() => {
    if (!spotlighted) return;
    cellRef.current?.measureInWindow((x, y, width, height) => {
      onSpotlightRect?.({ x, y, width, height });
    });
  }, [onSpotlightRect, spotlighted]);
  const scheduleSpotlightRect = useCallback(() => {
    if (!spotlighted) return;
    if (spotlightFrame.current !== undefined) cancelAnimationFrame(spotlightFrame.current);
    spotlightFrame.current = requestAnimationFrame(() => {
      spotlightFrame.current = undefined;
      reportSpotlightRect();
    });
  }, [reportSpotlightRect, spotlighted]);
  useLayoutEffect(() => {
    if (!spotlighted) return;
    scheduleSpotlightRect();
    return () => {
      if (spotlightFrame.current !== undefined) cancelAnimationFrame(spotlightFrame.current);
    };
  }, [scheduleSpotlightRect, spotlighted]);

  return (
    <Pressable
      accessibilityLabel={`${t(trKey('key.slotNumber'), { number: formatNumber(slot.number) })}. ${slot.keyName ?? t(trKey('key.emptySlot'))}. ${t(trKey(`key.status.${slot.status}`))}`}
      accessibilityRole="button"
      className={`min-h-[112px] gap-2 overflow-hidden rounded-card border p-3 ${style.border} ${style.background} ${spotlighted ? 'border-brand' : ''} active:opacity-70`}
      onLayout={scheduleSpotlightRect}
      style={{ flex: 1, maxWidth: columns === 2 ? '48.7%' : '31.9%' }}
      onPress={() => router.push(href as never)}
      ref={cellRef}
      testID={spotlighted ? 'cabinet-guide-register-slot' : undefined}>
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
