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

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function requestApi<T>(path: string, init?: RequestInit): Promise<ApiClientResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (response.status === 401) {
      return { state: 'unauthorized', message: '登录已过期，请重新登录' };
    }

    if (response.status === 403) {
      return { state: 'forbidden', message: '权限不足，无法执行该操作' };
    }

    const body = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || body.code !== 'OK' || body.data === null) {
      return { state: 'error', message: body.message || '请求失败' };
    }

    return { state: 'success', data: body.data, message: body.message };
  } catch {
    return { state: 'error', message: '网络异常，请稍后重试' };
  }
}
