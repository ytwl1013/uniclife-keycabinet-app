import { translate } from '@/i18n';

import { apiConfig } from './config';

export type ApiErrorDetails = Record<string, string | number | boolean | null>;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkApiError(
  error: unknown,
): error is ApiError & { code: 'OFFLINE' | 'REQUEST_TIMEOUT' } {
  return isApiError(error) &&
    (error.code === 'OFFLINE' || error.code === 'REQUEST_TIMEOUT');
}

export type ApiClientResult<T> =
  | { state: 'success'; data: T; message: string }
  | { state: 'unauthorized'; message: string }
  | { state: 'forbidden'; message: string }
  | { state: 'error'; message: string };

type ApiEnvelope<T> = {
  code: string;
  message: string;
  data: T | null;
};

export const DEFAULT_API_REQUEST_TIMEOUT_MS = 20_000;

export type CallApiOptions = RequestInit & {
  token?: string;
  timeoutMs?: number;
};

function isErrorDetails(value: unknown): value is ApiErrorDetails {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export async function callApi<T>(path: string, options: CallApiOptions = {}): Promise<T> {
  const {
    signal: callerSignal,
    timeoutMs = DEFAULT_API_REQUEST_TIMEOUT_MS,
    token,
    ...init
  } = options;
  const requestController = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const forwardCallerAbort = () => requestController.abort();
  if (callerSignal?.aborted) {
    forwardCallerAbort();
  } else {
    callerSignal?.addEventListener('abort', forwardCallerAbort, { once: true });
  }

  const timeoutError = () =>
    new ApiError(0, 'REQUEST_TIMEOUT', translate('errors.network'));
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      requestController.abort();
      reject(timeoutError());
    }, Math.max(1, timeoutMs));
  });

  const requestPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(`${apiConfig.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
        signal: requestController.signal,
      });
    } catch {
      if (timedOut) throw timeoutError();
      throw new ApiError(0, 'OFFLINE', translate('errors.network'));
    }

    let body: ApiEnvelope<T>;
    try {
      body = (await response.json()) as ApiEnvelope<T>;
    } catch {
      if (timedOut) throw timeoutError();
      throw new ApiError(response.status, 'INVALID_RESPONSE', translate('errors.requestFailed'));
    }

    if (!response.ok || body.code !== 'OK' || body.data === null) {
      throw new ApiError(
        response.status,
        body.code || 'REQUEST_FAILED',
        body.message || translate('errors.requestFailed'),
        isErrorDetails(body.data) ? body.data : undefined,
      );
    }

    return body.data;
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    callerSignal?.removeEventListener('abort', forwardCallerAbort);
  }
}

export async function requestApi<T>(path: string, init?: RequestInit): Promise<ApiClientResult<T>> {
  try {
    const data = await callApi<T>(path, init);
    return { state: 'success', data, message: 'ok' };
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return { state: 'unauthorized', message: translate('errors.sessionExpired') };
    }
    if (isApiError(error) && error.status === 403) {
      return { state: 'forbidden', message: translate('errors.forbidden') };
    }
    return {
      state: 'error',
      message: isApiError(error) ? error.message : translate('errors.network'),
    };
  }
}
