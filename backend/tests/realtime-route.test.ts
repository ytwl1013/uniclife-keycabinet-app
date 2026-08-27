import { realtimeProtocol } from '@uniclife/shared';
import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';
import { isRealtimeOriginAllowed } from '../src/modules/realtime/routes.js';

describe('realtime origin policy', () => {
  it('allows authenticated native clients with platform-specific origins', () => {
    expect(isRealtimeOriginAllowed({
      authorization: 'Bearer native-session-token',
      origin: 'http://192.168.50.53:8081',
    }, 'http://localhost:8081')).toBe(true);
  });

  it('still rejects an untrusted browser origin using subprotocol authentication', () => {
    expect(isRealtimeOriginAllowed({
      origin: 'https://untrusted.example.com',
    }, 'https://app.example.com')).toBe(false);
    expect(isRealtimeOriginAllowed({
      origin: 'https://app.example.com',
    }, 'https://app.example.com')).toBe(true);
  });
});

describe('realtime route security', () => {
  it('rejects a websocket upgrade without a session credential', async () => {
    const app = await buildServer();
    await app.ready();

    await expect(app.injectWS('/api/v1/realtime', {
      headers: { 'sec-websocket-protocol': realtimeProtocol },
    })).rejects.toThrow('Unexpected server response: 401');

    await app.close();
  });

  it('rejects unsupported websocket subprotocols before authentication', async () => {
    const app = await buildServer();
    await app.ready();

    await expect(app.injectWS('/api/v1/realtime', {
      headers: { 'sec-websocket-protocol': 'unsupported.protocol' },
    })).rejects.toThrow('Unexpected server response: 400');

    await app.close();
  });
});
