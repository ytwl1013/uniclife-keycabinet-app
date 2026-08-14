import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Dialog } from 'heroui-native/dialog';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

import { mergeDeviceDateTimePickerPart } from './date-time';

export type DateTimeFieldProps = {
  label: string;
  value?: string;
  onChange: (isoUtc: string) => void;
  error?: string;
  emptyLabel?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateTimeField({
  emptyLabel,
  error,
  label,
  maximumDate,
  minimumDate,
  onChange,
  value,
}: DateTimeFieldProps) {
  const { locale, t } = useTranslation();
  const { mode } = useAppTheme();
  const current = parseDate(value);
  const pickerMinimumDate = validDate(minimumDate) ?? new Date(2000, 0, 1, 0, 0, 0, 0);
  const pickerMaximumDate = validDate(maximumDate) ?? defaultMaximumDate();
  const [open, setOpen] = useState(false);
  const [androidStage, setAndroidStage] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState(() => pickerDate(current ?? new Date(), pickerMinimumDate, pickerMaximumDate));

  const openPicker = () => {
    setDraft(pickerDate(current ?? new Date(), pickerMinimumDate, pickerMaximumDate));
    setAndroidStage('date');
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setOpen(false);
      setAndroidStage('date');
      return;
    }
    if (androidStage === 'date') {
      const nextIso = mergeDeviceDateTimePickerPart(
        draft.toISOString(),
        selected.toISOString(),
        'date',
      );
      if (!nextIso) return;
      const next = new Date(nextIso);
      if (!datePartIsInRange(next, pickerMinimumDate, pickerMaximumDate)) return;
      setDraft(next);
      setAndroidStage('time');
      return;
    }
    const androidIso = mergeDeviceDateTimePickerPart(draft.toISOString(), selected.toISOString(), 'time');
    if (!androidIso) {
      setOpen(false);
      setAndroidStage('date');
      return;
    }
    const next = new Date(androidIso);
    setDraft(next);
    onChange(next.toISOString());
    setOpen(false);
    setAndroidStage('date');
  };

  return (
    <View className="gap-2">
      <AppText variant="label" tone="foreground">{label}</AppText>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        className={`min-h-[50px] flex-row items-center gap-3 rounded-control border bg-background px-4 py-3 ${error ? 'border-danger' : 'border-line'} active:opacity-70`}
        onPress={openPicker}>
        <AppIcon name="calendar" size={20} tone="brand" />
        <AppText className="flex-1" variant="body" tone={current ? 'content' : 'muted'}>
          {current
            ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(current)
            : emptyLabel}
        </AppText>
        <AppIcon name="chevronDown" size={20} tone="muted" />
      </Pressable>
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          display="spinner"
          maximumDate={androidStage === 'date' ? pickerMaximumDate : undefined}
          minimumDate={androidStage === 'date' ? pickerMinimumDate : undefined}
          mode={androidStage}
          onChange={handleAndroidChange}
          value={draft}
        />
      ) : null}
      <Dialog
        isOpen={open && Platform.OS === 'ios'}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}>
        <Dialog.Portal unstable_accessibilityContainerViewIsModal>
          <Dialog.Overlay />
          <Dialog.Content className="max-h-[90%] w-full max-w-[430px] gap-3" isSwipeable={false} testID="date-time-picker-modal">
            <Dialog.Title>{label}</Dialog.Title>
            <View className="gap-1">
              <AppText variant="caption" tone="muted">{t('common.date')}</AppText>
              <DateTimePicker
                display="spinner"
                locale={locale}
                maximumDate={pickerMaximumDate}
                minimumDate={pickerMinimumDate}
                mode="date"
                onChange={(event, selected) => {
                  if (event.type === 'dismissed' || !selected) return;
                  const nextIso = mergeDeviceDateTimePickerPart(draft.toISOString(), selected.toISOString(), 'date');
                  if (!nextIso) return;
                  const next = new Date(nextIso);
                  if (datePartIsInRange(next, pickerMinimumDate, pickerMaximumDate)) setDraft(next);
                }}
                style={{ alignSelf: 'center', height: 170, width: '100%' }}
                testID="date-time-picker-date"
                themeVariant={mode}
                value={draft}
              />
            </View>
            <View className="gap-1">
              <AppText variant="caption" tone="muted">{t('common.time')}</AppText>
              <DateTimePicker
                display="spinner"
                locale={locale}
                minuteInterval={1}
                mode="time"
                onChange={(event, selected) => {
                  if (event.type === 'dismissed' || !selected) return;
                  const nextIso = mergeDeviceDateTimePickerPart(draft.toISOString(), selected.toISOString(), 'time');
                  if (nextIso) setDraft(new Date(nextIso));
                }}
                style={{ alignSelf: 'center', height: 130, width: '100%' }}
                testID="date-time-picker-time"
                themeVariant={mode}
                value={draft}
              />
            </View>
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 active:opacity-70"
                onPress={() => setOpen(false)}>
                <AppText variant="label" tone="foreground">{t('common.cancel')}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-1 items-center justify-center rounded-control bg-brand px-4 active:opacity-75"
                onPress={() => {
                  onChange(draft.toISOString());
                  setOpen(false);
                }}>
                <AppText variant="label" tone="onBrand">{t('common.confirm')}</AppText>
              </Pressable>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validDate(value?: Date) {
  return value && !Number.isNaN(value.getTime()) ? new Date(value) : undefined;
}

function defaultMaximumDate() {
  const maximum = new Date();
  maximum.setFullYear(maximum.getFullYear() + 20, 11, 31);
  maximum.setHours(23, 59, 59, 999);
  return maximum;
}

function pickerDate(value: Date, minimum: Date, maximum: Date) {
  const next = new Date(value);
  next.setSeconds(0, 0);
  if (next.getTime() < minimum.getTime()) return new Date(minimum);
  if (next.getTime() > maximum.getTime()) return new Date(maximum);
  return next;
}

function datePartIsInRange(value: Date, minimum: Date, maximum: Date) {
  const day = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const firstDay = new Date(minimum.getFullYear(), minimum.getMonth(), minimum.getDate()).getTime();
  const lastDay = new Date(maximum.getFullYear(), maximum.getMonth(), maximum.getDate()).getTime();
  return day >= firstDay && day <= lastDay;
}
