import { translate } from '@/i18n';

import { apiConfig } from './config';

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

export async function requestApi<T>(path: string, init?: RequestInit): Promise<ApiClientResult<T>> {
  try {
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (response.status === 401) {
      return { state: 'unauthorized', message: translate('errors.sessionExpired') };
    }

    if (response.status === 403) {
      return { state: 'forbidden', message: translate('errors.forbidden') };
    }

    const body = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || body.code !== 'OK' || body.data === null) {
      return { state: 'error', message: body.message || translate('errors.requestFailed') };
    }

    return { state: 'success', data: body.data, message: body.message };
  } catch {
    return { state: 'error', message: translate('errors.network') };
  }
}
