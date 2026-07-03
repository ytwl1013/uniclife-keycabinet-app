import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';

describe('health routes', () => {
  it('returns the stable API envelope', async () => {
    const app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      code: 'OK',
      message: 'ok',
      data: {
        service: 'uniclife-keycabinet-backend',
        status: 'ok',
      },
    });
  });
});
