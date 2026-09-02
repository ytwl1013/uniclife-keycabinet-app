import { View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { ActivityTimeline } from '@/features/activity/components/activity-timeline';

import { EventView } from '../types';

export function PrototypeEventList({ events, emptyLabel }: { events: EventView[]; emptyLabel: string }) {
  if (!events.length) {
    return <PrototypeEventEmpty label={emptyLabel} />;
  }

  return <ActivityTimeline events={events} />;
}

export function PrototypeEventEmpty({ label }: { label: string }) {
  return (
    <View className="items-center gap-2 rounded-card border border-dashed border-line bg-background px-5 py-8">
      <AppIcon name="activity" size={28} tone="muted" />
      <AppText className="text-center" variant="body" tone="muted">{label}</AppText>
    </View>
  );
}
