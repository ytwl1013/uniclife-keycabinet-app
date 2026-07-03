import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { SearchBox } from '@/components/ui/search-box';
import { AppColors } from '@/styles/theme';

const summary = [
  { label: 'Cabinets', value: '3', icon: 'kitchen' },
  { label: 'Available', value: '90', icon: 'vpn-key' },
  { label: 'Overdue', value: '10', icon: 'error-outline' },
] as const;

export function KeysDashboardPage() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>UnicLife</Text>
          <Text style={styles.title}>Key Cabinet</Text>
        </View>
        <View style={styles.avatar}>
          <MaterialIcons color={AppColors.blue} name="person" size={28} />
        </View>
      </View>

      <SearchBox placeholder="Search keys, cabinets, or slots" />

      <View style={styles.summaryRow}>
        {summary.map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <MaterialIcons color={AppColors.blue} name={item.icon} size={25} />
            <Text style={styles.summaryValue}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.primaryCard}>
        <View style={styles.primaryIcon}>
          <MaterialIcons color="#ffffff" name="kitchen" size={34} />
        </View>
        <View style={styles.primaryCopy}>
          <Text style={styles.primaryTitle}>Main Office Cabinet</Text>
          <Text style={styles.primaryText}>60 key slots · 3 overdue · online</Text>
        </View>
        <Link asChild href={{ pathname: '/cabinets/[cabinetId]', params: { cabinetId: 'main-office' } }}>
          <Pressable style={styles.openButton}>
            <MaterialIcons color="#ffffff" name="arrow-forward" size={22} />
          </Pressable>
        </Link>
      </View>

      <View style={styles.quickGrid}>
        <QuickAction icon="qr-code-scanner" label="Scan key" />
        <QuickAction icon="assignment-return" label="Return" />
        <QuickAction icon="manage-accounts" label="Authorize" />
        <QuickAction icon="fact-check" label="Audit" />
      </View>
    </AppScreen>
  );
}

function QuickAction({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  return (
    <View style={styles.quickAction}>
      <MaterialIcons color={AppColors.blue} name={icon} size={27} />
      <Text style={styles.quickText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: AppColors.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: AppColors.blueSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    padding: 14,
  },
  summaryValue: {
    color: AppColors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryCard: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  primaryIcon: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  primaryCopy: {
    flex: 1,
    gap: 4,
  },
  primaryTitle: {
    color: AppColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  primaryText: {
    color: AppColors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  openButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
    width: '47%',
  },
  quickText: {
    color: AppColors.text,
    fontSize: 14,
    fontWeight: '900',
  },
});
