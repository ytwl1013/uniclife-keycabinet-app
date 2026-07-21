import { Pressable, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { ActivityTimeline } from '@/features/activity/components/activity-timeline';
import { demoActivity } from '@/features/activity/demo-data';
import { TranslationKey, useTranslation } from '@/i18n';

const filters = [
  { key: 'activity.all', tone: 'blue' },
  { key: 'activity.checkOut', tone: 'gray' },
  { key: 'activity.return', tone: 'gray' },
  { key: 'activity.overdue', tone: 'gray' },
  { key: 'activity.admin', tone: 'gray' },
] as const satisfies readonly { key: TranslationKey; tone: PillTone }[];

export default function ActivityRoute() {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <View className="flex-row items-center justify-between">
        <AppText variant="display" tone="foreground">{t('activity.title')}</AppText>
        <View className="flex-row items-center gap-4">
          <Pressable accessibilityLabel={t('home.searchPlaceholder')} className="active:opacity-70">
            <AppIcon name="search" size={31} tone="foreground" />
          </Pressable>
          <Pressable className="flex-row items-center gap-2 rounded-control border border-brand/50 px-3 py-2.5 active:opacity-70">
            <AppIcon name="download" size={20} tone="brand" />
            <AppText variant="label" tone="brand">{t('activity.exportCsv')}</AppText>
          </Pressable>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        {filters.map((filter) => <Pill key={filter.key} tone={filter.tone}>{t(filter.key)}</Pill>)}
      </View>

      <Pressable className="flex-row items-center gap-3.5 rounded-card border border-line bg-surface px-card py-3.5 active:opacity-70">
        <AppIcon name="calendar" size={22} tone="muted" />
        <AppText className="flex-1" variant="body" tone="foreground">{t('activity.thisWeek')}</AppText>
        <AppIcon name="chevronDown" size={24} tone="muted" />
      </Pressable>

      <ActivityTimeline entries={demoActivity} />
    </AppScreen>
  );
}
