import { Pressable, View } from 'react-native';

import { AppIcon, AppIconName, AppIconTone } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { TranslationKey, useTranslation } from '@/i18n';

import { CabinetEventKind, EventView } from '../types';

const trKey = (key: string) => key as TranslationKey;

const eventConfig: Record<CabinetEventKind, { icon: AppIconName; tone: AppIconTone; pill: PillTone }> = {
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

export function PrototypeEventList({ events, currentUserId, onUndo, emptyLabel }: { events: EventView[]; currentUserId: string; onUndo?: (event: EventView) => void; emptyLabel: string }) {
  const { locale, t } = useTranslation();

  if (!events.length) {
    return (
      <View className="items-center gap-2 rounded-card border border-dashed border-line bg-background px-5 py-8">
        <AppIcon name="activity" size={28} tone="muted" />
        <AppText className="text-center" variant="body" tone="muted">{emptyLabel}</AppText>
      </View>
    );
  }

  return (
    <View>
      {events.map((event, index) => {
        const style = eventConfig[event.kind];
        const canUndo = Boolean(onUndo && event.reversible && event.actorUserId === currentUserId);
        return (
          <View className="min-h-[98px] flex-row gap-3" key={event.id}>
            <View className="w-11 items-center">
              <View className="h-11 w-11 items-center justify-center rounded-pill bg-background">
                <AppIcon name={style.icon} size={22} tone={style.tone} />
              </View>
              {index < events.length - 1 ? <View className="w-px flex-1 bg-line" /> : null}
            </View>
            <View className="min-w-0 flex-1 gap-1.5 pb-5">
              <View className="flex-row items-center gap-2">
                <Pill tone={style.pill}>{t(trKey(`activity.kind.${event.kind}`))}</Pill>
                <AppText className="flex-1 text-right" variant="caption" tone="muted">
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}
                </AppText>
              </View>
              <AppText variant="label" tone="foreground">{event.title}</AppText>
              {event.detail ? <AppText variant="caption" tone="content">{event.detail}</AppText> : null}
              <View className="flex-row items-center justify-between gap-2">
                <AppText variant="caption" tone="muted">{event.actorName}</AppText>
                {canUndo ? (
                  <Pressable accessibilityRole="button" className="min-h-9 justify-center rounded-control border border-line px-3 active:opacity-70" onPress={() => onUndo?.(event)}>
                    <AppText variant="caption" tone="brand">{t(trKey('activity.undo'))}</AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
