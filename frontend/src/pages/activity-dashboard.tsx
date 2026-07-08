import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { Pill } from '@/components/ui/pill';
import { ActivityTimeline } from '@/features/activity/components/activity-timeline';
import { demoActivity } from '@/features/activity/demo-data';
import { AppColors } from '@/styles/theme';

const filters = ['All', 'Check-Out', 'Return', 'Overdue', 'Admin'] as const;

export function ActivityDashboardPage() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.headerActions}>
          <MaterialIcons color={AppColors.ink} name="search" size={31} />
          <View style={styles.exportButton}>
            <MaterialIcons color={AppColors.blue} name="file-download" size={20} />
            <Text style={styles.exportText}>Export CSV</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter, index) => (
          <Pill key={filter} tone={index === 0 ? 'blue' : 'gray'}>
            {filter}
          </Pill>
        ))}
      </View>

      <View style={styles.dateSelect}>
        <MaterialIcons color={AppColors.muted} name="calendar-today" size={22} />
        <Text style={styles.dateText}>This Week</Text>
        <MaterialIcons color={AppColors.muted} name="keyboard-arrow-down" size={24} />
      </View>

      <ActivityTimeline entries={demoActivity} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: AppColors.ink,
    fontSize: 36,
    fontWeight: '900',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  exportButton: {
    alignItems: 'center',
    borderColor: '#9ab8ff',
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exportText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '900',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateSelect: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateText: {
    color: AppColors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
});
