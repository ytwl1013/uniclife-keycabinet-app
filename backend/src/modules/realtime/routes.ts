import {
  realtimeAuthProtocolPrefix,
  realtimeProtocol,
} from '@uniclife/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  authenticateSessionToken,
  type AuthenticatedUser,
} from '../../common/auth/session.js';
import { env } from '../../common/config/env.js';
import { AppError } from '../../common/http/errors.js';
import type { RealtimeHub } from './hub.js';

function bearerToken(request: FastifyRequest): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() || undefined;
  }
  const protocols = request.headers['sec-websocket-protocol']
    ?.split(',')
    .map((protocol) => protocol.trim());
  const authProtocol = protocols?.find((protocol) =>
    protocol.startsWith(realtimeAuthProtocolPrefix),
  );
  return authProtocol?.slice(realtimeAuthProtocolPrefix.length) || undefined;
}

export async function registerRealtimeRoutes(
  app: FastifyInstance,
  options: { realtime: RealtimeHub },
): Promise<void> {
  const authenticatedRequests = new WeakMap<FastifyRequest, AuthenticatedUser>();

  app.get(
    '/',
    {
      websocket: true,
      preValidation: async (request) => {
        const origin = request.headers.origin;
        if (origin && env.FRONTEND_ORIGIN !== '*' && origin !== env.FRONTEND_ORIGIN) {
          throw new AppError(403, 'ORIGIN_NOT_ALLOWED', '实时连接来源不受信任');
        }
        const protocols = request.headers['sec-websocket-protocol']
          ?.split(',')
          .map((protocol) => protocol.trim());
        if (!protocols?.includes(realtimeProtocol)) {
          throw new AppError(400, 'REALTIME_PROTOCOL_REQUIRED', '实时连接协议不受支持');
        }
        const token = bearerToken(request);
        if (!token) {
          throw new AppError(401, 'SESSION_REQUIRED', '请先登录');
        }
        authenticatedRequests.set(request, await authenticateSessionToken(token));
      },
    },
    (socket, request) => {
      const currentUser = authenticatedRequests.get(request);
      if (!currentUser) {
        socket.close(4001, 'session-required');
        return;
      }
      options.realtime.connect(
        { sessionId: currentUser.sessionId, userId: currentUser.id },
        socket,
      );
    },
  );
}
