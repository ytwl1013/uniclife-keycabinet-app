import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AppIconName, AppIconTone } from '@/components/ui/app-icon';
import { useApp } from '@/app-state';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { isNotifiableEvent } from '@/features/notifications/notification-policy';
import { useTranslation } from '@/i18n';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  icon: AppIconName;
  tone: AppIconTone;
  read: boolean;
  href?: Href;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const emptyReadIds = new Set<string>();

const eventIcon = {
  checkOut: { icon: 'checkOut', tone: 'warning' },
  return: { icon: 'return', tone: 'success' },
  keyAdded: { icon: 'key', tone: 'brand' },
  keyUpdated: { icon: 'settings', tone: 'brand' },
  undo: { icon: 'return', tone: 'accent' },
  memberAdded: { icon: 'person', tone: 'brand' },
  memberRemoved: { icon: 'person', tone: 'danger' },
  roleChanged: { icon: 'authorize', tone: 'accent' },
  keysCleared: { icon: 'error', tone: 'danger' },
  keysRestored: { icon: 'return', tone: 'success' },
  admin: { icon: 'settings', tone: 'accent' },
} as const satisfies Record<string, { icon: AppIconName; tone: AppIconTone }>;

function supportReadId(thread: { id: string; latestSupportMessageAt: string | null }): string {
  return `support:${thread.id}:${thread.latestSupportMessageAt ?? 'none'}`;
}

export function NotificationsProvider({ children }: PropsWithChildren) {
  const app = usePrototypeApp();
  const { actions, currentUser, state } = useApp();
  const { t } = useTranslation();
  const [storedReadState, setStoredReadState] = useState<{
    ids: Set<string>;
    storageKey: string | null;
  }>({ ids: emptyReadIds, storageKey: null });
  const storageKey = `uniclife.notifications.read.v1.${currentUser?.id ?? 'anonymous'}`;
  const readIds = storedReadState.storageKey === storageKey
    ? storedReadState.ids
    : emptyReadIds;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!active) return;
        let ids = emptyReadIds;
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            ids = new Set(parsed.filter((id): id is string => typeof id === 'string'));
          }
        }
        setStoredReadState({ ids, storageKey });
      })
      .catch(() => {
        if (active) setStoredReadState({ ids: emptyReadIds, storageKey });
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const saveReadIds = useCallback((next: Set<string>) => {
    if (storedReadState.storageKey !== storageKey) return;
    setStoredReadState({ ids: next, storageKey });
    void AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => undefined);
  }, [storageKey, storedReadState.storageKey]);

  const supportThreadsByNotificationId = useMemo(() => new Map(
    state.feedbackThreads.map((thread) => [`support:${thread.id}`, thread]),
  ), [state.feedbackThreads]);

  const markRead = useCallback((id: string) => {
    const supportThread = supportThreadsByNotificationId.get(id);
    if (supportThread) {
      const localReadId = supportReadId(supportThread);
      if (!readIds.has(localReadId)) {
        saveReadIds(new Set([...readIds, localReadId]));
      }
      if (supportThread.unreadMessageCount > 0) {
        void actions.markFeedbackThreadRead({ feedbackId: supportThread.id }).catch(() => undefined);
      }
      return;
    }
    if (readIds.has(id)) return;
    saveReadIds(new Set([...readIds, id]));
  }, [actions, readIds, saveReadIds, supportThreadsByNotificationId]);

  const notifications = useMemo<AppNotification[]>(() => {
    const eventNotifications: AppNotification[] = app.events
      .filter(isNotifiableEvent)
      .map((event) => ({
      id: event.id,
      title: event.title,
      body: event.detail ?? event.actorName,
      createdAt: event.createdAt,
      icon: eventIcon[event.kind].icon,
      tone: eventIcon[event.kind].tone,
      read: readIds.has(event.id),
    }));
    const supportNotifications: AppNotification[] = state.feedbackThreads
      .filter((thread) => thread.supportMessageCount > 0 && thread.latestSupportMessageAt)
      .map((thread) => ({
        id: `support:${thread.id}`,
        title: t('support.replyNotificationTitle', {
          title: thread.title || t('support.historyUntitled'),
        }),
        body: thread.latestSupportMessagePreview ?? '',
        createdAt: thread.latestSupportMessageAt!,
        icon: 'support',
        tone: 'brand',
        read: thread.unreadMessageCount === 0 || readIds.has(supportReadId(thread)),
        href: `/(details)/account/feedback/${thread.id}` as Href,
      }));
    return [...supportNotifications, ...eventNotifications].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
  }, [app.events, readIds, state.feedbackThreads, t]);

  const markAllRead = useCallback(() => {
    saveReadIds(new Set([
      ...app.events.filter(isNotifiableEvent).map((event) => event.id),
      ...state.feedbackThreads.map(supportReadId),
    ]));
    for (const thread of state.feedbackThreads) {
      if (thread.unreadMessageCount > 0) {
        void actions.markFeedbackThreadRead({ feedbackId: thread.id }).catch(() => undefined);
      }
    }
  }, [actions, app.events, saveReadIds, state.feedbackThreads]);

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    markAllRead,
    markRead,
  }), [markAllRead, markRead, notifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('NOTIFICATIONS_PROVIDER_REQUIRED');
  return context;
}
