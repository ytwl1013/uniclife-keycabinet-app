import { EventEmitter } from 'node:events';

import { realtimeEventSchema } from '@uniclife/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';

import { RealtimeHub } from '../src/modules/realtime/hub.js';

class TestSocket extends EventEmitter {
  readonly sent: string[] = [];
  closeCode?: number;
  pingCount = 0;
  readyState = 1;
  terminated = false;

  close(code?: number): void {
    this.closeCode = code;
    this.readyState = 3;
    this.emit('close');
  }

  ping(): void {
    this.pingCount += 1;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  terminate(): void {
    this.terminated = true;
    this.readyState = 3;
    this.emit('close');
  }
}

function socketEvents(socket: TestSocket) {
  return socket.sent.map((data) => realtimeEventSchema.parse(JSON.parse(data)));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('realtime hub', () => {
  it('sends cabinet changes only to active members and explicit removed users', async () => {
    const hub = new RealtimeHub({
      heartbeatIntervalMs: 45_000,
      resolveCabinetAudience: async () => ['user-member'],
    });
    const member = new TestSocket();
    const removed = new TestSocket();
    const unrelated = new TestSocket();
    hub.connect({ sessionId: 'session-member', userId: 'user-member' }, member as WebSocket);
    hub.connect({ sessionId: 'session-removed', userId: 'user-removed' }, removed as WebSocket);
    hub.connect({ sessionId: 'session-other', userId: 'user-other' }, unrelated as WebSocket);

    await hub.publishCabinetChange({
      additionalUserIds: ['user-removed'],
      cabinetId: 'cabinet-1',
      cabinetVersion: 4,
      resources: ['keys', 'loans', 'events'],
    });

    expect(socketEvents(member).at(-1)).toMatchObject({
      type: 'workspace.changed',
      cabinetId: 'cabinet-1',
      cabinetVersion: 4,
    });
    expect(socketEvents(removed).at(-1)).toMatchObject({ type: 'workspace.changed' });
    expect(socketEvents(unrelated)).toHaveLength(1);
    hub.stop();
  });

  it('disconnects revoked sessions without closing a retained session', () => {
    const hub = new RealtimeHub({ heartbeatIntervalMs: 45_000 });
    const retained = new TestSocket();
    const revoked = new TestSocket();
    hub.connect({ sessionId: 'session-current', userId: 'user-1' }, retained as WebSocket);
    hub.connect({ sessionId: 'session-old', userId: 'user-1' }, revoked as WebSocket);

    hub.disconnectOtherUserSessions('user-1', 'session-current');

    expect(retained.closeCode).toBeUndefined();
    expect(revoked.closeCode).toBe(4001);
    hub.stop();
  });

  it('sends support-message events only to the feedback owner', () => {
    const hub = new RealtimeHub({ heartbeatIntervalMs: 45_000 });
    const owner = new TestSocket();
    const unrelated = new TestSocket();
    hub.connect({ sessionId: 'session-owner', userId: 'user-owner' }, owner as WebSocket);
    hub.connect({ sessionId: 'session-other', userId: 'user-other' }, unrelated as WebSocket);

    hub.publishSupportMessage({ feedbackId: 'feedback-1', userId: 'user-owner' });

    expect(socketEvents(owner).at(-1)).toMatchObject({
      type: 'support.message_created',
      feedbackId: 'feedback-1',
    });
    expect(socketEvents(unrelated)).toHaveLength(1);
    hub.stop();
  });

  it('terminates a connection that misses two heartbeat checks', () => {
    vi.useFakeTimers();
    const hub = new RealtimeHub({ heartbeatIntervalMs: 1_000 });
    const socket = new TestSocket();
    hub.connect({ sessionId: 'session-1', userId: 'user-1' }, socket as WebSocket);
    hub.start();

    vi.advanceTimersByTime(1_000);
    expect(socket.pingCount).toBe(1);
    expect(socket.terminated).toBe(false);
    vi.advanceTimersByTime(1_000);
    expect(socket.terminated).toBe(true);
    hub.stop();
  });
});
