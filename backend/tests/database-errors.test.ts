import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { postgresErrorCode, registerErrorHandler } from '../src/common/http/errors.js';

describe('database error normalization', () => {
  it('maps a wrapped PostgreSQL unique conflict to 409 without exposing SQL', async () => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get('/', async () => { throw new Error('private query', { cause: Object.assign(new Error('constraint'), { code: '23505' }) }); });
    const response = await app.inject('/');
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('RESOURCE_CONFLICT');
    expect(response.body).not.toContain('private query');
    await app.close();
  });

  it('terminates on cyclic exception causes', () => {
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(postgresErrorCode(cyclic)).toBeUndefined();
  });
});
