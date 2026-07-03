import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const demoKeys = [
  { code: 'K-001', name: '总控室钥匙', cabinetCode: 'CAB-A', slotCode: 'A-01', status: 'available' },
  { code: 'K-002', name: '设备间钥匙', cabinetCode: 'CAB-A', slotCode: 'A-02', status: 'borrowed' },
  { code: 'K-003', name: '档案室钥匙', cabinetCode: 'CAB-B', slotCode: 'B-01', status: 'available' },
] as const;

const statusLabel = {
  available: '可领取',
  borrowed: '已借出',
  lost: '遗失',
  disabled: '停用',
} as const;

export function KeysDashboardPage() {
  return (
    <ThemedView style={styles.screen}>
      <View style={styles.header}>
        <ThemedText type="title">钥匙管理</ThemedText>
        <ThemedText>所有领取、归还和异常开柜操作都需要后端权限校验与审计记录。</ThemedText>
      </View>

      <View style={styles.summaryRow}>
        <Summary label="可领取" value="2" />
        <Summary label="已借出" value="1" />
        <Summary label="异常" value="0" />
      </View>

      <View style={styles.list}>
        {demoKeys.map((item) => (
          <ThemedView key={item.code} style={styles.row}>
            <View>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText>
                {item.cabinetCode} / {item.slotCode} / {item.code}
              </ThemedText>
            </View>
            <ThemedText type="defaultSemiBold">{statusLabel[item.status]}</ThemedText>
          </ThemedView>
        ))}
      </View>
    </ThemedView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.summary}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText>{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  header: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summary: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: 8,
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
});
