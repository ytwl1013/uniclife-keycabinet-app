import { z } from 'zod';

import { MockAppError } from './errors';
import { parseCabinetQrPayload } from './qr-payload';
import {
  cabinetEventTypes,
  MockAppState,
  MockDomainData,
  supportedLocales,
} from './types';

const id = z.string().trim().min(1);
const isoDate = z.string().datetime({ offset: true });
const localeSchema = z.enum(supportedLocales);

export const userAccountSchema = z.object({
  id,
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1),
  avatarUri: z.string().trim().min(1).optional(),
  locale: localeSchema,
  status: z.enum(['active', 'disabled']),
  createdAt: isoDate,
});

export const productSkuSchema = z.object({
  id,
  sku: z.string().trim().min(1),
  model: z.string().trim().min(1),
  name: z.string().trim().min(1),
  color: z.string().trim().min(1),
  capacity: z.number().int().positive(),
  description: z.string(),
  manualUrl: z.string().url(),
  imageAsset: z.string().trim().min(1),
});

export const cabinetQrSchema = z.object({
  id,
  code: z.string().trim().refine((value) => parseCabinetQrPayload(value) !== null, 'Invalid cabinet QR payload'),
  skuId: id,
  status: z.enum(['active', 'disabled']),
  createdAt: isoDate,
});

export const cabinetSchema = z.object({
  id,
  skuId: id,
  deviceUuid: z.string().uuid(),
  name: z.string().trim().min(1),
  location: z.string(),
  timeZone: z.string().trim().min(1),
  status: z.enum(['online', 'offline', 'maintenance']),
  lastSyncedAt: isoDate,
  createdAt: isoDate,
  version: z.number().int().nonnegative(),
});

export const membershipSchema = z.object({
  id,
  cabinetId: id,
  userId: id,
  role: z.enum(['super_admin', 'admin']),
  active: z.boolean(),
  joinedAt: isoDate,
  removedAt: isoDate.optional(),
});

export const keySlotSchema = z.object({
  id,
  cabinetId: id,
  position: z.number().int().positive(),
  keyId: id.nullable(),
});

export const keySchema = z.object({
  id,
  cabinetId: id,
  slotId: id,
  name: z.string().trim().min(1),
  note: z.string(),
  status: z.enum(['available', 'borrowed']),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const loanSchema = z.object({
  id,
  cabinetId: id,
  keyId: id,
  borrowerName: z.string().trim().min(1),
  borrowerContact: z.string().trim().min(1).optional(),
  checkedOutAt: isoDate,
  expectedReturnAt: isoDate.optional(),
  returnedAt: isoDate.optional(),
  status: z.enum(['active', 'returned', 'cancelled']),
  operatorId: id,
  returnOperatorId: id.optional(),
  checkoutEventId: id,
  returnEventId: id.optional(),
});

const eventSummaryValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const cabinetEventSchema = z.object({
  id,
  cabinetId: id,
  keyId: id.optional(),
  actorId: id,
  type: z.enum(cabinetEventTypes),
  occurredAt: isoDate,
  reversible: z.boolean(),
  reversedByEventId: id.optional(),
  relatedLoanId: id.optional(),
  summaryData: z.record(eventSummaryValueSchema),
});

export const consentRecordSchema = z.object({
  id,
  userId: id,
  kind: z.enum(['terms', 'privacy']),
  granted: z.boolean(),
  policyVersion: z.string().trim().min(1),
  locale: localeSchema,
  recordedAt: isoDate,
  withdrawnAt: isoDate.optional(),
});

export const domainDataSchema = z.object({
  users: z.array(userAccountSchema),
  skus: z.array(productSkuSchema),
  qrs: z.array(cabinetQrSchema),
  cabinets: z.array(cabinetSchema),
  memberships: z.array(membershipSchema),
  slots: z.array(keySlotSchema),
  keys: z.array(keySchema),
  loans: z.array(loanSchema),
  events: z.array(cabinetEventSchema),
  consents: z.array(consentRecordSchema),
});

export const persistedStateSchema = domainDataSchema.extend({
  currentUserId: id.nullable(),
  sessionStatus: z.enum(['anonymous', 'authenticated', 'expired']),
  online: z.boolean(),
  now: isoDate,
  version: z.number().int().nonnegative(),
});

function unique(
  values: string[],
  name: string,
  issues: string[],
): void {
  if (new Set(values).size !== values.length) {
    issues.push(`duplicate:${name}`);
  }
}

function validateReferences(data: MockDomainData): string[] {
  const issues: string[] = [];
  const userIds = new Set(data.users.map((item) => item.id));
  const skuIds = new Set(data.skus.map((item) => item.id));
  const cabinetIds = new Set(data.cabinets.map((item) => item.id));
  const keyIds = new Set(data.keys.map((item) => item.id));
  const loanIds = new Set(data.loans.map((item) => item.id));
  const eventIds = new Set(data.events.map((item) => item.id));

  unique(data.users.map((item) => item.id), 'user.id', issues);
  unique(data.users.map((item) => item.email.toLowerCase()), 'user.email', issues);
  unique(data.skus.map((item) => item.id), 'sku.id', issues);
  unique(data.skus.map((item) => item.sku), 'sku.sku', issues);
  unique(data.qrs.map((item) => item.id), 'qr.id', issues);
  unique(data.qrs.map((item) => item.code), 'qr.code', issues);
  unique(data.cabinets.map((item) => item.id), 'cabinet.id', issues);
  unique(data.cabinets.map((item) => item.deviceUuid), 'cabinet.device_uuid', issues);
  unique(data.memberships.map((item) => item.id), 'membership.id', issues);
  unique(
    data.memberships.map((item) => `${item.cabinetId}:${item.userId}`),
    'membership.cabinet_user',
    issues,
  );
  unique(data.slots.map((item) => item.id), 'slot.id', issues);
  unique(
    data.slots.map((item) => `${item.cabinetId}:${item.position}`),
    'slot.cabinet_position',
    issues,
  );
  unique(data.keys.map((item) => item.id), 'key.id', issues);
  unique(data.keys.map((item) => item.slotId), 'key.slot', issues);
  unique(data.loans.map((item) => item.id), 'loan.id', issues);
  unique(data.events.map((item) => item.id), 'event.id', issues);
  unique(data.consents.map((item) => item.id), 'consent.id', issues);

  for (const cabinet of data.cabinets) {
    const sku = data.skus.find((item) => item.id === cabinet.skuId);
    if (!skuIds.has(cabinet.skuId)) {
      issues.push(`cabinet_reference:${cabinet.id}`);
    }
    const cabinetSlots = data.slots.filter((item) => item.cabinetId === cabinet.id);
    if (sku && cabinetSlots.length !== sku.capacity) {
      issues.push(`cabinet_capacity:${cabinet.id}`);
    }
  }
  for (const qr of data.qrs) {
    const sku = data.skus.find((item) => item.id === qr.skuId);
    const payload = parseCabinetQrPayload(qr.code);
    if (
      !sku ||
      !payload ||
      payload.sku !== sku.sku
    ) {
      issues.push(`qr_reference:${qr.id}`);
    }
  }
  for (const membership of data.memberships) {
    if (!cabinetIds.has(membership.cabinetId) || !userIds.has(membership.userId)) {
      issues.push(`membership_reference:${membership.id}`);
    }
  }
  for (const slot of data.slots) {
    if (!cabinetIds.has(slot.cabinetId) || (slot.keyId && !keyIds.has(slot.keyId))) {
      issues.push(`slot_reference:${slot.id}`);
    }
  }
  for (const key of data.keys) {
    const slot = data.slots.find((item) => item.id === key.slotId);
    if (!cabinetIds.has(key.cabinetId) || !slot || slot.cabinetId !== key.cabinetId) {
      issues.push(`key_reference:${key.id}`);
    }
    if (slot?.keyId !== key.id) {
      issues.push(`key_slot_mismatch:${key.id}`);
    }
  }
  for (const loan of data.loans) {
    if (
      !cabinetIds.has(loan.cabinetId) ||
      (loan.status === 'active' && !keyIds.has(loan.keyId)) ||
      !userIds.has(loan.operatorId) ||
      !eventIds.has(loan.checkoutEventId) ||
      (loan.returnEventId && !eventIds.has(loan.returnEventId))
    ) {
      issues.push(`loan_reference:${loan.id}`);
    }
    if (loan.expectedReturnAt && Date.parse(loan.expectedReturnAt) <= Date.parse(loan.checkedOutAt)) {
      issues.push(`loan_expected_return:${loan.id}`);
    }
    if (loan.status === 'returned' && (!loan.returnedAt || !loan.returnEventId)) {
      issues.push(`loan_return_state:${loan.id}`);
    }
  }
  for (const event of data.events) {
    if (
      !cabinetIds.has(event.cabinetId) ||
      !userIds.has(event.actorId) ||
      (event.relatedLoanId && !loanIds.has(event.relatedLoanId)) ||
      (event.reversedByEventId && !eventIds.has(event.reversedByEventId))
    ) {
      issues.push(`event_reference:${event.id}`);
    }
  }
  for (const consent of data.consents) {
    if (!userIds.has(consent.userId)) {
      issues.push(`consent_reference:${consent.id}`);
    }
  }
  for (const key of data.keys) {
    const activeLoans = data.loans.filter(
      (loan) => loan.keyId === key.id && loan.status === 'active',
    );
    if (activeLoans.length > 1) {
      issues.push(`multiple_active_loans:${key.id}`);
    }
    if ((key.status === 'borrowed') !== (activeLoans.length === 1)) {
      issues.push(`key_loan_state:${key.id}`);
    }
  }

  return issues;
}

export function parseDomainData(input: unknown, source: 'seed' | 'storage' = 'seed'): MockDomainData {
  const parsed = domainDataSchema.safeParse(input);
  if (!parsed.success) {
    throw new MockAppError(source === 'seed' ? 'SEED_DATA_INVALID' : 'STORAGE_DATA_INVALID');
  }
  const data = parsed.data as MockDomainData;
  const issues = validateReferences(data);
  if (issues.length > 0) {
    throw new MockAppError(source === 'seed' ? 'SEED_DATA_INVALID' : 'STORAGE_DATA_INVALID', {
      issueCount: issues.length,
      firstIssue: issues[0],
    });
  }
  return data;
}

export function parsePersistedState(input: unknown): Omit<MockAppState, 'hydrated'> {
  const parsed = persistedStateSchema.safeParse(input);
  if (!parsed.success) {
    throw new MockAppError('STORAGE_DATA_INVALID');
  }
  const data = parseDomainData(parsed.data, 'storage');
  return {
    ...data,
    currentUserId: parsed.data.currentUserId,
    sessionStatus: parsed.data.sessionStatus,
    online: parsed.data.online,
    now: parsed.data.now,
    version: parsed.data.version,
  };
}
