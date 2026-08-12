import type { ComponentProps, ComponentType } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

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

type WebDateInputProps = ComponentProps<typeof TextInput> & { type: 'date' };
const WebDateInput = TextInput as unknown as ComponentType<WebDateInputProps>;

export function DateRangeCalendar({
  error,
  from,
  fromLabel,
  onFromChange,
  onToChange,
  to,
  toLabel,
}: DateRangeCalendarProps) {
  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <DateInput label={fromLabel} onChange={(value) => onFromChange(toIso(value, false))} value={from} />
        <DateInput label={toLabel} onChange={(value) => onToChange(toIso(value, true))} value={to} />
      </View>
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
    </View>
  );
}

function DateInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="flex-1 gap-2">
      <AppText variant="caption" tone="muted">{label}</AppText>
      <WebDateInput
        accessibilityLabel={label}
        className="min-h-[50px] rounded-control border border-line bg-background px-3 py-2 text-body text-content"
        onChangeText={onChange}
        placeholderTextColor={palette.muted}
        type="date"
        value={value.slice(0, 10)}
      />
    </View>
  );
}

function toIso(value: string, end: boolean) {
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
