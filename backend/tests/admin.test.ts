import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';

describe('admin route security boundary', () => {
  it('never exposes admin data without the dedicated service token', async () => {
    const app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/overview' });

    expect([401, 503]).toContain(response.statusCode);
    expect(response.json().data).toBeNull();

    await app.close();
  });
});
