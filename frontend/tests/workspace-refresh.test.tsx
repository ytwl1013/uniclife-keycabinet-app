import { act, render, waitFor } from '@testing-library/react-native';
import type { CurrentUserAccount } from '@uniclife/shared';
import { Text } from 'react-native';

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
const mockGetCabinet = jest.fn();
const mockListEvents = jest.fn();
const mockListFeedbackHistory = jest.fn();

jest.mock('@/api/session-token', () => ({
  clearSessionToken: () => mockClearSessionToken(),
  loadSessionToken: () => mockLoadSessionToken(),
  saveSessionToken: jest.fn(),
}));

jest.mock('@/api/backend', () => ({
  backendApi: {
    getCabinet: (...args: unknown[]) => mockGetCabinet(...args),
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

let mockApp: ReturnType<typeof useApp>;
function SessionStateProbe() {
  mockApp = useApp();
  const { state } = mockApp;
  return (
    <Text testID="session-state">
      {`${state.hydrated}:${state.sessionStatus}:${state.online}`}
    </Text>
  );
}


describe('workspace refresh concurrency', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('fetches another snapshot when notified during an in-flight refresh', async () => {
    mockLoadSessionToken.mockResolvedValue('test-session');
    mockSession.mockResolvedValue({ user });
    mockListCabinets.mockResolvedValue([{ cabinet: { id: 'cabinet-refresh' } }]);
    mockGetCabinet.mockResolvedValue({ cabinet: { id: 'cabinet-refresh', version: 1 }, sku: { id: 'sku-refresh' }, keys: [], slots: [], members: [], activeLoans: [] });
    mockListLoans.mockResolvedValue({ items: [] });
    mockListEvents.mockResolvedValue({ items: [], actors: [] });
    mockListFeedbackHistory.mockResolvedValue({ items: [] });
    await render(<AppProvider><SessionStateProbe /></AppProvider>);
    await waitFor(() => expect(mockApp.state.sessionStatus).toBe('authenticated'));
    mockListLoans.mockClear();
    let releaseEvents!: (value: unknown) => void;
    const eventsGate = new Promise((resolve) => { releaseEvents = resolve; });
    mockListEvents.mockReturnValueOnce(eventsGate);
    let refresh!: Promise<void>;
    await act(async () => { refresh = mockApp.actions.refresh(); });
    await waitFor(() => expect(mockListLoans).toHaveBeenCalledTimes(1));
    // Another user checks out a key after the old loan snapshot has returned.
    mockGetCabinet.mockResolvedValue({ cabinet: { id: 'cabinet-refresh', version: 2 }, sku: { id: 'sku-refresh' }, keys: [], slots: [], members: [], activeLoans: [{ id: 'new-loan', status: 'active' }] });
    let notificationRefresh!: Promise<void>;
    await act(async () => { notificationRefresh = mockApp.actions.refreshIfStale({ staleAfterMs: 0 }); });
    await act(async () => {
      releaseEvents({ items: [], actors: [] });
      await Promise.all([refresh, notificationRefresh]);
    });
    // Notifications must not be satisfied by a snapshot taken before the change.
    expect(mockListLoans).toHaveBeenCalledTimes(2);
    expect(mockApp.state.loans).toEqual([{ id: 'new-loan', status: 'active' }]);
  });

  it('keeps all cabinet active loans independently of the 200-entry history window', async () => {
    const active = { id: 'old-active-loan', keyId: 'borrowed-key', status: 'active' };
    const history = Array.from({ length: 200 }, (_, index) => ({ id: `history-${index}`, status: 'returned' }));
    mockLoadSessionToken.mockResolvedValue('test-session');
    mockSession.mockResolvedValue({ user });
    mockListCabinets.mockResolvedValue([{ cabinet: { id: 'cabinet-history', version: 1 } }]);
    mockGetCabinet.mockResolvedValue({
      cabinet: { id: 'cabinet-history', version: 2 }, sku: { id: 'sku-history' },
      keys: [{ id: 'borrowed-key', status: 'borrowed' }], slots: [], members: [], activeLoans: [active],
    });
    mockListLoans.mockResolvedValue({ items: history });
    mockListEvents.mockResolvedValue({ items: [], actors: [] });
    mockListFeedbackHistory.mockResolvedValue({ items: [] });
    await render(<AppProvider><SessionStateProbe /></AppProvider>);
    await waitFor(() => expect(mockApp.state.sessionStatus).toBe('authenticated'));
    expect(mockApp.state.loans).toHaveLength(201);
    expect(mockApp.state.loans).toContainEqual(active);
    expect(mockApp.state.cabinets[0].version).toBe(2);
    expect(mockApp.state.keys[0].status).toBe('borrowed');
  });
});
