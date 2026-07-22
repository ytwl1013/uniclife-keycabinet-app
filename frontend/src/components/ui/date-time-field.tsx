import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useTranslation } from '@/i18n';

export type DateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (isoUtc: string) => void;
  timeZone: string;
  error?: string;
};

export function DateTimeField({ error, label, onChange, timeZone, value }: DateTimeFieldProps) {
  const { locale } = useTranslation();
  const current = Number.isNaN(Date.parse(value)) ? new Date() : new Date(value);
  const [open, setOpen] = useState(false);
  const [androidStage, setAndroidStage] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState(current);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setOpen(false);
      setAndroidStage('date');
      return;
    }
    if (Platform.OS === 'android' && androidStage === 'date') {
      const next = new Date(selected);
      next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
      setDraft(next);
      setAndroidStage('time');
      return;
    }
    const next = Platform.OS === 'android'
      ? new Date(draft.getFullYear(), draft.getMonth(), draft.getDate(), selected.getHours(), selected.getMinutes())
      : selected;
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
        onPress={() => {
          setDraft(current);
          setOpen(true);
        }}>
        <AppIcon name="calendar" size={20} tone="brand" />
        <AppText className="flex-1" variant="body" tone="content">
          {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(current)}
        </AppText>
        <AppIcon name="chevronDown" size={20} tone="muted" />
      </Pressable>
      <AppText variant="caption" tone={error ? 'danger' : 'muted'}>{error || timeZone}</AppText>
      {open ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          mode={Platform.OS === 'android' ? androidStage : 'datetime'}
          onChange={handleChange}
          timeZoneName={timeZone}
          value={draft}
        />
      ) : null}
    </View>
  );
}
