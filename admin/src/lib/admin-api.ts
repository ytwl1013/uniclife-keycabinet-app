import 'server-only';

import { apiEnvelopeSchema, type ApiEnvelope } from '@uniclife/shared';
import { z } from 'zod';

import { getAdminServerEnv } from './env';

export class AdminApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'PATCH' | 'POST';
  body?: unknown;
};

export async function requestAdminApi<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  let environment;
  try {
    environment = getAdminServerEnv();
  } catch {
    throw new AdminApiError('ADMIN_CONFIGURATION_INVALID', '后台环境变量尚未正确配置', 503);
  }

  let response: Response;
  try {
    response = await fetch(`${environment.apiBaseUrl}/api/v1/admin${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${environment.adminApiToken}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AdminApiError('ADMIN_API_UNAVAILABLE', '后端服务暂时无法连接', 503);
  }

  let body: ApiEnvelope<unknown>;
  try {
    body = apiEnvelopeSchema(z.unknown()).parse(await response.json()) as ApiEnvelope<unknown>;
  } catch {
    throw new AdminApiError('INVALID_API_RESPONSE', '后端返回了无法识别的数据', 502);
  }
  if (!response.ok || body.code !== 'OK' || body.data === null) {
    throw new AdminApiError(body.code, body.message || '管理请求失败', response.status);
  }
  const parsedData = dataSchema.safeParse(body.data);
  if (!parsedData.success) {
    throw new AdminApiError('INVALID_API_RESPONSE', '后端数据与管理端契约不一致', 502);
  }
  return parsedData.data;
}

export async function safeAdminApi<T>(
  path: string,
  dataSchema: z.ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await requestAdminApi(path, dataSchema), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof AdminApiError ? error.message : '管理数据加载失败',
    };
  }
}
