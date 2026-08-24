import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppRefreshControl } from '@/components/ui/app-refresh-control';
import { AppText } from '@/components/ui/app-text';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { useAppRefresh } from '@/features/app-refresh/use-app-refresh';
import { SegmentControl } from '@/features/cabinet-prototype/components/prototype-ui';
import { AppNotification, useNotifications } from '@/features/notifications/notifications-provider';
import { useTranslation } from '@/i18n';

type NotificationTab = 'unread' | 'read';

export function NotificationsScreen() {
  const router = useRouter();
  const { formatDateTime, t } = useTranslation();
  const { markAllRead, markRead, notifications, unreadCount } = useNotifications();
  const { onRefresh, refreshing } = useAppRefresh();
  const [tab, setTab] = useState<NotificationTab>('unread');
  const items = useMemo(
    () => notifications.filter((notification) => tab === 'read' ? notification.read : !notification.read),
    [notifications, tab],
  );
  const tabs = [
    { value: 'unread' as const, label: t('notifications.unreadTab', { count: unreadCount }) },
    { value: 'read' as const, label: t('notifications.readTab') },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content gap-3 px-screen py-3">
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityLabel={t('notifications.back')}
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70"
              onPress={() => router.back()}>
              <AppIcon name="back" size={22} tone="foreground" />
            </Pressable>
            <View className="min-w-0 flex-1">
              <AppText numberOfLines={1} variant="title" tone="foreground">{t('notifications.title')}</AppText>
              <AppText numberOfLines={1} variant="caption" tone="muted">{t('notifications.subtitle')}</AppText>
            </View>
            {unreadCount ? (
              <Pressable accessibilityRole="button" className="min-h-11 justify-center px-1" onPress={markAllRead}>
                <AppText variant="label" tone="brand">{t('notifications.markAllRead')}</AppText>
              </Pressable>
            ) : <View className="w-11" />}
          </View>
          <SegmentControl items={tabs} onChange={setTab} value={tab} />
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1">
        <FlatList
          alwaysBounceVertical
          className="min-w-0 flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 20, rowGap: 12 }}
          contentInsetAdjustmentBehavior="automatic"
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={(
            <View className="min-h-[280px] flex-1 items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface px-7 py-10">
              <View className="h-16 w-16 items-center justify-center rounded-pill bg-brand-soft">
                <AppIcon name={tab === 'unread' ? 'check' : 'notification'} size={30} tone="brand" />
              </View>
              <AppText className="text-center" variant="title" tone="foreground">
                {t(tab === 'unread' ? 'notifications.emptyUnreadTitle' : 'notifications.emptyReadTitle')}
              </AppText>
              <AppText className="text-center" tone="muted">
                {t(tab === 'unread' ? 'notifications.emptyUnreadDescription' : 'notifications.emptyReadDescription')}
              </AppText>
            </View>
          )}
          refreshControl={<AppRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={() => markRead(item.id)}
              timestamp={formatDateTime(item.createdAt)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

function NotificationRow({ item, onPress, timestamp }: { item: AppNotification; onPress: () => void; timestamp: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-start gap-3 rounded-card border p-card shadow-card active:opacity-75 ${item.read ? 'border-line bg-surface' : 'border-brand/25 bg-brand-soft'}`}
      onPress={onPress}>
      <View className={`h-11 w-11 items-center justify-center rounded-pill ${item.read ? 'bg-background' : 'bg-surface'}`}>
        <AppIcon name={item.icon} size={22} tone={item.tone} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start gap-2">
          <AppText className="min-w-0 flex-1" variant="label" tone="foreground">{item.title}</AppText>
          {!item.read ? <View className="mt-1.5 h-2 w-2 rounded-pill bg-brand" /> : null}
        </View>
        <AppText variant="caption" tone="content">{item.body}</AppText>
        <AppText variant="caption" tone="muted">{timestamp}</AppText>
      </View>
    </Pressable>
  );
}
