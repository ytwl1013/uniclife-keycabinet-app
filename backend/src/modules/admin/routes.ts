import {
  adminActivityQuerySchema,
  adminUserQuerySchema,
  adminUserStatusRequestSchema,
  entityIdSchema,
  type AdminActivity,
} from '@uniclife/shared';
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { requireAdminApi } from '../../common/auth/admin-api.js';
import { toIsoDate } from '../../common/domain/dates.js';
import { assertApp, errorCode } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { requireDatabase, type AppDatabase } from '../../db/client.js';
import {
  auditLogs,
  cabinetMemberships,
  cabinets,
  keys,
  productSkus,
  sessions,
  users,
} from '../../db/schema.js';
import { appendAudit } from '../audit/service.js';
import type { RealtimeHub } from '../realtime/hub.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';
import type { ExpoPushNotifier } from '../../integrations/notifications/expo-push-notifier.js';
import { registerAdminSupportRoutes } from './support-routes.js';
import { registerAdminProductRoutes } from './product-routes.js';

type AdminRouteOptions = {
  notifier?: FeedbackNotifier;
  pushNotifier?: ExpoPushNotifier;
  realtime: RealtimeHub;
};

type ActivityRow = {
  audit: typeof auditLogs.$inferSelect;
  actor: Pick<typeof users.$inferSelect, 'id' | 'displayName' | 'email'> | null;
};

function toAdminActivity(row: ActivityRow): AdminActivity {
  return {
    id: row.audit.id,
    action: row.audit.action,
    targetType: row.audit.targetType,
    targetId: row.audit.targetId,
    result: row.audit.result,
    reasonCode: row.audit.reasonCode,
    createdAt: toIsoDate(row.audit.createdAt),
    actor: row.actor
      ? {
          id: row.actor.id,
          displayName: row.actor.displayName,
          email: row.actor.email,
        }
      : null,
  };
}

async function recentActivities(database: AppDatabase, limit: number): Promise<AdminActivity[]> {
  const rows = await database
    .select({
      audit: auditLogs,
      actor: {
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);

  return rows.map(toAdminActivity);
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  options: AdminRouteOptions,
): Promise<void> {
  app.addHook('preHandler', async (request) => {
    requireAdminApi(request);
  });

  await registerAdminProductRoutes(app);
  await registerAdminSupportRoutes(app, options);

  app.get('/overview', async () => {
    const database = requireDatabase();
    const now = new Date();
    const nowIso = now.toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const [userMetrics] = await database
      .select({
        totalUsers: sql<number>`count(*) filter (where ${users.deletedAt} is null)::int`.mapWith(Number),
        activeUsers:
          sql<number>`count(*) filter (where ${users.deletedAt} is null and ${users.status} = 'active')::int`.mapWith(
            Number,
          ),
        disabledUsers:
          sql<number>`count(*) filter (where ${users.deletedAt} is null and ${users.status} = 'disabled')::int`.mapWith(
            Number,
          ),
        newUsersLast7Days:
          sql<number>`count(*) filter (where ${users.deletedAt} is null and ${users.createdAt} >= ${sevenDaysAgoIso})::int`.mapWith(
            Number,
          ),
      })
      .from(users);
    const [sessionMetrics] = await database
      .select({ value: count() })
      .from(sessions)
      .where(and(isNull(sessions.revokedAt), gt(sessions.expiresAt, nowIso)));
    const [cabinetMetrics] = await database
      .select({
        total: count(),
        online:
          sql<number>`count(*) filter (where ${cabinets.status} = 'online')::int`.mapWith(Number),
      })
      .from(cabinets);
    const trendRows = await database
      .select({
        date:
          sql<string>`to_char(date_trunc('day', ${auditLogs.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        value: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, sevenDaysAgoIso))
      .groupBy(sql`date_trunc('day', ${auditLogs.createdAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${auditLogs.createdAt} at time zone 'UTC')`);
    const trendByDate = new Map(trendRows.map((row) => [row.date, row.value]));
    const activityTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo.getTime() + index * 24 * 60 * 60 * 1000);
      const day = utcDay(date);
      return { date: day, count: trendByDate.get(day) ?? 0 };
    });

    return ok({
      metrics: {
        totalUsers: userMetrics?.totalUsers ?? 0,
        activeUsers: userMetrics?.activeUsers ?? 0,
        disabledUsers: userMetrics?.disabledUsers ?? 0,
        newUsersLast7Days: userMetrics?.newUsersLast7Days ?? 0,
        activeSessions: sessionMetrics?.value ?? 0,
        totalCabinets: cabinetMetrics?.total ?? 0,
        onlineCabinets: cabinetMetrics?.online ?? 0,
      },
      activityTrend,
      recentActivities: await recentActivities(database, 8),
    });
  });

  app.get('/users', async (request) => {
    const query = adminUserQuerySchema.parse(request.query);
    const database = requireDatabase();
    const filters: SQL[] = [isNull(users.deletedAt)];
    if (query.status !== 'all') {
      filters.push(eq(users.status, query.status));
    }
    if (query.query) {
      const pattern = `%${query.query}%`;
      filters.push(or(ilike(users.email, pattern), ilike(users.displayName, pattern))!);
    }

    const where = and(...filters);
    const [totalRow] = await database.select({ value: count() }).from(users).where(where);
    const rows = await database
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        locale: users.locale,
        status: users.status,
        loginCount: users.loginCount,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        cabinetCount:
          sql<number>`(select count(*)::int from ${cabinetMemberships} where ${cabinetMemberships.userId} = ${users.id} and ${cabinetMemberships.active} = true)`.mapWith(
            Number,
          ),
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(query.limit)
      .offset(query.offset);

    return ok({
      items: rows.map((row) => ({
        ...row,
        locale: row.locale as (typeof import('@uniclife/shared').supportedLocales)[number],
        lastLoginAt: row.lastLoginAt ? toIsoDate(row.lastLoginAt) : null,
        createdAt: toIsoDate(row.createdAt),
      })),
      total: totalRow?.value ?? 0,
      limit: query.limit,
      offset: query.offset,
    });
  });

  app.get<{ Params: { userId: string } }>('/users/:userId', async (request) => {
    const userId = entityIdSchema.parse(request.params.userId);
    const database = requireDatabase();
    const now = new Date().toISOString();
    const [user] = await database
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        locale: users.locale,
        status: users.status,
        loginCount: users.loginCount,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        cabinetCount:
          sql<number>`(select count(*)::int from ${cabinetMemberships} where ${cabinetMemberships.userId} = ${users.id} and ${cabinetMemberships.active} = true)`.mapWith(
            Number,
          ),
        activeSessionCount:
          sql<number>`(select count(*)::int from ${sessions} where ${sessions.userId} = ${users.id} and ${sessions.revokedAt} is null and ${sessions.expiresAt} > ${now})`.mapWith(
            Number,
          ),
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    assertApp(user, 404, 'USER_NOT_FOUND', '用户不存在');

    const cabinetRows = await database
      .select({
        id: cabinets.id,
        name: cabinets.name,
        location: cabinets.location,
        timeZone: cabinets.timeZone,
        status: cabinets.status,
        lastSyncedAt: cabinets.lastSyncedAt,
        createdAt: cabinets.createdAt,
        version: cabinets.version,
        membershipRole: cabinetMemberships.role,
        membershipJoinedAt: cabinetMemberships.joinedAt,
        productSku: productSkus.sku,
        productModel: productSkus.model,
        productName: productSkus.name,
        productColor: productSkus.color,
        productCapacity: productSkus.capacity,
        keyCount:
          sql<number>`(select count(*)::int from ${keys} where ${keys.cabinetId} = ${cabinets.id})`.mapWith(
            Number,
          ),
        borrowedKeyCount:
          sql<number>`(select count(*)::int from ${keys} where ${keys.cabinetId} = ${cabinets.id} and ${keys.status} = 'borrowed')`.mapWith(
            Number,
          ),
      })
      .from(cabinetMemberships)
      .innerJoin(cabinets, eq(cabinetMemberships.cabinetId, cabinets.id))
      .innerJoin(productSkus, eq(cabinets.skuId, productSkus.id))
      .where(and(eq(cabinetMemberships.userId, userId), eq(cabinetMemberships.active, true)))
      .orderBy(desc(cabinetMemberships.joinedAt), desc(cabinets.id));

    const cabinetIds = cabinetRows.map((cabinet) => cabinet.id);
    const administratorRows = cabinetIds.length
      ? await database
          .select({
            cabinetId: cabinetMemberships.cabinetId,
            id: users.id,
            displayName: users.displayName,
            email: users.email,
            status: users.status,
            role: cabinetMemberships.role,
            joinedAt: cabinetMemberships.joinedAt,
          })
          .from(cabinetMemberships)
          .innerJoin(users, eq(cabinetMemberships.userId, users.id))
          .where(
            and(
              inArray(cabinetMemberships.cabinetId, cabinetIds),
              eq(cabinetMemberships.active, true),
              isNull(users.deletedAt),
            ),
          )
          .orderBy(cabinetMemberships.cabinetId, cabinetMemberships.role, users.displayName)
      : [];
    const administratorsByCabinet = new Map<string, typeof administratorRows>();
    for (const administrator of administratorRows) {
      const current = administratorsByCabinet.get(administrator.cabinetId) ?? [];
      current.push(administrator);
      administratorsByCabinet.set(administrator.cabinetId, current);
    }

    return ok({
      user: {
        ...user,
        locale: user.locale as (typeof import('@uniclife/shared').supportedLocales)[number],
        lastLoginAt: user.lastLoginAt ? toIsoDate(user.lastLoginAt) : null,
        createdAt: toIsoDate(user.createdAt),
      },
      cabinets: cabinetRows.map((cabinet) => ({
        id: cabinet.id,
        name: cabinet.name,
        location: cabinet.location,
        timeZone: cabinet.timeZone,
        status: cabinet.status,
        lastSyncedAt: toIsoDate(cabinet.lastSyncedAt),
        createdAt: toIsoDate(cabinet.createdAt),
        version: cabinet.version,
        membership: {
          role: cabinet.membershipRole,
          joinedAt: toIsoDate(cabinet.membershipJoinedAt),
        },
        product: {
          sku: cabinet.productSku,
          model: cabinet.productModel,
          name: cabinet.productName,
          color: cabinet.productColor,
          capacity: cabinet.productCapacity,
        },
        keyCount: cabinet.keyCount,
        borrowedKeyCount: cabinet.borrowedKeyCount,
        administrators: (administratorsByCabinet.get(cabinet.id) ?? []).map((administrator) => ({
          id: administrator.id,
          displayName: administrator.displayName,
          email: administrator.email,
          status: administrator.status,
          role: administrator.role,
          joinedAt: toIsoDate(administrator.joinedAt),
        })),
      })),
    });
  });

  app.get('/activities', async (request) => {
    const query = adminActivityQuerySchema.parse(request.query);
    const database = requireDatabase();
    const filters: SQL[] = [];
    if (query.result !== 'all') {
      filters.push(eq(auditLogs.result, query.result));
    }
    if (query.query) {
      const pattern = `%${query.query}%`;
      filters.push(
        or(
          ilike(auditLogs.action, pattern),
          ilike(auditLogs.targetId, pattern),
          ilike(users.email, pattern),
          ilike(users.displayName, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;
    const [totalRow] = await database
      .select({ value: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(where);
    const rows = await database
      .select({
        audit: auditLogs,
        actor: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(query.limit)
      .offset(query.offset);

    return ok({
      items: rows.map(toAdminActivity),
      total: totalRow?.value ?? 0,
      limit: query.limit,
      offset: query.offset,
    });
  });

  app.patch<{ Params: { userId: string } }>(
    '/users/:userId/status',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request) => {
      const input = adminUserStatusRequestSchema.parse(request.body);
      const userId = entityIdSchema.parse(request.params.userId);
      const database = requireDatabase();
      const [current] = await database
        .select({ id: users.id, status: users.status, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!current || current.deletedAt) {
        await appendAudit(database, {
          action: 'admin.user_status_updated',
          targetType: 'user',
          targetId: userId,
          result: 'failure',
          reasonCode: 'USER_NOT_FOUND',
          metadata: { adminActor: 'environment_admin' },
        });
      }
      assertApp(current && !current.deletedAt, 404, 'USER_NOT_FOUND', '用户不存在');

      const now = new Date().toISOString();
      try {
        await database.transaction(async (transaction) => {
          await transaction
            .update(users)
            .set({ status: input.status, updatedAt: now })
            .where(and(eq(users.id, current.id), isNull(users.deletedAt)));
          if (input.status === 'disabled') {
            await transaction
              .update(sessions)
              .set({ revokedAt: now })
              .where(and(eq(sessions.userId, current.id), isNull(sessions.revokedAt)));
          }
          await appendAudit(transaction, {
            action: 'admin.user_status_updated',
            targetType: 'user',
            targetId: current.id,
            result: 'success',
            metadata: {
              adminActor: 'environment_admin',
              previousStatus: current.status,
              nextStatus: input.status,
            },
          });
        });
      } catch (error) {
        try {
          await appendAudit(database, {
            action: 'admin.user_status_updated',
            targetType: 'user',
            targetId: current.id,
            result: 'failure',
            reasonCode: errorCode(error),
            metadata: {
              adminActor: 'environment_admin',
              previousStatus: current.status,
              nextStatus: input.status,
            },
          });
        } catch (auditError) {
          request.log.error({ err: auditError }, 'admin status failure audit storage failed');
        }
        throw error;
      }

      if (input.status === 'disabled') {
        options.realtime.disconnectUser(current.id);
      }
      return ok({ id: current.id, status: input.status });
    },
  );
}
