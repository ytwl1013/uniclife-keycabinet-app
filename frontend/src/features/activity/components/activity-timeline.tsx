import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/pill';
import { AppColors } from '@/styles/theme';

import { ActivityEntry, ActivityKind } from '../types';

const kindConfig: Record<ActivityKind, { icon: keyof typeof MaterialIcons.glyphMap; color: string; soft: string; label: string; tone: 'blue' | 'green' | 'red' | 'purple' }> = {
  checkOut: { icon: 'logout', color: AppColors.blue, soft: AppColors.blueSoft, label: 'Check-Out', tone: 'blue' },
  return: { icon: 'keyboard-return', color: '#18aa63', soft: AppColors.greenSoft, label: 'Return', tone: 'green' },
  overdue: { icon: 'error', color: AppColors.red, soft: AppColors.redSoft, label: 'Overdue', tone: 'red' },
  admin: { icon: 'settings', color: AppColors.purple, soft: AppColors.purpleSoft, label: 'Admin', tone: 'purple' },
};

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  return (
    <View style={styles.timeline}>
      {entries.map((entry, index) => (
        <ActivityRow entry={entry} isLast={index === entries.length - 1} key={entry.id} />
      ))}
    </View>
  );
}

function ActivityRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const config = kindConfig[entry.kind];

  return (
    <View style={styles.row}>
      <View style={styles.markerColumn}>
        <View style={[styles.marker, { backgroundColor: config.soft }]}>
          <MaterialIcons color={config.color} name={config.icon} size={25} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.day}>{entry.day}</Text>
          <Text style={styles.time}>{entry.time}</Text>
          <Pill tone={config.tone}>{config.label}</Pill>
        </View>
        <Text style={styles.title}>{entry.title}</Text>
        <Text style={styles.detail}>{entry.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 100,
  },
  markerColumn: {
    alignItems: 'center',
    width: 46,
  },
  marker: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  line: {
    backgroundColor: AppColors.line,
    flex: 1,
    width: 2,
  },
  content: {
    flex: 1,
    gap: 5,
    paddingBottom: 24,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  day: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  time: {
    color: AppColors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: AppColors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  detail: {
    color: AppColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
