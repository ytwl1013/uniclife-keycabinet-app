import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { isNotifiableEvent } from '@/features/notifications/notification-policy';
import { useMockApp } from '@/mocks';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  icon: AppIconName;
  tone: AppIconTone;
  read: boolean;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

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

export function NotificationsProvider({ children }: PropsWithChildren) {
  const app = usePrototypeApp();
  const { currentUser } = useMockApp();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const storageKey = `uniclife.notifications.read.v1.${currentUser?.id ?? 'anonymous'}`;

  useEffect(() => {
    let active = true;
    setReadIds(new Set());
    setLoadedStorageKey(null);
    void AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadIds(new Set(parsed.filter((id): id is string => typeof id === 'string')));
          }
        }
        setLoadedStorageKey(storageKey);
      })
      .catch(() => {
        if (active) setLoadedStorageKey(storageKey);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const saveReadIds = useCallback((next: Set<string>) => {
    if (loadedStorageKey !== storageKey) return;
    setReadIds(next);
    void AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => undefined);
  }, [loadedStorageKey, storageKey]);

  const markRead = useCallback((id: string) => {
    if (readIds.has(id)) return;
    saveReadIds(new Set([...readIds, id]));
  }, [readIds, saveReadIds]);

  const notifications = useMemo<AppNotification[]>(() => app.events
    .filter(isNotifiableEvent)
    .map((event) => ({
      id: event.id,
      title: event.title,
      body: event.detail ?? event.actorName,
      createdAt: event.createdAt,
      icon: eventIcon[event.kind].icon,
      tone: eventIcon[event.kind].tone,
      read: readIds.has(event.id),
    })), [app.events, readIds]);

  const markAllRead = useCallback(() => {
    saveReadIds(new Set(notifications.map((notification) => notification.id)));
  }, [notifications, saveReadIds]);

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
