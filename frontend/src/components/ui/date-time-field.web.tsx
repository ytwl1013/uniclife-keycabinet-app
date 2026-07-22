import type { ComponentProps, ComponentType } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

import { fromDateTimeLocalValue, toDateTimeLocalValue } from './date-time';

type WebDateTimeInputProps = ComponentProps<typeof TextInput> & { type: 'datetime-local' };
const WebDateTimeInput = TextInput as unknown as ComponentType<WebDateTimeInputProps>;

export type DateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (isoUtc: string) => void;
  timeZone: string;
  error?: string;
};

export function DateTimeField({ error, label, onChange, timeZone, value }: DateTimeFieldProps) {
  const { palette } = useAppTheme();
  return (
    <View className="gap-2">
      <AppText variant="label" tone="foreground">{label}</AppText>
      <WebDateTimeInput
        accessibilityLabel={label}
        className={`min-h-[50px] rounded-control border bg-background px-4 py-3 text-body text-content ${error ? 'border-danger' : 'border-line'}`}
        onChangeText={(next) => {
          const iso = fromDateTimeLocalValue(next, timeZone);
          if (iso) onChange(iso);
        }}
        placeholderTextColor={palette.muted}
        type="datetime-local"
        value={toDateTimeLocalValue(value, timeZone)}
      />
      <AppText variant="caption" tone={error ? 'danger' : 'muted'}>{error || timeZone}</AppText>
    </View>
  );
}
