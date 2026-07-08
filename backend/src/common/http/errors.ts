import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { fail } from './response.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(fail('VALIDATION_ERROR', '请求参数不合法', error.flatten()));
    }

    const statusCode = getStatusCode(error);
    const code = statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
    const message = statusCode >= 500 ? '服务暂时不可用' : getMessage(error);

    if (statusCode >= 500) {
      app.log.error(error);
    }

    return reply.status(statusCode).send(fail(code, message));
  });
}

function getStatusCode(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' ? statusCode : 500;
  }

  return 500;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '请求失败';
}
