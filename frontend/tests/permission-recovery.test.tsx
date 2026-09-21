import { act, render, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { NetworkRecovery } from '../src/features/app-refresh/network-recovery';
import { useCameraAccess } from '../src/features/scan/use-camera-access';

const mockRefresh = jest.fn();
const mockHydrate = jest.fn();
const mockGetPermission = jest.fn();
const mockRequestPermission = jest.fn();
const mockNetworkRemove = jest.fn();
let mockNetworkListener: (state: { isConnected: boolean; isInternetReachable?: boolean }) => void;
let mockState = { hydrated: true, online: false, sessionStatus: 'authenticated' };
const mockActions = { refreshIfStale: mockRefresh, hydrate: mockHydrate };

jest.mock('@/app-state', () => ({ useApp: () => ({ actions: mockActions, state: mockState }) }));
jest.mock('expo-network', () => ({
  addNetworkStateListener: (listener: typeof mockNetworkListener) => {
    mockNetworkListener = listener;
    return { remove: mockNetworkRemove };
  },
}));
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [null, mockRequestPermission, mockGetPermission],
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => (() => void)) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
}));

let appListener: (state: AppStateStatus) => void;
let removeAppListener: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockState = { hydrated: true, online: false, sessionStatus: 'authenticated' };
  mockRefresh.mockResolvedValue(undefined);
  mockHydrate.mockResolvedValue(undefined);
  mockGetPermission.mockResolvedValue({ granted: true });
  AppState.currentState = 'active';
  removeAppListener = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appListener = listener;
    return { remove: removeAppListener };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function changeAppState(state: AppStateStatus) {
  await act(async () => {
    AppState.currentState = state;
    appListener(state);
  });
}

it('rechecks camera permission and recreates the preview after returning from Settings', async () => {
  const { result, unmount } = await renderHook(useCameraAccess);
  const initialGeneration = result.current.generation;
  expect(result.current.active).toBe(true);
  await changeAppState('background');
  expect(result.current.active).toBe(false);
  await changeAppState('active');
  expect(mockGetPermission).toHaveBeenCalledTimes(2);
  expect(result.current.active).toBe(true);
  expect(result.current.generation).toBeGreaterThan(initialGeneration);
  await unmount();
  expect(removeAppListener).toHaveBeenCalled();
});

it('recovers a stored session that could not load before network authorization', async () => {
  mockState.sessionStatus = 'anonymous';
  const screen = await render(<NetworkRecovery />);
  await act(async () => {
    mockNetworkListener({ isConnected: true, isInternetReachable: true });
  });
  expect(mockHydrate).toHaveBeenCalledTimes(1);
  expect(mockRefresh).not.toHaveBeenCalled();
  await screen.unmount();
  expect(mockNetworkRemove).toHaveBeenCalled();
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(mockHydrate).toHaveBeenCalledTimes(1);
});

it('retries offline reads even when the permission prompt does not change network state', async () => {
  await render(<NetworkRecovery />);
  await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  await changeAppState('background');
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  await changeAppState('active');
  expect(mockRefresh).toHaveBeenCalledTimes(2);
});

it('deduplicates recovery events while a request is still pending', async () => {
  let finish!: () => void;
  mockRefresh.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  await render(<NetworkRecovery />);
  await act(async () => {
    mockNetworkListener({ isConnected: true });
    mockNetworkListener({ isConnected: true });
    await jest.advanceTimersByTimeAsync(5_000);
  });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
});

it('does not attempt to restore a signed-out session on a healthy connection', async () => {
  mockState = { hydrated: true, online: true, sessionStatus: 'anonymous' };
  await render(<NetworkRecovery />);
  await act(async () => { mockNetworkListener({ isConnected: true }); });
  expect(mockHydrate).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
});
