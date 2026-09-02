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

export type CallApiOptions = RequestInit & {
  token?: string;
};

function isErrorDetails(value: unknown): value is ApiErrorDetails {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export async function callApi<T>(path: string, options: CallApiOptions = {}): Promise<T> {
  const { token, ...init } = options;
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
    });
  } catch {
    throw new ApiError(0, 'OFFLINE', translate('errors.network'));
  }

  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
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
