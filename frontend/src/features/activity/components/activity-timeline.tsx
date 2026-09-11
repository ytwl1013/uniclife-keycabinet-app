import { View } from 'react-native';

import { AppIcon, AppIconName, AppIconTone } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import type { ActivityEvent, ActivityEventKind } from '@/features/activity/types';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;

const eventConfig: Record<
  ActivityEventKind,
  { icon: AppIconName; tone: AppIconTone; pill: PillTone }
> = {
  checkOut: { icon: 'checkOut', tone: 'warning', pill: 'orange' },
  return: { icon: 'return', tone: 'success', pill: 'green' },
  keyAdded: { icon: 'key', tone: 'brand', pill: 'blue' },
  keyUpdated: { icon: 'settings', tone: 'brand', pill: 'blue' },
  undo: { icon: 'return', tone: 'accent', pill: 'purple' },
  memberAdded: { icon: 'person', tone: 'brand', pill: 'blue' },
  memberRemoved: { icon: 'person', tone: 'danger', pill: 'red' },
  roleChanged: { icon: 'authorize', tone: 'accent', pill: 'purple' },
  keysCleared: { icon: 'error', tone: 'danger', pill: 'red' },
  keysRestored: { icon: 'return', tone: 'success', pill: 'green' },
  admin: { icon: 'settings', tone: 'accent', pill: 'purple' },
};

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <View>
      {events.map((event, index) => (
        <View
          className={index === events.length - 1 ? '' : 'mb-5 border-b border-line pb-5'}
          key={event.id}>
          <ActivityTimelineItem event={event} />
        </View>
      ))}
    </View>
  );
}

export function ActivityTimelineItem({ event }: { event: ActivityEvent }) {
  const { formatDateTime, t } = useTranslation();
  const style = eventConfig[event.kind];
  const personKey = event.kind === 'return'
    ? 'activity.returner'
    : event.kind === 'checkOut'
      ? 'activity.borrower'
      : undefined;

  return (
    <View className="min-w-0 gap-3">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-pill bg-background">
          <AppIcon name={style.icon} size={22} tone={style.tone} />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <View className="flex-row items-center gap-2">
            <Pill tone={style.pill}>{t(trKey(`activity.kind.${event.kind}`))}</Pill>
            <AppText
              className="flex-1 text-right"
              selectable
              variant="caption"
              tone="muted">
              {formatDateTime(event.createdAt)}
            </AppText>
          </View>
          <AppText selectable variant="caption" tone="muted">
            {t('activity.operator', { name: event.actorName })}
          </AppText>
        </View>
      </View>

      <View className="gap-1.5 border-t border-line pt-3">
        <AppText selectable variant="label" tone="foreground">{event.title}</AppText>
        {personKey && event.borrowerName ? (
          <AppText selectable variant="caption" tone="content">
            {t(personKey, { name: event.borrowerName })}
          </AppText>
        ) : null}
        {event.detail ? (
          <AppText selectable variant="caption" tone="content">{event.detail}</AppText>
        ) : null}
      </View>
    </View>
  );
}
