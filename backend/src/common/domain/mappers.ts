import type {
  Cabinet,
  CabinetEvent,
  CabinetMembership,
  CabinetQr,
  CurrentUserAccount,
  Key,
  Loan,
  ProductSku,
  UserAccount,
} from '@uniclife/shared';

import type {
  cabinetEvents,
  cabinetMemberships,
  cabinetQrs,
  cabinets,
  keys,
  loans,
  productSkus,
  users,
} from '../../db/schema.js';
import { toIsoDate } from './dates.js';

export function toUser(row: typeof users.$inferSelect): UserAccount {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    ...(row.avatarUri ? { avatarUri: row.avatarUri } : {}),
    locale: row.locale as UserAccount['locale'],
    status: row.status,
    createdAt: toIsoDate(row.createdAt),
  };
}

export function toCurrentUser(row: typeof users.$inferSelect): CurrentUserAccount {
  return {
    ...toUser(row),
    loginCount: row.loginCount,
    lastLoginAt: row.lastLoginAt ? toIsoDate(row.lastLoginAt) : null,
    homeGuidePromptedAt: row.homeGuidePromptedAt
      ? toIsoDate(row.homeGuidePromptedAt)
      : null,
  };
}

export function toSku(row: typeof productSkus.$inferSelect): ProductSku {
  return {
    id: row.id,
    sku: row.sku,
    model: row.model,
    name: row.name,
    color: row.color,
    capacity: row.capacity,
    description: row.description,
    manualUrl: row.manualUrl,
    imageAsset: row.imageAsset,
  };
}

export function toQr(row: typeof cabinetQrs.$inferSelect): CabinetQr {
  return {
    id: row.id,
    code: row.code,
    skuId: row.skuId,
    deviceUuid: row.deviceUuid,
    status: row.status,
    createdAt: toIsoDate(row.createdAt),
  };
}

export function toCabinet(row: typeof cabinets.$inferSelect): Cabinet {
  return {
    id: row.id,
    skuId: row.skuId,
    deviceUuid: row.deviceUuid,
    name: row.name,
    location: row.location,
    timeZone: row.timeZone,
    status: row.status,
    lastSyncedAt: toIsoDate(row.lastSyncedAt),
    createdAt: toIsoDate(row.createdAt),
    version: row.version,
  };
}

export function toMembership(row: typeof cabinetMemberships.$inferSelect): CabinetMembership {
  return {
    id: row.id,
    cabinetId: row.cabinetId,
    userId: row.userId,
    role: row.role,
    active: row.active,
    joinedAt: toIsoDate(row.joinedAt),
    ...(row.removedAt ? { removedAt: toIsoDate(row.removedAt) } : {}),
  };
}

export function toKey(row: typeof keys.$inferSelect): Key {
  return {
    id: row.id,
    cabinetId: row.cabinetId,
    slotId: row.slotId,
    name: row.name,
    note: row.note,
    status: row.status,
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  };
}

export function toLoan(row: typeof loans.$inferSelect): Loan {
  return {
    id: row.id,
    cabinetId: row.cabinetId,
    keyId: row.keyId,
    borrowerName: row.borrowerName,
    ...(row.borrowerContact ? { borrowerContact: row.borrowerContact } : {}),
    checkedOutAt: toIsoDate(row.checkedOutAt),
    ...(row.expectedReturnAt ? { expectedReturnAt: toIsoDate(row.expectedReturnAt) } : {}),
    ...(row.returnedAt ? { returnedAt: toIsoDate(row.returnedAt) } : {}),
    status: row.status,
    operatorId: row.operatorId,
    ...(row.returnOperatorId ? { returnOperatorId: row.returnOperatorId } : {}),
    checkoutEventId: row.checkoutEventId,
    ...(row.returnEventId ? { returnEventId: row.returnEventId } : {}),
  };
}

export function toEvent(row: typeof cabinetEvents.$inferSelect): CabinetEvent {
  return {
    id: row.id,
    cabinetId: row.cabinetId,
    ...(row.keyId ? { keyId: row.keyId } : {}),
    actorId: row.actorId,
    type: row.type,
    occurredAt: toIsoDate(row.occurredAt),
    reversible: row.reversible,
    ...(row.relatedLoanId ? { relatedLoanId: row.relatedLoanId } : {}),
    summaryData: row.summaryData,
  };
}
