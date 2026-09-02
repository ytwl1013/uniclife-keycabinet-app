import type {
  RealtimeEvent,
  RealtimeResource,
  RealtimeSupportMessageCreatedEvent,
  RealtimeWorkspaceChangedEvent,
} from '@uniclife/shared';
import { and, eq } from 'drizzle-orm';
import type { WebSocket } from 'ws';

import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase } from '../../db/client.js';
import { cabinetMemberships } from '../../db/schema.js';

const SOCKET_OPEN = 1;
export const REALTIME_HEARTBEAT_INTERVAL_MS = 45_000;

type Connection = {
  alive: boolean;
  sessionId: string;
  socket: WebSocket;
  userId: string;
};

export type CabinetRealtimeChange = {
  cabinetId: string;
  cabinetVersion: number;
  additionalUserIds?: string[];
  resources: RealtimeResource[];
};

export interface RealtimePublisher {
  disconnectOtherUserSessions(userId: string, retainedSessionId: string): void;
  disconnectSession(sessionId: string): void;
  disconnectUser(userId: string): void;
  publishCabinetChange(change: CabinetRealtimeChange): Promise<void>;
  publishSupportMessage(input: { feedbackId: string; userId: string }): void;
}

export type RealtimeHubOptions = {
  heartbeatIntervalMs?: number;
  resolveCabinetAudience?: (cabinetId: string) => Promise<string[]>;
};

async function resolveCabinetAudience(cabinetId: string): Promise<string[]> {
  const database = requireDatabase();
  const rows = await database
    .select({ userId: cabinetMemberships.userId })
    .from(cabinetMemberships)
    .where(
      and(
        eq(cabinetMemberships.cabinetId, cabinetId),
        eq(cabinetMemberships.active, true),
      ),
    );
  return rows.map((row) => row.userId);
}

export class RealtimeHub implements RealtimePublisher {
  private readonly connections = new Set<Connection>();
  private readonly heartbeatIntervalMs: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly resolveAudience: (cabinetId: string) => Promise<string[]>;

  constructor(options: RealtimeHubOptions = {}) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? REALTIME_HEARTBEAT_INTERVAL_MS;
    this.resolveAudience = options.resolveCabinetAudience ?? resolveCabinetAudience;
  }

  start(): void {
    if (this.heartbeatTimer || this.heartbeatIntervalMs <= 0) return;
    this.heartbeatTimer = setInterval(() => this.heartbeat(), this.heartbeatIntervalMs);
    this.heartbeatTimer.unref();
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    for (const connection of [...this.connections]) {
      connection.socket.close(1001, 'server-shutdown');
      this.connections.delete(connection);
    }
  }

  connect(
    identity: { sessionId: string; userId: string },
    socket: WebSocket,
  ): void {
    const connection: Connection = { ...identity, alive: true, socket };
    this.connections.add(connection);
    const remove = () => this.connections.delete(connection);
    socket.on('close', remove);
    socket.on('error', remove);
    socket.on('pong', () => {
      connection.alive = true;
    });
    this.send(connection, {
      type: 'realtime.ready',
      eventId: createEntityId('realtime'),
      occurredAt: new Date().toISOString(),
      heartbeatIntervalMs: this.heartbeatIntervalMs,
    });
  }

  async publishCabinetChange(change: CabinetRealtimeChange): Promise<void> {
    const audience = new Set([
      ...(await this.resolveAudience(change.cabinetId)),
      ...(change.additionalUserIds ?? []),
    ]);
    const event: RealtimeWorkspaceChangedEvent = {
      type: 'workspace.changed',
      eventId: createEntityId('realtime'),
      occurredAt: new Date().toISOString(),
      cabinetId: change.cabinetId,
      cabinetVersion: change.cabinetVersion,
      resources: [...new Set(change.resources)],
    };
    for (const connection of this.connections) {
      if (audience.has(connection.userId)) this.send(connection, event);
    }
  }

  publishSupportMessage(input: { feedbackId: string; userId: string }): void {
    const event: RealtimeSupportMessageCreatedEvent = {
      type: 'support.message_created',
      eventId: createEntityId('realtime'),
      occurredAt: new Date().toISOString(),
      feedbackId: input.feedbackId,
    };
    for (const connection of this.connections) {
      if (connection.userId === input.userId) this.send(connection, event);
    }
  }

  disconnectSession(sessionId: string): void {
    this.disconnectWhere((connection) => connection.sessionId === sessionId);
  }

  disconnectOtherUserSessions(userId: string, retainedSessionId: string): void {
    this.disconnectWhere(
      (connection) =>
        connection.userId === userId && connection.sessionId !== retainedSessionId,
    );
  }

  disconnectUser(userId: string): void {
    this.disconnectWhere((connection) => connection.userId === userId);
  }

  private disconnectWhere(predicate: (connection: Connection) => boolean): void {
    for (const connection of [...this.connections]) {
      if (!predicate(connection)) continue;
      connection.socket.close(4001, 'session-revoked');
      this.connections.delete(connection);
    }
  }

  private heartbeat(): void {
    for (const connection of [...this.connections]) {
      if (!connection.alive) {
        connection.socket.terminate();
        this.connections.delete(connection);
        continue;
      }
      connection.alive = false;
      connection.socket.ping();
    }
  }

  private send(connection: Connection, event: RealtimeEvent): void {
    if (connection.socket.readyState !== SOCKET_OPEN) {
      this.connections.delete(connection);
      return;
    }
    try {
      connection.socket.send(JSON.stringify(event));
    } catch {
      connection.socket.terminate();
      this.connections.delete(connection);
    }
  }
}

export function publishRealtimeChange(
  app: { log: { error(input: unknown, message: string): void } },
  realtime: RealtimePublisher,
  change: CabinetRealtimeChange | undefined,
): void {
  if (!change) return;
  void realtime.publishCabinetChange(change).catch((error: unknown) => {
    app.log.error(
      { err: error, cabinetId: change.cabinetId },
      'realtime change publication failed',
    );
  });
}
