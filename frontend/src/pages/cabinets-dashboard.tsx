import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { Pill } from '@/components/ui/pill';
import { SearchBox } from '@/components/ui/search-box';
import { CabinetCard } from '@/features/cabinets/components/cabinet-card';
import { demoCabinets } from '@/features/cabinets/demo-data';
import { AppColors } from '@/styles/theme';

export function CabinetsDashboardPage() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Cabinets</Text>
        <View style={styles.notification}>
          <MaterialIcons color={AppColors.ink} name="notifications-none" size={29} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>2</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <SearchBox placeholder="Search cabinets" />
        <View style={styles.scanButton}>
          <MaterialIcons color="#ffffff" name="qr-code-scanner" size={24} />
          <Text style={styles.scanText}>Scan to add</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.count}>{demoCabinets.length} cabinets</Text>
        <Text style={styles.sort}>Sort by: Name⌄</Text>
      </View>

      <View style={styles.list}>
        {demoCabinets.map((cabinet) => (
          <CabinetCard cabinet={cabinet} key={cabinet.id} />
        ))}
      </View>

      <View style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <MaterialIcons color={AppColors.blue} name="shield" size={28} />
        </View>
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Keep your cabinets secure</Text>
          <Text style={styles.securityText}>All cabinets are encrypted and activity is fully logged for your security.</Text>
        </View>
        <MaterialIcons color={AppColors.muted} name="chevron-right" size={26} />
      </View>

      <View style={styles.hiddenState}>
        <Pill tone="gray">Demo data only</Pill>
      </View>
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
  notification: {
    position: 'relative',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    top: -4,
    width: 18,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 15,
  },
  scanText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  count: {
    color: AppColors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  sort: {
    color: AppColors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  securityCard: {
    alignItems: 'center',
    backgroundColor: '#f3f7ff',
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  securityIcon: {
    alignItems: 'center',
    backgroundColor: '#e7efff',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  securityCopy: {
    flex: 1,
    gap: 2,
  },
  securityTitle: {
    color: AppColors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  securityText: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  hiddenState: {
    display: 'none',
  },
});
