import type { CabinetMetrics, CabinetSummary } from '@uniclife/shared';
import { and, eq, sql } from 'drizzle-orm';

import { toCabinet, toMembership, toSku } from '../../common/domain/mappers.js';
import { AppError } from '../../common/http/errors.js';
import type { DbExecutor } from '../../db/client.js';
import {
  cabinetMemberships,
  cabinets,
  keys,
  loans,
  productSkus,
} from '../../db/schema.js';

export async function requireCabinetMember(
  executor: DbExecutor,
  cabinetId: string,
  userId: string,
) {
  const [membership] = await executor
    .select()
    .from(cabinetMemberships)
    .where(
      and(
        eq(cabinetMemberships.cabinetId, cabinetId),
        eq(cabinetMemberships.userId, userId),
        eq(cabinetMemberships.active, true),
      ),
    )
    .limit(1);
  if (!membership) {
    throw new AppError(403, 'MEMBERSHIP_REQUIRED', '无权访问该钥匙柜');
  }
  return toMembership(membership);
}

export async function requireCabinetSuperAdmin(
  executor: DbExecutor,
  cabinetId: string,
  userId: string,
) {
  const membership = await requireCabinetMember(executor, cabinetId, userId);
  if (membership.role !== 'super_admin') {
    throw new AppError(403, 'SUPER_ADMIN_REQUIRED', '仅超级管理员可以执行此操作');
  }
  return membership;
}

export async function lockCabinet(
  executor: DbExecutor,
  cabinetId: string,
) {
  const [cabinet] = await executor
    .select()
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1)
    .for('update');
  if (!cabinet) {
    throw new AppError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
  }
  return cabinet;
}

export async function touchCabinet(
  executor: DbExecutor,
  cabinetId: string,
  expectedVersion?: number,
) {
  const conditions = [eq(cabinets.id, cabinetId)];
  if (expectedVersion !== undefined) {
    conditions.push(eq(cabinets.version, expectedVersion));
  }
  const [updated] = await executor
    .update(cabinets)
    .set({
      version: sql`${cabinets.version} + 1`,
      lastSyncedAt: new Date().toISOString(),
    })
    .where(and(...conditions))
    .returning();
  if (updated) {
    return updated;
  }

  const [current] = await executor.select().from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1);
  if (!current) {
    throw new AppError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
  }
  throw new AppError(409, 'VERSION_CONFLICT', '钥匙柜数据已更新，请刷新后重试', {
    expectedVersion,
    actualVersion: current.version,
  });
}

export async function getCabinetMetrics(
  executor: DbExecutor,
  cabinetId: string,
  capacity: number,
): Promise<CabinetMetrics> {
  const cabinetKeys = await executor.select().from(keys).where(eq(keys.cabinetId, cabinetId));
  const activeLoans = await executor
    .select()
    .from(loans)
    .where(and(eq(loans.cabinetId, cabinetId), eq(loans.status, 'active')));
  const borrowed = cabinetKeys.filter((key) => key.status === 'borrowed').length;
  const overdue = activeLoans.filter(
    (loan) => loan.expectedReturnAt && Date.parse(loan.expectedReturnAt) < Date.now(),
  ).length;
  return {
    capacity,
    occupied: cabinetKeys.length,
    available: cabinetKeys.filter((key) => key.status === 'available').length,
    borrowed,
    empty: Math.max(0, capacity - cabinetKeys.length),
    overdue,
  };
}

export async function getCabinetSummary(
  executor: DbExecutor,
  cabinetId: string,
): Promise<CabinetSummary> {
  const [row] = await executor
    .select({ cabinet: cabinets, sku: productSkus })
    .from(cabinets)
    .innerJoin(productSkus, eq(cabinets.skuId, productSkus.id))
    .where(eq(cabinets.id, cabinetId))
    .limit(1);
  if (!row) {
    throw new AppError(404, 'CABINET_NOT_FOUND', '钥匙柜不存在');
  }
  return {
    cabinet: toCabinet(row.cabinet),
    sku: toSku(row.sku),
    metrics: await getCabinetMetrics(executor, cabinetId, row.sku.capacity),
  };
}
