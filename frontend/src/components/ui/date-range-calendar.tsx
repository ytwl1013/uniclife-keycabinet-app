import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';

export type DateRangeCalendarProps = {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  locale: string;
  onFromChange: (isoUtc: string) => void;
  onToChange: (isoUtc: string) => void;
  error?: string;
};

export function DateRangeCalendar({
  error,
  from,
  fromLabel,
  locale,
  onFromChange,
  onToChange,
  to,
  toLabel,
}: DateRangeCalendarProps) {
  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const [androidOpen, setAndroidOpen] = useState(false);
  const selectedValue = validDate(activeField === 'from' ? from : to);

  const selectField = (field: 'from' | 'to') => {
    setActiveField(field);
    if (Platform.OS === 'android') setAndroidOpen(true);
  };
  const updateDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setAndroidOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    const next = selected.toISOString();
    if (activeField === 'from') onFromChange(startOfDay(next));
    else onToChange(endOfDay(next));
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <DateRangeField
          active={activeField === 'from'}
          label={fromLabel}
          locale={locale}
          onPress={() => selectField('from')}
          value={from}
        />
        <DateRangeField
          active={activeField === 'to'}
          label={toLabel}
          locale={locale}
          onPress={() => selectField('to')}
          value={to}
        />
      </View>

      {Platform.OS === 'ios' || androidOpen ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          mode="date"
          onChange={updateDate}
          style={Platform.OS === 'ios' ? { alignSelf: 'center' } : undefined}
          value={selectedValue}
        />
      ) : null}

      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
    </View>
  );
}

function DateRangeField({
  active,
  label,
  locale,
  onPress,
  value,
}: {
  active: boolean;
  label: string;
  locale: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`min-h-16 flex-1 gap-1 rounded-control border px-3 py-2.5 ${
        active ? 'border-brand bg-brand-soft' : 'border-line bg-background'
      } active:opacity-70`}
      onPress={onPress}>
      <View className="flex-row items-center gap-2">
        <AppIcon name="calendar" size={17} tone={active ? 'brand' : 'muted'} />
        <AppText variant="caption" tone={active ? 'brand' : 'muted'}>{label}</AppText>
      </View>
      <AppText numberOfLines={1} variant="label" tone="foreground">
        {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(validDate(value))}
      </AppText>
    </Pressable>
  );
}

function validDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function startOfDay(value: string) {
  const date = validDate(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfDay(value: string) {
  const date = validDate(value);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}
