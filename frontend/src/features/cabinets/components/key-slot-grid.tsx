import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/styles/theme';

import { KeySlot, KeySlotStatus } from '../types';

const statusColor: Record<KeySlotStatus, string> = {
  available: AppColors.blue,
  checkedOut: AppColors.orange,
  overdue: AppColors.red,
  empty: '#9aa2af',
};

export function KeySlotGrid({ slots }: { slots: KeySlot[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Key Slots (60)</Text>
      <View style={styles.grid}>
        {slots.map((slot) => (
          <SlotCell key={slot.number} slot={slot} />
        ))}
      </View>
      <View style={styles.moreButton}>
        <Text style={styles.moreText}>View more (41-60)</Text>
        <MaterialIcons color={AppColors.blue} name="keyboard-arrow-down" size={20} />
      </View>
      <View style={styles.legend}>
        <LegendItem label="Available" status="available" />
        <LegendItem label="Checked Out" status="checkedOut" />
        <LegendItem label="Overdue" status="overdue" />
        <LegendItem label="Empty" status="empty" />
      </View>
    </View>
  );
}

function SlotCell({ slot }: { slot: KeySlot }) {
  const color = statusColor[slot.status];
  const isEmpty = slot.status === 'empty';

  return (
    <View style={[styles.slot, { borderColor: color, borderStyle: isEmpty ? 'dashed' : 'solid' }]}>
      <Text style={[styles.slotNumber, { color }]}>{String(slot.number).padStart(2, '0')}</Text>
      {slot.status === 'checkedOut' ? (
        <View style={styles.holderRow}>
          <MaterialIcons color={color} name="person" size={13} />
          <Text style={[styles.holder, { color }]} numberOfLines={1}>
            {slot.holder}
          </Text>
        </View>
      ) : null}
      {slot.status === 'overdue' ? (
        <View style={styles.overdueRow}>
          <MaterialIcons color={color} name="error" size={15} />
          <Text style={[styles.holder, { color }]}>Overdue</Text>
        </View>
      ) : null}
      {slot.status === 'available' ? <View style={[styles.slotDot, { backgroundColor: color }]} /> : null}
      {slot.status === 'empty' ? <MaterialIcons color={color} name="remove-circle-outline" size={17} /> : null}
    </View>
  );
}

function LegendItem({ label, status }: { label: string; status: KeySlotStatus }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: statusColor[status] }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  title: {
    color: AppColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  slot: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 7,
    height: 78,
    justifyContent: 'center',
    width: '17.6%',
  },
  slotNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  holderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: 58,
  },
  overdueRow: {
    alignItems: 'center',
    gap: 2,
  },
  holder: {
    fontSize: 11,
    fontWeight: '800',
  },
  slotDot: {
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  moreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  moreText: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  legend: {
    borderTopColor: AppColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 14,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  legendText: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
