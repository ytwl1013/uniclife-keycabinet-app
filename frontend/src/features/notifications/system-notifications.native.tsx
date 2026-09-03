import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';

import {
  loadRegisteredPushToken,
  saveRegisteredPushToken,
} from '@/api/push-token-storage';
import { useApp } from '@/app-state';
import { useNotifications } from '@/features/notifications/notifications-provider';

const supportChannelId = 'support';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function supportFeedbackId(notification: Notifications.Notification): string | null {
  const data = notification.request.content.data;
  return data.type === 'support.message' && typeof data.feedbackId === 'string'
    ? data.feedbackId
    : null;
}

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
  const { markRead, unreadCount } = useNotifications();
  const handledResponses = useRef(new Set<string>());
  const authenticated = state.sessionStatus === 'authenticated';
  const currentUserId = currentUser?.id;

  const handleResponse = useCallback((response: Notifications.NotificationResponse) => {
    const responseId = response.notification.request.identifier;
    if (handledResponses.current.has(responseId)) return;
    const feedbackId = supportFeedbackId(response.notification);
    if (!feedbackId) return;
    handledResponses.current.add(responseId);
    markRead(`support:${feedbackId}`);
    router.push(`/(details)/account/feedback/${feedbackId}` as Href);
  }, [markRead, router]);

  useEffect(() => {
    if (!authenticated || !currentUserId) return;
    let active = true;

    void (async () => {
      const platform = process.env.EXPO_OS;
      if (platform !== 'ios' && platform !== 'android') return;
      if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
      const projectId = expoProjectId();
      if (!projectId) return;
      if (platform === 'android') {
        await Notifications.setNotificationChannelAsync(supportChannelId, {
          importance: Notifications.AndroidImportance.HIGH,
          name: 'UnicLife 客服',
          showBadge: true,
          sound: null,
        });
      }
      let permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted && permissions.canAskAgain) {
        permissions = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: false },
        });
      }
      if (!active || !permissions.granted) return;

      const registration = {
        platform,
        token: (await Notifications.getExpoPushTokenAsync({ projectId })).data,
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
    };
  }, [actions, authenticated, currentUserId]);

  useEffect(() => {
    if (!authenticated) return;
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      handleResponse,
    );
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (supportFeedbackId(notification)) {
        void actions.refreshIfStale().catch(() => undefined);
      }
    });
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch(() => undefined);
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [actions, authenticated, handleResponse]);

  useEffect(() => {
    void Notifications.setBadgeCountAsync(authenticated ? unreadCount : 0).catch(() => undefined);
  }, [authenticated, unreadCount]);

  return null;
}
