import { View } from 'react-native';

import { AppIcon, AppIconTone } from '@/components/ui/app-icon';
import { AppText, AppTextTone } from '@/components/ui/app-text';
import { KeySlot, KeySlotStatus } from '@/features/cabinets/types';
import { TranslationKey, useTranslation } from '@/i18n';

const statusConfig: Record<KeySlotStatus, { borderClass: string; dotClass: string; iconTone: AppIconTone; textTone: AppTextTone; labelKey: TranslationKey }> = {
  available: { borderClass: 'border-brand', dotClass: 'bg-brand', iconTone: 'brand', textTone: 'brand', labelKey: 'cabinetDetail.available' },
  checkedOut: { borderClass: 'border-warning', dotClass: 'bg-warning', iconTone: 'warning', textTone: 'warning', labelKey: 'cabinetDetail.checkedOut' },
  overdue: { borderClass: 'border-danger', dotClass: 'bg-danger', iconTone: 'danger', textTone: 'danger', labelKey: 'cabinetDetail.overdue' },
  empty: { borderClass: 'border-muted', dotClass: 'bg-muted', iconTone: 'muted', textTone: 'muted', labelKey: 'cabinetDetail.empty' },
};

export function KeySlotGrid({ slots, totalSlots }: { slots: KeySlot[]; totalSlots: number }) {
  const { formatNumber, t } = useTranslation();
  const hiddenStart = slots.length + 1;

  return (
    <View className="gap-3.5">
      <AppText variant="title" tone="foreground">{t('cabinetDetail.slotsTitle', { count: totalSlots })}</AppText>
      <View className="flex-row flex-wrap gap-3.5">
        {slots.map((slot) => <SlotCell key={slot.number} slot={slot} />)}
      </View>
      {hiddenStart <= totalSlots ? (
        <View className="self-center flex-row items-center gap-1 rounded-control border border-line px-4 py-2">
          <AppText variant="label" tone="brand">{t('cabinetDetail.viewMore', { range: `${formatNumber(hiddenStart)}–${formatNumber(totalSlots)}` })}</AppText>
          <AppIcon name="expand" size={20} tone="brand" />
        </View>
      ) : null}
      <View className="flex-row flex-wrap gap-4 border-t border-line pt-3.5">
        {(Object.keys(statusConfig) as KeySlotStatus[]).map((status) => <LegendItem key={status} status={status} />)}
      </View>
    </View>
  );
}

function SlotCell({ slot }: { slot: KeySlot }) {
  const { formatNumber, t } = useTranslation();
  const config = statusConfig[slot.status];

  return (
    <View className={`h-[78px] w-[17.6%] items-center justify-center gap-1.5 rounded-card border-[1.5px] bg-surface ${config.borderClass} ${slot.status === 'empty' ? 'border-dashed' : 'border-solid'}`}>
      <AppText variant="title" tone={config.textTone}>{formatNumber(slot.number).padStart(2, '0')}</AppText>
      {slot.status === 'checkedOut' ? (
        <View className="max-w-[58px] flex-row items-center">
          <AppIcon name="person" size={13} tone={config.iconTone} />
          <AppText className="shrink" numberOfLines={1} variant="caption" tone={config.textTone}>{slot.holder}</AppText>
        </View>
      ) : null}
      {slot.status === 'overdue' ? (
        <View className="items-center gap-0.5">
          <AppIcon name="error" size={15} tone={config.iconTone} />
          <AppText variant="caption" tone={config.textTone}>{t(config.labelKey)}</AppText>
        </View>
      ) : null}
      {slot.status === 'available' ? <View className={`h-2.5 w-2.5 rounded-pill ${config.dotClass}`} /> : null}
      {slot.status === 'empty' ? <AppIcon name="empty" size={17} tone={config.iconTone} /> : null}
    </View>
  );
}

function LegendItem({ status }: { status: KeySlotStatus }) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2.5 w-2.5 rounded-pill ${config.dotClass}`} />
      <AppText variant="caption" tone="muted">{t(config.labelKey)}</AppText>
    </View>
  );
}
