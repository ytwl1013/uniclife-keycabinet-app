import { act, fireEvent, render } from '@testing-library/react-native';

import { ApiError } from '../src/api/client';
import { ScanFlow } from '../src/features/scan/components/scan-flow';

const mockCode = 'uniclife://cabinet/v1/init/TEST/TESTPRODUCT';
const mockResolve = jest.fn();
const mockInitialize = jest.fn();
const mockRefresh = jest.fn();
const mockLaunchScanner = jest.fn();
const mockDismissScanner = jest.fn();
const mockScannerSubscriptionRemove = jest.fn();
const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn() };
let mockOnline = true;
let mockModernScannerAvailable = false;
let mockModernScannerListener: ((event: { data: string }) => void) | undefined;
const mockActions = { resolveQr: mockResolve, initializeCabinet: mockInitialize, refreshIfStale: mockRefresh };
jest.mock('@/app-state', () => ({
  useApp: () => ({
    actions: mockActions,
    currentUser: { id: 'test-user' },
    state: { hydrated: true, online: mockOnline, sessionStatus: 'authenticated', qrs: [] },
  }),
}));
jest.mock('@/api/config', () => ({ apiConfig: { baseUrl: 'https://example.com/api/v1' } }));
jest.mock('@/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }), translate: (key: string) => key }));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => mockRouter,
  useIsFocused: () => true,
}));
jest.mock('@/features/scan/use-camera-access', () => ({
  useCameraAccess: () => ({ active: true, generation: 1, permission: { granted: true }, requestPermission: jest.fn() }),
}));
jest.mock('expo-camera', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockCameraView = (props: Record<string, unknown>) => React.createElement(View, props);
  Object.defineProperty(MockCameraView, 'isModernBarcodeScannerAvailable', {
    get: () => mockModernScannerAvailable,
  });
  Object.assign(MockCameraView, {
    dismissScanner: (...args: unknown[]) => mockDismissScanner(...args),
    launchScanner: (...args: unknown[]) => mockLaunchScanner(...args),
    onModernBarcodeScanned: (listener: (event: { data: string }) => void) => {
      mockModernScannerListener = listener;
      return { remove: mockScannerSubscriptionRemove };
    },
  });
  return { CameraView: MockCameraView };
});
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/components/ui/product-image', () => ({ ProductImage: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockOnline = true;
  mockModernScannerAvailable = false;
  mockModernScannerListener = undefined;
  mockLaunchScanner.mockResolvedValue(undefined);
  mockDismissScanner.mockResolvedValue(undefined);
  mockResolve.mockResolvedValue({
    kind: 'initialize',
    qr: { code: mockCode },
    sku: { name: 'Test cabinet', sku: 'TEST', model: 'TEST', color: 'Black', capacity: 10 },
  });
  mockRefresh.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

it('uses the native system scanner first when it is available on iOS', async () => {
  mockModernScannerAvailable = true;
  jest.useFakeTimers();
  const screen = await render(<ScanFlow mode="initialize" />);

  expect(screen.queryByTestId('product-qr-camera')).toBeNull();
  expect(screen.getByText('scan.systemScannerTitle')).toBeTruthy();
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockLaunchScanner).toHaveBeenCalledWith({ barcodeTypes: ['qr'] });

  await act(async () => {
    mockModernScannerListener?.({ data: mockCode });
  });
  expect(mockDismissScanner).toHaveBeenCalled();
  expect(mockResolve).toHaveBeenCalledWith({ code: mockCode });
});

it('stops waiting and offers recovery when the embedded camera never becomes ready', async () => {
  jest.useFakeTimers();
  const screen = await render(<ScanFlow mode="initialize" />);

  await act(async () => {
    await jest.advanceTimersByTimeAsync(4_000);
  });
  expect(screen.getByText('scan.cameraUnavailableTitle')).toBeTruthy();
  expect(screen.queryByTestId('product-qr-camera')).toBeNull();
});

it('retains the confirmation and idempotency key after a timed-out cabinet creation', async () => {
  mockInitialize.mockRejectedValueOnce(new ApiError(0, 'REQUEST_TIMEOUT', 'timeout')).mockResolvedValueOnce({});
  const screen = await render(<ScanFlow mode="initialize" />);
  await act(async () => {
    screen.getByTestId('product-qr-camera').props.onBarcodeScanned({ data: mockCode });
  });
  await fireEvent.press(screen.getByRole('button', { name: 'cabinetScan.initializeAction' }));
  expect(screen.getByText('scan.offlineTitle')).toBeTruthy();
  const request = mockInitialize.mock.calls[0][0];
  expect(request.requestId).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'common.retry' }));
  expect(screen.getByText('Test cabinet')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'cabinetScan.initializeAction' }));
  expect(mockInitialize).toHaveBeenCalledTimes(2);
  expect(mockInitialize.mock.calls[1][0]).toEqual(request);
  expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
});

it('unlocks the camera automatically after an offline QR lookup and network recovery', async () => {
  mockResolve.mockRejectedValueOnce(new ApiError(0, 'OFFLINE', 'offline'));
  const screen = await render(<ScanFlow mode="initialize" />);
  await act(async () => {
    screen.getByTestId('product-qr-camera').props.onBarcodeScanned({ data: mockCode });
  });
  mockOnline = false;
  await screen.rerender(<ScanFlow mode="initialize" />);
  expect(screen.getByText('scan.offlineTitle')).toBeTruthy();
  mockOnline = true;
  await screen.rerender(<ScanFlow mode="initialize" />);
  await act(async () => {
    screen.getByTestId('product-qr-camera').props.onBarcodeScanned({ data: mockCode });
  });
  expect(mockResolve).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Test cabinet')).toBeTruthy();
});
