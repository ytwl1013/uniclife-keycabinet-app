import { Dialog } from 'heroui-native/dialog';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { DateRangeCalendar } from '@/components/ui/date-range-calendar';

export type DateRangePickerModalProps = {
  applyLabel: string;
  clearLabel: string;
  errorLabel: string;
  from: string;
  fromLabel: string;
  locale: string;
  onApply: (range: { from: string; to: string }) => void;
  onClear: () => void;
  onClose: () => void;
  title: string;
  to: string;
  toLabel: string;
  visible: boolean;
};

export function DateRangePickerModal({
  applyLabel,
  clearLabel,
  errorLabel,
  from,
  fromLabel,
  locale,
  onApply,
  onClear,
  onClose,
  title,
  to,
  toLabel,
  visible,
}: DateRangePickerModalProps) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const rangeValid = Date.parse(draftFrom) <= Date.parse(draftTo);

  useEffect(() => {
    if (!visible) return;
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to, visible]);

  return (
    <Dialog isOpen={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal unstable_accessibilityContainerViewIsModal>
        <Dialog.Overlay />
        <Dialog.Content className="w-full max-w-[430px] gap-4" isSwipeable={false} testID="borrowed-date-range-modal">
          <Dialog.Title>{title}</Dialog.Title>
          <DateRangeCalendar
            error={rangeValid ? undefined : errorLabel}
            from={draftFrom}
            fromLabel={fromLabel}
            locale={locale}
            onFromChange={setDraftFrom}
            onToChange={setDraftTo}
            to={draftTo}
            toLabel={toLabel}
          />
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 active:opacity-70"
              onPress={onClear}>
              <AppText variant="label" tone="foreground">{clearLabel}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !rangeValid }}
              className={`min-h-12 flex-1 items-center justify-center rounded-control bg-brand px-4 ${rangeValid ? 'active:opacity-75' : 'opacity-40'}`}
              disabled={!rangeValid}
              onPress={() => onApply({ from: draftFrom, to: draftTo })}>
              <AppText variant="label" tone="onBrand">{applyLabel}</AppText>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
