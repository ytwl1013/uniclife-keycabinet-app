import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/styles/theme';

import { CabinetDetail } from '../types';

export function CabinetSummaryCard({ cabinet }: { cabinet: CabinetDetail }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialIcons color="#ffffff" name="kitchen" size={30} />
      </View>
      <Info label="Location" value={`${cabinet.location}\n${cabinet.floor}`} />
      <View style={styles.divider} />
      <Info label="Capacity" value={`${cabinet.capacity}\nKeys`} />
      <View style={styles.divider} />
      <Info label="Serial Number" value={cabinet.serialNumber} />
      <MaterialIcons color={AppColors.muted} name="chevron-right" size={28} />
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: AppColors.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  divider: {
    backgroundColor: AppColors.line,
    height: 54,
    width: 1,
  },
});
