import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const demoCabinets = [
  { code: 'CAB-A', name: '一号钥匙柜', location: '前台', status: 'online' },
  { code: 'CAB-B', name: '二号钥匙柜', location: '设备区', status: 'offline' },
] as const;

const statusLabel = {
  online: '在线',
  offline: '离线',
  maintenance: '维护中',
} as const;

export function CabinetsDashboardPage() {
  return (
    <ThemedView style={styles.screen}>
      <View style={styles.header}>
        <ThemedText type="title">柜体状态</ThemedText>
        <ThemedText>设备协议后续统一进入后端 integrations adapter，前端只展示接口结果。</ThemedText>
      </View>

      <View style={styles.list}>
        {demoCabinets.map((item) => (
          <ThemedView key={item.code} style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText>
                {item.code} / {item.location}
              </ThemedText>
            </View>
            <ThemedText type="defaultSemiBold">{statusLabel[item.status]}</ThemedText>
          </ThemedView>
        ))}
      </View>
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
  rowText: {
    flex: 1,
    gap: 4,
  },
});
