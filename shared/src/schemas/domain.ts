import { z } from 'zod';

export const entityIdSchema = z.string().trim().min(1).max(128);
export const isoDateSchema = z.string().datetime({ offset: true });
export const supportedLocales = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-PT',
  'nl-NL',
  'pl-PL',
  'zh-CN',
  'zh-TW',
] as const;

export const supportedLocaleSchema = z.enum(supportedLocales);
export const userStatusSchema = z.enum(['active', 'disabled']);
export const cabinetStatusSchema = z.enum(['online', 'offline', 'maintenance']);
export const keyStatusSchema = z.enum(['available', 'borrowed']);
export const recordTypeSchema = z.enum(['borrow', 'return', 'inventory', 'force_open', 'exception']);

export const userAccountSchema = z.object({
  id: entityIdSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(128),
  avatarUri: z.string().min(1).optional(),
  locale: supportedLocaleSchema,
  status: userStatusSchema,
  createdAt: isoDateSchema,
});

export const productSkuSchema = z.object({
  id: entityIdSchema,
  sku: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  color: z.string().min(1).max(64),
  capacity: z.number().int().positive(),
  description: z.string(),
  manualUrl: z.string().url(),
  imageAsset: z.string().min(1).max(256),
});

export const cabinetQrSchema = z.object({
  id: entityIdSchema,
  code: z.string().min(1).max(256),
  skuId: entityIdSchema,
  deviceUuid: z.string().uuid(),
  status: z.enum(['active', 'disabled']),
  createdAt: isoDateSchema,
});

export const cabinetSchema = z.object({
  id: entityIdSchema,
  skuId: entityIdSchema,
  deviceUuid: z.string().uuid(),
  name: z.string().min(1).max(128),
  location: z.string().max(256),
  timeZone: z.string().min(1).max(64),
  status: cabinetStatusSchema,
  lastSyncedAt: isoDateSchema,
  createdAt: isoDateSchema,
  version: z.number().int().nonnegative(),
});

export const cabinetMembershipSchema = z.object({
  id: entityIdSchema,
  cabinetId: entityIdSchema,
  userId: entityIdSchema,
  role: z.literal('admin'),
  active: z.boolean(),
  joinedAt: isoDateSchema,
  removedAt: isoDateSchema.optional(),
});

export const keySlotSchema = z.object({
  id: entityIdSchema,
  cabinetId: entityIdSchema,
  position: z.number().int().positive(),
  keyId: entityIdSchema.nullable(),
});

export const keySchema = z.object({
  id: entityIdSchema,
  cabinetId: entityIdSchema,
  slotId: entityIdSchema,
  name: z.string().min(1).max(128),
  note: z.string().max(1000),
  status: keyStatusSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const loanStatusSchema = z.enum(['active', 'returned', 'cancelled']);
export const loanSchema = z.object({
  id: entityIdSchema,
  cabinetId: entityIdSchema,
  keyId: entityIdSchema,
  borrowerName: z.string().min(1).max(128),
  borrowerContact: z.string().min(1).max(320).optional(),
  checkedOutAt: isoDateSchema,
  expectedReturnAt: isoDateSchema.optional(),
  returnedAt: isoDateSchema.optional(),
  status: loanStatusSchema,
  operatorId: entityIdSchema,
  returnOperatorId: entityIdSchema.optional(),
  checkoutEventId: entityIdSchema,
  returnEventId: entityIdSchema.optional(),
});

export const cabinetEventTypes = [
  'cabinet_bound',
  'cabinet_renamed',
  'member_removed',
  'key_added',
  'key_updated',
  'key_deleted',
  'checkout',
  'return',
  'keys_deleted',
] as const;

export const cabinetEventTypeSchema = z.enum(cabinetEventTypes);
export const eventSummaryValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const cabinetEventSchema = z.object({
  id: entityIdSchema,
  cabinetId: entityIdSchema,
  keyId: entityIdSchema.optional(),
  actorId: entityIdSchema,
  type: cabinetEventTypeSchema,
  occurredAt: isoDateSchema,
  reversible: z.boolean(),
  relatedLoanId: entityIdSchema.optional(),
  summaryData: z.record(eventSummaryValueSchema),
});

export const cabinetMetricsSchema = z.object({
  capacity: z.number().int().nonnegative(),
  occupied: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  borrowed: z.number().int().nonnegative(),
  empty: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
});

export const cabinetSummarySchema = z.object({
  cabinet: cabinetSchema,
  sku: productSkuSchema,
  metrics: cabinetMetricsSchema,
});

export const cabinetMemberViewSchema = z.object({
  membership: cabinetMembershipSchema,
  user: userAccountSchema,
});

export const cabinetDetailSchema = cabinetSummarySchema.extend({
  slots: z.array(keySlotSchema),
  keys: z.array(keySchema),
  members: z.array(cabinetMemberViewSchema),
  activeLoans: z.array(loanSchema),
});

export const keyActionRequestSchema = z.object({
  keyCode: z.string().min(1).max(64),
  cabinetCode: z.string().min(1).max(64),
  slotCode: z.string().min(1).max(64),
  requestId: z.string().min(8).max(128),
  reason: z.string().max(256).optional(),
});

export type UserStatus = z.infer<typeof userStatusSchema>;
export type CabinetStatus = z.infer<typeof cabinetStatusSchema>;
export type KeyStatus = z.infer<typeof keyStatusSchema>;
export type RecordType = z.infer<typeof recordTypeSchema>;
export type KeyActionRequest = z.infer<typeof keyActionRequestSchema>;
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
export type UserAccount = z.infer<typeof userAccountSchema>;
export type ProductSku = z.infer<typeof productSkuSchema>;
export type CabinetQr = z.infer<typeof cabinetQrSchema>;
export type Cabinet = z.infer<typeof cabinetSchema>;
export type CabinetMembership = z.infer<typeof cabinetMembershipSchema>;
export type KeySlot = z.infer<typeof keySlotSchema>;
export type Key = z.infer<typeof keySchema>;
export type Loan = z.infer<typeof loanSchema>;
export type CabinetEventType = z.infer<typeof cabinetEventTypeSchema>;
export type CabinetEvent = z.infer<typeof cabinetEventSchema>;
export type CabinetMetrics = z.infer<typeof cabinetMetricsSchema>;
export type CabinetSummary = z.infer<typeof cabinetSummarySchema>;
export type CabinetDetail = z.infer<typeof cabinetDetailSchema>;
