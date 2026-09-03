import {
  ApiError,
  callApi,
  isNetworkApiError,
} from '../src/api/client';

jest.mock('@/api/config', () => ({
  apiConfig: {
    appEnvironment: 'pro',
    baseUrl: 'https://api.example.com/api/v1',
  },
}));

jest.mock('@/i18n', () => ({
  translate: (key: string) => key,
}));

describe('API client request timeout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('aborts and rejects a request that never settles', async () => {
    let requestSignal: AbortSignal | null | undefined;
    global.fetch = jest.fn((_input, init) => {
      requestSignal = init?.signal;
      return new Promise<Response>(() => undefined);
    });

    const request = callApi('/auth/session', { timeoutMs: 1_000, token: 'test-token' });
    const rejection = expect(request).rejects.toMatchObject<Partial<ApiError>>({
      code: 'REQUEST_TIMEOUT',
      status: 0,
    });

    await jest.advanceTimersByTimeAsync(1_000);

    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('classifies offline and timeout failures as network errors', () => {
    expect(isNetworkApiError(new ApiError(0, 'OFFLINE', 'offline'))).toBe(true);
    expect(isNetworkApiError(new ApiError(0, 'REQUEST_TIMEOUT', 'timeout'))).toBe(true);
    expect(isNetworkApiError(new ApiError(401, 'SESSION_EXPIRED', 'expired'))).toBe(false);
  });
});
