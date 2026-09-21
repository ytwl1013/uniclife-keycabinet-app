import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./env', () => ({
  getAdminServerEnv: () => ({
    adminApiToken: 'test-admin-token-that-is-longer-than-32-characters',
    apiBaseUrl: 'https://api.example.com',
  }),
}));

import { AdminApiError, requestAdminApi } from './admin-api';

const resultSchema = z.object({ value: z.string() });

function okResponse(): Response {
  return new Response(JSON.stringify({ code: 'OK', message: 'ok', data: { value: 'ready' } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requestAdminApi', () => {
  it('retries a failed GET once so a sleeping backend can wake up', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(requestAdminApi('/overview', resultSchema)).resolves.toEqual({ value: 'ready' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry writes that could otherwise be submitted twice', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAdminApi('/products', resultSchema, {
      method: 'POST',
      body: { value: 'new' },
    })).rejects.toMatchObject({
      code: 'ADMIN_API_TIMEOUT',
      status: 504,
    } satisfies Partial<AdminApiError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
