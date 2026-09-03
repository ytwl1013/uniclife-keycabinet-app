import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { CurrentUserAccount } from '@uniclife/shared';
import { Pressable, Text } from 'react-native';

import { ApiError } from '../src/api/client';
import { AppProvider, useApp } from '../src/app-state/provider';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/api/client', () => {
  class MockApiError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(mockStatus: number, mockCode: string, message: string) {
      super(message);
      this.code = mockCode;
      this.status = mockStatus;
    }
  }

  return {
    ApiError: MockApiError,
    isApiError: (error: unknown) => error instanceof MockApiError,
  };
});

const mockLoadSessionToken = jest.fn<Promise<string | null>, []>();
const mockClearSessionToken = jest.fn<Promise<void>, []>();
const mockSession = jest.fn();
const mockListCabinets = jest.fn();
const mockListLoans = jest.fn();
const mockListEvents = jest.fn();
const mockListFeedbackHistory = jest.fn();
const mockUpdateProfile = jest.fn();
const mockLoadLocalProfileAvatar = jest.fn<Promise<string | undefined>, [string]>();
const mockRemoveLocalProfileAvatar = jest.fn<Promise<void>, [string]>();
const mockSaveLocalProfileAvatar = jest.fn<Promise<string>, [string, string]>();

jest.mock('@/api/session-token', () => ({
  clearSessionToken: () => mockClearSessionToken(),
  loadSessionToken: () => mockLoadSessionToken(),
  saveSessionToken: jest.fn(),
}));

jest.mock('@/api/backend', () => ({
  backendApi: {
    listCabinets: (...args: unknown[]) => mockListCabinets(...args),
    listEvents: (...args: unknown[]) => mockListEvents(...args),
    listFeedbackHistory: (...args: unknown[]) => mockListFeedbackHistory(...args),
    listLoans: (...args: unknown[]) => mockListLoans(...args),
    session: (...args: unknown[]) => mockSession(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  },
}));

jest.mock('@/api/profile-avatar-storage', () => ({
  loadLocalProfileAvatar: (...args: [string]) => mockLoadLocalProfileAvatar(...args),
  removeLocalProfileAvatar: (...args: [string]) => mockRemoveLocalProfileAvatar(...args),
  saveLocalProfileAvatar: (...args: [string, string]) => mockSaveLocalProfileAvatar(...args),
}));

const user: CurrentUserAccount = {
  id: 'user-session-recovery',
  email: 'session.recovery@example.com',
  displayName: 'Session Recovery',
  locale: 'en-US',
  status: 'active',
  loginCount: 1,
  lastLoginAt: '2026-08-24T08:00:00.000Z',
  homeGuidePromptedAt: null,
  createdAt: '2026-08-24T08:00:00.000Z',
};

function SessionStateProbe() {
  const { currentUser, state } = useApp();
  return (
    <>
      <Text testID="session-state">
        {`${state.hydrated}:${state.sessionStatus}:${state.online}`}
      </Text>
      <Text testID="avatar-state">{currentUser?.avatarUri ?? 'none'}</Text>
    </>
  );
}

function ProfileUpdateProbe() {
  const { actions, currentUser, state } = useApp();
  return (
    <Pressable
      testID="update-profile"
      onPress={() => actions.updateProfile({
        avatarUri: 'file:///picker-cache/avatar.png',
        displayName: 'Local Avatar',
        expectedVersion: state.version,
      })}>
      <Text>{currentUser?.avatarUri ?? 'none'}</Text>
    </Pressable>
  );
}

describe('persisted session recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockLoadSessionToken.mockResolvedValue('persisted-session-token');
    mockClearSessionToken.mockResolvedValue();
    mockListCabinets.mockResolvedValue([]);
    mockListLoans.mockResolvedValue({ items: [] });
    mockListEvents.mockResolvedValue({ items: [], actors: [] });
    mockListFeedbackHistory.mockResolvedValue({ items: [] });
    mockLoadLocalProfileAvatar.mockResolvedValue(undefined);
    mockRemoveLocalProfileAvatar.mockResolvedValue();
    mockSaveLocalProfileAvatar.mockResolvedValue(
      'file:///documents/profile-avatars/user-session-recovery.jpg',
    );
    mockUpdateProfile.mockResolvedValue({ ...user, displayName: 'Local Avatar' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the stored token and retries when the backend is temporarily offline', async () => {
    mockSession
      .mockRejectedValueOnce(new ApiError(0, 'OFFLINE', 'Network unavailable'))
      .mockResolvedValue({ user });

    const screen = await render(
      <AppProvider>
        <SessionStateProbe />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-state').props.children).toBe('false:anonymous:false');
    });
    expect(mockClearSessionToken).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('session-state').props.children).toBe('true:authenticated:true');
    });
    expect(mockSession).toHaveBeenCalledTimes(2);
    expect(mockClearSessionToken).not.toHaveBeenCalled();
  });

  it('clears a persisted token only after the backend rejects the session', async () => {
    mockSession.mockRejectedValue(
      new ApiError(401, 'SESSION_EXPIRED', 'Session expired'),
    );

    const screen = await render(
      <AppProvider>
        <SessionStateProbe />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-state').props.children).toBe('true:anonymous:true');
    });
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
  });

  it('restores the current avatar from local storage instead of a backend URI', async () => {
    mockSession.mockResolvedValue({
      user: { ...user, avatarUri: 'file:///another-device/avatar.jpg' },
    });
    mockLoadLocalProfileAvatar.mockResolvedValue(
      'file:///documents/profile-avatars/user-session-recovery.jpg',
    );

    const screen = await render(
      <AppProvider>
        <SessionStateProbe />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('avatar-state').props.children).toBe(
        'file:///documents/profile-avatars/user-session-recovery.jpg',
      );
    });
  });

  it('persists a selected avatar locally and never sends its URI to the backend', async () => {
    mockSession.mockResolvedValue({ user });

    const screen = await render(
      <AppProvider>
        <SessionStateProbe />
        <ProfileUpdateProbe />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-state').props.children).toBe('true:authenticated:true');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('update-profile'));
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      'persisted-session-token',
      expect.objectContaining({ avatarUri: null, displayName: 'Local Avatar' }),
    );
    expect(mockUpdateProfile.mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({ avatarUri: 'file:///picker-cache/avatar.png' }),
    );
    expect(mockSaveLocalProfileAvatar).toHaveBeenCalledWith(
      'user-session-recovery',
      'file:///picker-cache/avatar.png',
    );
    expect(screen.getByTestId('avatar-state').props.children).toBe(
      'file:///documents/profile-avatars/user-session-recovery.jpg',
    );
  });
});
