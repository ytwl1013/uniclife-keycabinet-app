import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { Pill } from '@/components/ui/pill';
import { SearchBox } from '@/components/ui/search-box';
import { CabinetSummaryCard } from '@/features/cabinets/components/cabinet-summary-card';
import { KeySlotGrid } from '@/features/cabinets/components/key-slot-grid';
import { mainCabinetDetail } from '@/features/cabinets/demo-data';
import { AppColors } from '@/styles/theme';

const filters = [
  { label: 'All', tone: 'blue' },
  { label: 'Available', tone: 'gray' },
  { label: 'Checked Out', tone: 'gray' },
  { label: 'Overdue', tone: 'gray' },
] as const;

export function CabinetDetailPage() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <MaterialIcons color={AppColors.blue} name="arrow-back" size={28} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{mainCabinetDetail.name}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons color={AppColors.blue} name="location-on" size={18} />
            <Text style={styles.location}>
              {mainCabinetDetail.location} · {mainCabinetDetail.floor}
            </Text>
          </View>
        </View>
        <MaterialIcons color={AppColors.blue} name="more-horiz" size={28} />
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <Pill key={filter.label} tone={filter.tone}>
            {filter.label}
          </Pill>
        ))}
      </View>

      <CabinetSummaryCard cabinet={mainCabinetDetail} />

      <View style={styles.searchRow}>
        <SearchBox placeholder="Search keys by number or name" />
        <View style={styles.filterButton}>
          <MaterialIcons color={AppColors.muted} name="tune" size={24} />
        </View>
      </View>

      <KeySlotGrid slots={mainCabinetDetail.slots} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 34,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
    gap: 7,
  },
  title: {
    color: AppColors.ink,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  location: {
    color: AppColors.muted,
    fontSize: 15,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 0,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderLeftWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    width: 58,
  },
});
