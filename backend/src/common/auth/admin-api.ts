import { createHash, timingSafeEqual } from 'node:crypto';

import type { FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import { assertApp } from '../http/errors.js';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function requireAdminApi(request: FastifyRequest): void {
  const configuredToken = env.ADMIN_API_TOKEN;
  assertApp(
    configuredToken,
    503,
    'ADMIN_API_NOT_CONFIGURED',
    '管理接口尚未配置',
  );

  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  const validLength = token.length >= 32 && token.length <= 512;
  const valid = timingSafeEqual(digest(validLength ? token : ''), digest(configuredToken));

  assertApp(validLength && valid, 401, 'ADMIN_AUTH_REQUIRED', '管理接口认证失败');
}
