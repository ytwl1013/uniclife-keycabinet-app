import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/pill';
import { AppColors } from '@/styles/theme';

import { CabinetListItem } from '../types';

export function CabinetCard({ cabinet }: { cabinet: CabinetListItem }) {
  const total = cabinet.metrics.available + cabinet.metrics.checkedOut + cabinet.metrics.overdue;
  const statusTone = cabinet.status === 'online' ? 'green' : 'gray';

  return (
    <Link asChild href={{ pathname: '/cabinets/[cabinetId]', params: { cabinetId: cabinet.id } }}>
      <Pressable style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialIcons color="#ffffff" name="kitchen" size={30} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.name}>{cabinet.name}</Text>
            <View style={styles.locationRow}>
              <MaterialIcons color={AppColors.blue} name="location-on" size={15} />
              <Text style={styles.location}>
                {cabinet.location} · {cabinet.floor}
              </Text>
            </View>
            <Text style={styles.meta}>
              Model: {cabinet.model} · Capacity: {cabinet.capacity} Keys
            </Text>
          </View>
          <View style={styles.statusArea}>
            <Pill tone={statusTone}>{cabinet.status === 'online' ? 'Online' : 'Offline'}</Pill>
            <MaterialIcons color={AppColors.muted} name="chevron-right" size={26} />
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric label="Available" value={cabinet.metrics.available} percent={total ? Math.round((cabinet.metrics.available / total) * 100) : 0} tone="green" />
          <View style={styles.divider} />
          <Metric label="Checked Out" value={cabinet.metrics.checkedOut} percent={total ? Math.round((cabinet.metrics.checkedOut / total) * 100) : 0} tone="orange" />
          <View style={styles.divider} />
          <Metric label="Overdue" value={cabinet.metrics.overdue} percent={total ? Math.round((cabinet.metrics.overdue / total) * 100) : 0} tone="red" />
        </View>
      </Pressable>
    </Link>
  );
}

function Metric({ label, value, percent, tone }: { label: string; value: number; percent: number; tone: 'green' | 'orange' | 'red' }) {
  const dotColor = tone === 'green' ? AppColors.green : tone === 'orange' ? AppColors.orange : AppColors.red;

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.percentRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.percent}>{percent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 16,
    shadowColor: '#274060',
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: AppColors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  location: {
    color: AppColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusArea: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  metrics: {
    borderTopColor: AppColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: 14,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: AppColors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    color: AppColors.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  percentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  percent: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: AppColors.line,
    width: 1,
  },
});
