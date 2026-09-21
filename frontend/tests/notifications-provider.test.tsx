import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { FeedbackThreadSummary } from '@uniclife/shared';
import { Pressable, Text } from 'react-native';

import {
  NotificationsProvider,
  useNotifications,
} from '../src/features/notifications/notifications-provider';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockMarkFeedbackThreadRead = jest.fn().mockResolvedValue(undefined);
const mockState = { feedbackThreads: [] as FeedbackThreadSummary[] };
const mockApp = {
  cabinets: [] as Array<{ id: string; name: string; role: 'superAdmin' | 'admin' }>,
  currentUserId: 'user-notifications',
  events: [],
  keys: [] as Array<{
    activeLoan?: { expectedReturnAt?: string; id: string };
    cabinetId: string;
    id: string;
    name: string;
    status: 'available' | 'checkedOut' | 'overdue';
  }>,
};

jest.mock('@/app-state', () => ({
  useApp: () => ({
    actions: { markFeedbackThreadRead: mockMarkFeedbackThreadRead },
    currentUser: { id: 'user-notifications' },
    state: mockState,
  }),
}));

jest.mock('@/features/cabinet-prototype/use-prototype-app', () => ({
  usePrototypeApp: () => mockApp,
}));

jest.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { title?: string }) =>
      key === 'support.replyNotificationTitle' ? `Support: ${params?.title}` : key,
  }),
}));

function supportThread(latestSupportMessageAt: string): FeedbackThreadSummary {
  return {
    content: 'Initial feedback',
    conversationStatus: 'waiting_for_user',
    deliveredAt: '2026-09-02T08:00:01.000Z',
    failureCode: null,
    id: 'feedback-notification-test',
    imageCount: 0,
    lastMessageAt: latestSupportMessageAt,
    lastMessagePreview: 'Support reply',
    lastMessageSender: 'support',
    latestSupportMessageAt,
    latestSupportMessagePreview: 'Support reply',
    messageCount: 2,
    salutation: '',
    status: 'sent',
    submittedAt: '2026-09-02T08:00:00.000Z',
    supportMessageCount: 1,
    title: 'Test feedback',
    type: 'application',
    unreadMessageCount: 1,
    userDisplayName: 'Test User',
    userEmail: 'test@example.com',
    userId: 'user-notifications',
  };
}

function Probe() {
  const { markRead, notifications, unreadCount } = useNotifications();
  const notification = notifications[0];
  return (
    <>
      <Text testID="unread-count">{unreadCount}</Text>
      {notification ? (
        <Pressable testID="open-notification" onPress={() => markRead(notification.id)}>
          <Text>{notification.title}</Text>
          <Text>{notification.read ? 'read' : 'unread'}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

describe('support notification read state', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockState.feedbackThreads = [supportThread('2026-09-02T08:01:00.000Z')];
    mockApp.cabinets = [];
    mockApp.events = [];
    mockApp.keys = [];
  });

  it('marks the opened reply read immediately and treats a later reply as new', async () => {
    const screen = await render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.getByTestId('unread-count').props.children).toBe(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('open-notification'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('unread-count').props.children).toBe(0);
    });
    expect(mockMarkFeedbackThreadRead).toHaveBeenCalledWith({
      feedbackId: 'feedback-notification-test',
    });

    mockState.feedbackThreads = [supportThread('2026-09-02T08:02:00.000Z')];
    await screen.rerender(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    );
    expect(screen.getByTestId('unread-count').props.children).toBe(1);
  });

  it('creates a persistent in-app notification for an overdue key', async () => {
    mockState.feedbackThreads = [];
    mockApp.cabinets = [{ id: 'cabinet-overdue', name: 'Front Desk', role: 'superAdmin' }];
    mockApp.keys = [{
      activeLoan: { id: 'loan-overdue', expectedReturnAt: '2026-09-02T07:00:00.000Z' },
      cabinetId: 'cabinet-overdue',
      id: 'key-overdue',
      name: 'Main Door',
      status: 'overdue',
    }];

    const screen = await render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.getByTestId('unread-count').props.children).toBe(1);
    expect(screen.getByText('notifications.overdueTitle')).toBeTruthy();
  });
});
