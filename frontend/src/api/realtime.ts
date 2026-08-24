import {
  realtimeAuthProtocolPrefix,
  realtimeEventSchema,
  realtimeProtocol,
  type RealtimeEvent,
} from '@uniclife/shared';

import { apiConfig } from './config';

export function realtimeEndpoint(baseUrl = apiConfig.baseUrl): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/realtime`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function createRealtimeWebSocket(token: string): WebSocket {
  const protocols = [realtimeProtocol];
  if (process.env.EXPO_OS === 'web') {
    protocols.push(`${realtimeAuthProtocolPrefix}${token}`);
    return new WebSocket(realtimeEndpoint(), protocols);
  }
  const NativeWebSocket = WebSocket as unknown as {
    new (
      url: string,
      protocols: string[],
      options: { headers: Record<string, string> },
    ): WebSocket;
  };
  return new NativeWebSocket(realtimeEndpoint(), protocols, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function parseRealtimeEvent(data: unknown): RealtimeEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = realtimeEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
