import { healthStatusSchema } from '@uniclife/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildServer } from '../src/app/server.js';

describe('health routes', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });
  beforeEach(() => vi.stubEnv('RENDER_GIT_COMMIT', ''));
  afterEach(() => vi.unstubAllEnvs());
  it('returns the stable API envelope', async () => {
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
  it('identifies the deployed revision for release verification', async () => {
    const revision = '00b3d3e07d0000a7c771d06719a55a1f3dbd832c';
    vi.stubEnv('RENDER_GIT_COMMIT', revision);
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(healthStatusSchema.parse(response.json().data).revision).toBe(revision);
  });
});
