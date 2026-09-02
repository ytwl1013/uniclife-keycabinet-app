import {
  eventListQuerySchema,
  loanListQuerySchema,
} from '@uniclife/shared';
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../../common/auth/session.js';
import { toEvent, toLoan, toUser } from '../../common/domain/mappers.js';
import { ok } from '../../common/http/response.js';
import { requireDatabase } from '../../db/client.js';
import {
  cabinetEvents,
  cabinetMemberships,
  loans,
  users,
} from '../../db/schema.js';
import { requireCabinetMember } from '../cabinets/service.js';

export async function registerRecordRoutes(app: FastifyInstance): Promise<void> {
  app.get('/loans', async (request) => {
    const query = loanListQuerySchema.parse(request.query);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    if (query.cabinetId) {
      await requireCabinetMember(database, query.cabinetId, currentUser.id);
    }
    const filters: SQL[] = [
      eq(cabinetMemberships.userId, currentUser.id),
      eq(cabinetMemberships.active, true),
    ];
    if (query.cabinetId) {
      filters.push(eq(loans.cabinetId, query.cabinetId));
    }
    if (query.status) {
      filters.push(eq(loans.status, query.status));
    }
    const rows = await database
      .select({ loan: loans })
      .from(loans)
      .innerJoin(
        cabinetMemberships,
        and(
          eq(loans.cabinetId, cabinetMemberships.cabinetId),
          eq(cabinetMemberships.userId, currentUser.id),
        ),
      )
      .where(and(...filters))
      .orderBy(desc(loans.checkedOutAt), desc(loans.id))
      .limit(query.limit);
    return ok({ items: rows.map((row) => toLoan(row.loan)) });
  });

  app.get('/events', async (request) => {
    const query = eventListQuerySchema.parse(request.query);
    const currentUser = await requireAuth(request);
    const database = requireDatabase();
    if (query.cabinetId) {
      await requireCabinetMember(database, query.cabinetId, currentUser.id);
    }
    const filters: SQL[] = [
      eq(cabinetMemberships.userId, currentUser.id),
      eq(cabinetMemberships.active, true),
    ];
    if (query.cabinetId) {
      filters.push(eq(cabinetEvents.cabinetId, query.cabinetId));
    }
    if (query.keyId) {
      filters.push(eq(cabinetEvents.keyId, query.keyId));
    }
    if (query.actorId) {
      filters.push(eq(cabinetEvents.actorId, query.actorId));
    }
    if (query.type) {
      filters.push(
        inArray(cabinetEvents.type, Array.isArray(query.type) ? query.type : [query.type]),
      );
    }
    if (query.from) {
      filters.push(gte(cabinetEvents.occurredAt, query.from));
    }
    if (query.to) {
      filters.push(lte(cabinetEvents.occurredAt, query.to));
    }
    const rows = await database
      .select({ event: cabinetEvents, actor: users })
      .from(cabinetEvents)
      .innerJoin(
        cabinetMemberships,
        and(
          eq(cabinetEvents.cabinetId, cabinetMemberships.cabinetId),
          eq(cabinetMemberships.userId, currentUser.id),
        ),
      )
      .innerJoin(users, eq(cabinetEvents.actorId, users.id))
      .where(and(...filters))
      .orderBy(desc(cabinetEvents.occurredAt), desc(cabinetEvents.id))
      .limit(query.limit);
    const actors = new Map(rows.map((row) => [row.actor.id, toUser(row.actor)]));
    return ok({
      items: rows.map((row) => toEvent(row.event)),
      actors: [...actors.values()],
    });
  });
}
