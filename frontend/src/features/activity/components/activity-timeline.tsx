import { View } from 'react-native';

import { AppIcon, AppIconName, AppIconTone } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { ActivityEntry, ActivityKind } from '@/features/activity/types';
import { TranslationKey, useTranslation } from '@/i18n';

const kindConfig: Record<ActivityKind, { icon: AppIconName; iconTone: AppIconTone; markerClass: string; labelKey: TranslationKey; pillTone: PillTone }> = {
  checkOut: { icon: 'checkOut', iconTone: 'brand', markerClass: 'bg-brand-soft', labelKey: 'activity.checkOut', pillTone: 'blue' },
  return: { icon: 'return', iconTone: 'success', markerClass: 'bg-success-soft', labelKey: 'activity.return', pillTone: 'green' },
  overdue: { icon: 'error', iconTone: 'danger', markerClass: 'bg-danger-soft', labelKey: 'activity.overdue', pillTone: 'red' },
  admin: { icon: 'settings', iconTone: 'accent', markerClass: 'bg-accent-soft', labelKey: 'activity.admin', pillTone: 'purple' },
};

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  return (
    <View>
      {entries.map((entry, index) => <ActivityRow entry={entry} isLast={index === entries.length - 1} key={entry.id} />)}
    </View>
  );
}

function ActivityRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const { t } = useTranslation();
  const config = kindConfig[entry.kind];

  return (
    <View className="min-h-[100px] flex-row gap-3.5">
      <View className="w-[46px] items-center">
        <View className={`h-[46px] w-[46px] items-center justify-center rounded-pill ${config.markerClass}`}>
          <AppIcon name={config.icon} size={25} tone={config.iconTone} />
        </View>
        {!isLast ? <View className="w-0.5 flex-1 bg-line" /> : null}
      </View>
      <View className="flex-1 gap-1.5 pb-6">
        <View className="flex-row items-center gap-2.5">
          <AppText variant="caption" tone="muted">{t(entry.dayKey)}</AppText>
          <AppText className="flex-1" variant="caption" tone="muted">{entry.time}</AppText>
          <Pill tone={config.pillTone}>{t(config.labelKey)}</Pill>
        </View>
        <AppText variant="title" tone="foreground">{t(entry.titleKey)}</AppText>
        <AppText variant="caption" tone="muted">{t(entry.detailKey)}</AppText>
      </View>
    </View>
  );
}
