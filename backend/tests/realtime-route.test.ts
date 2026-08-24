import { realtimeProtocol } from '@uniclife/shared';
import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';

describe('realtime route security', () => {
  it('rejects a websocket upgrade without a session credential', async () => {
    const app = await buildServer();
    await app.ready();

    await expect(app.injectWS('/api/v1/realtime', {
      headers: { 'sec-websocket-protocol': realtimeProtocol },
    })).rejects.toThrow();

    await app.close();
  });

  it('rejects unsupported websocket subprotocols before authentication', async () => {
    const app = await buildServer();
    await app.ready();

    await expect(app.injectWS('/api/v1/realtime', {
      headers: { 'sec-websocket-protocol': 'unsupported.protocol' },
    })).rejects.toThrow();

    await app.close();
  });
});
