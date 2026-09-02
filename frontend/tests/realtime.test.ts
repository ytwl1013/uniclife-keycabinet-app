import {
  parseRealtimeEvent,
  realtimeEndpoint,
} from '../src/api/realtime';
import {
  REALTIME_MAX_RECONNECT_DELAY_MS,
  realtimeReconnectDelay,
} from '../src/features/app-refresh/realtime-policy';

jest.mock('../src/api/config', () => ({
  apiConfig: {
    appEnvironment: 'development',
    baseUrl: 'http://localhost:4000/api/v1',
  },
}));

describe('realtime client policy', () => {
  it('derives ws and wss endpoints without putting credentials in the URL', () => {
    expect(realtimeEndpoint('http://localhost:4000/api/v1')).toBe(
      'ws://localhost:4000/api/v1/realtime',
    );
    expect(realtimeEndpoint('https://api.example.com/api/v1/')).toBe(
      'wss://api.example.com/api/v1/realtime',
    );
  });

  it('validates realtime events before using them', () => {
    expect(parseRealtimeEvent(JSON.stringify({
      type: 'workspace.changed',
      eventId: 'realtime-1',
      occurredAt: '2026-08-24T08:00:00.000Z',
      cabinetId: 'cabinet-1',
      cabinetVersion: 3,
      resources: ['keys', 'events'],
    }))).toMatchObject({ type: 'workspace.changed', cabinetVersion: 3 });
    expect(parseRealtimeEvent('{not-json')).toBeNull();
    expect(parseRealtimeEvent(JSON.stringify({ type: 'workspace.changed' }))).toBeNull();
    expect(parseRealtimeEvent(JSON.stringify({
      type: 'support.message_created',
      eventId: 'realtime-support-1',
      occurredAt: '2026-08-24T08:01:00.000Z',
      feedbackId: 'feedback-1',
    }))).toMatchObject({ type: 'support.message_created', feedbackId: 'feedback-1' });
  });

  it('uses bounded exponential reconnect delays with jitter', () => {
    expect(realtimeReconnectDelay(0, 0.5)).toBe(1_000);
    expect(realtimeReconnectDelay(3, 0.5)).toBe(8_000);
    expect(realtimeReconnectDelay(20, 0.5)).toBe(REALTIME_MAX_RECONNECT_DELAY_MS);
    expect(realtimeReconnectDelay(20, 1)).toBe(REALTIME_MAX_RECONNECT_DELAY_MS);
  });
});
