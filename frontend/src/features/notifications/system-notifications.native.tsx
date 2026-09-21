import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import type * as NotificationsTypes from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadRegisteredPushToken,
  saveRegisteredPushToken,
} from '@/api/push-token-storage';
import { useApp } from '@/app-state';
import { useNotifications } from '@/features/notifications/notifications-provider';
import { useTranslation } from '@/i18n';

const supportChannelId = 'support';
const cabinetAlertsChannelId = 'cabinet-alerts';
type NotificationsModule = typeof import('expo-notifications');

function expoProjectId(): string | null {
  const expoExtra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: unknown } }
    | undefined;
  const projectId = expoExtra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return typeof projectId === 'string' && projectId ? projectId : null;
}

export function SystemNotifications() {
  const router = useRouter();
  const { actions, currentUser, state } = useApp();
  const { t } = useTranslation();
  const { markRead, unreadCount } = useNotifications();
  const handledResponses = useRef(new Set<string>());
  const [notificationsModule, setNotificationsModule] = useState<NotificationsModule | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const authenticated = state.sessionStatus === 'authenticated';
  const currentUserId = currentUser?.id;

  const handleResponse = useCallback((response: NotificationsTypes.NotificationResponse) => {
    const responseId = response.notification.request.identifier;
    if (handledResponses.current.has(responseId)) return;
    const data = response.notification.request.content.data;
    if (!data || typeof data.type !== 'string') return;
    handledResponses.current.add(responseId);
    if (data.type === 'support.message' && typeof data.feedbackId === 'string') {
      markRead(`support:${data.feedbackId}`);
      router.push(`/(details)/account/feedback/${data.feedbackId}` as Href);
      return;
    }
    if (
      data.type === 'loan.overdue' &&
      typeof data.cabinetId === 'string' &&
      typeof data.keyId === 'string'
    ) {
      if (typeof data.notificationId === 'string') markRead(data.notificationId);
      router.push({
        pathname: '/cabinets/[cabinetId]/keys/[keyId]',
        params: { cabinetId: data.cabinetId, keyId: data.keyId },
      } as Href);
      return;
    }
    if (data.type === 'cabinet.member_joined' && typeof data.cabinetId === 'string') {
      if (typeof data.eventId === 'string') markRead(data.eventId);
      router.push(`/(details)/cabinets/${data.cabinetId}` as Href);
    }
  }, [markRead, router]);

  useEffect(() => {
    let active = true;
    void import('expo-notifications')
      .then((module) => {
        if (!active) return;
        module.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        setNotificationsModule(() => module);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated || !currentUserId || !notificationsModule) return;
    let active = true;

    void (async () => {
      const platform = process.env.EXPO_OS;
      if (platform !== 'ios' && platform !== 'android') return;
      if (platform === 'android') {
        await notificationsModule.setNotificationChannelAsync(supportChannelId, {
          importance: notificationsModule.AndroidImportance.HIGH,
          name: t('notifications.supportChannelName'),
          showBadge: true,
          sound: null,
        });
        await notificationsModule.setNotificationChannelAsync(cabinetAlertsChannelId, {
          importance: notificationsModule.AndroidImportance.HIGH,
          name: t('notifications.alertsChannelName'),
          showBadge: true,
          sound: null,
        });
      }
      let permissions = await notificationsModule.getPermissionsAsync();
      if (!permissions.granted && permissions.canAskAgain) {
        permissions = await notificationsModule.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: false },
        });
      }
      if (!active) return;
      setNotificationsGranted(permissions.granted);
      if (!permissions.granted) return;

      if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
      const projectId = expoProjectId();
      if (!projectId) return;

      const registration = {
        platform,
        token: (await notificationsModule.getExpoPushTokenAsync({ projectId })).data,
      } as const;
      const previous = await loadRegisteredPushToken().catch(() => null);
      if (previous && previous.token !== registration.token) {
        await actions.unregisterPushToken(previous).catch(() => undefined);
      }
      if (!active) return;
      await actions.registerPushToken(registration);
      if (active) await saveRegisteredPushToken(registration);
    })().catch(() => undefined);

    return () => {
      active = false;
      setNotificationsGranted(false);
    };
  }, [actions, authenticated, currentUserId, notificationsModule, t]);

  useEffect(() => {
    if (!notificationsModule) return;
    let active = true;
    void (async () => {
      const [presented, scheduled] = await Promise.all([
        notificationsModule.getPresentedNotificationsAsync(),
        notificationsModule.getAllScheduledNotificationsAsync(),
      ]);
      const appScheduled = scheduled.filter(
        (request) => request.content.data?.type === 'loan.overdue',
      );
      const appPresented = presented.filter(
        (notification) => notification.request.content.data?.type === 'loan.overdue',
      );
      if (authenticated && !state.online) return;
      const desired = new Map<string, {
        cabinetId: string;
        cabinetName: string;
        dueAt: string;
        keyId: string;
        keyName: string;
        notificationId: string;
      }>();
      if (authenticated) {
        for (const loan of state.loans) {
          if (loan.status !== 'active' || !loan.expectedReturnAt) continue;
          const key = state.keys.find((candidate) => candidate.id === loan.keyId);
          const cabinet = state.cabinets.find((candidate) => candidate.id === loan.cabinetId);
          if (!key || !cabinet) continue;
          const notificationId = `overdue:${loan.id}:${loan.expectedReturnAt}`;
          desired.set(`loan-overdue:${loan.id}:${loan.expectedReturnAt}`, {
            cabinetId: cabinet.id,
            cabinetName: cabinet.name,
            dueAt: loan.expectedReturnAt,
            keyId: key.id,
            keyName: key.name,
            notificationId,
          });
        }
      }

      const existingIds = new Set(appScheduled.map((request) => request.identifier));
      await Promise.all(appScheduled
        .filter((request) => !desired.has(request.identifier))
        .map((request) => notificationsModule.cancelScheduledNotificationAsync(request.identifier)));
      await Promise.all(appPresented
        .filter((notification) => !desired.has(notification.request.identifier))
        .map((notification) => notificationsModule.dismissNotificationAsync(
          notification.request.identifier,
        )));
      if (!notificationsGranted || !active) return;
      await Promise.all([...desired.entries()]
        .filter(([identifier, item]) =>
          !existingIds.has(identifier) && Date.parse(item.dueAt) > Date.now()
        )
        .map(([identifier, item]) => notificationsModule.scheduleNotificationAsync({
          identifier,
          content: {
            body: t('notifications.overdueBody', { cabinet: item.cabinetName }),
            data: {
              cabinetId: item.cabinetId,
              keyId: item.keyId,
              notificationId: item.notificationId,
              type: 'loan.overdue',
            },
            title: t('notifications.overdueTitle', { key: item.keyName }),
          },
          trigger: {
            channelId: cabinetAlertsChannelId,
            date: new Date(item.dueAt),
            type: notificationsModule.SchedulableTriggerInputTypes.DATE,
          },
        })));
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [
    authenticated,
    notificationsGranted,
    notificationsModule,
    state.cabinets,
    state.keys,
    state.loans,
    state.online,
    t,
  ]);

  useEffect(() => {
    if (!authenticated || !notificationsModule) return;
    const responseSubscription = notificationsModule.addNotificationResponseReceivedListener(
      handleResponse,
    );
    const receivedSubscription = notificationsModule.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type === 'support.message' || type === 'cabinet.member_joined') {
        void actions.refreshIfStale().catch(() => undefined);
      }
    });
    void notificationsModule.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch(() => undefined);
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [actions, authenticated, handleResponse, notificationsModule]);

  useEffect(() => {
    if (!notificationsModule) return;
    void notificationsModule.setBadgeCountAsync(authenticated ? unreadCount : 0).catch(() => undefined);
  }, [authenticated, notificationsModule, unreadCount]);

  return null;
}
