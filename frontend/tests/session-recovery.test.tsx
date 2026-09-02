import { act, render, waitFor } from '@testing-library/react-native';
import type { CurrentUserAccount } from '@uniclife/shared';
import { Text } from 'react-native';

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
  },
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
  const { state } = useApp();
  return (
    <Text testID="session-state">
      {`${state.hydrated}:${state.sessionStatus}:${state.online}`}
    </Text>
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
});
