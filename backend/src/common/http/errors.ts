import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { fail } from './response.js';

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function assertApp(
  condition: unknown,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): asserts condition {
  if (!condition) {
    throw new AppError(statusCode, code, message, details);
  }
}

export function errorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }
  if (postgresErrorCode(error) === '23505') {
    return 'RESOURCE_CONFLICT';
  }
  return 'INTERNAL_ERROR';
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(fail('VALIDATION_ERROR', '请求参数不合法', error.flatten()));
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(fail(error.code, error.message, error.details ?? null));
    }

    if (postgresErrorCode(error) === '23505') {
      return reply.status(409).send(fail('RESOURCE_CONFLICT', '资源已存在或状态已变化'));
    }

    if (error instanceof Error && error.message === 'DATABASE_NOT_CONFIGURED') {
      return reply.status(503).send(fail('DATABASE_NOT_CONFIGURED', '数据库未配置'));
    }

    const statusCode = getStatusCode(error);
    const code = statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
    const message = statusCode >= 500 ? '服务暂时不可用' : getMessage(error);

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'request failed');
    }

    return reply.status(statusCode).send(fail(code, message));
  });
}

export function postgresErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return candidate.code;
    }
    current = candidate.cause;
  }
  return undefined;
}

function getStatusCode(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' ? statusCode : 500;
  }
  return 500;
}

function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败';
}
