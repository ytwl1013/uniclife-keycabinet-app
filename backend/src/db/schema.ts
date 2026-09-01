import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'disabled']);
export const cabinetStatus = pgEnum('cabinet_status', ['online', 'offline', 'maintenance']);
export const qrStatus = pgEnum('qr_status', ['active', 'disabled']);
export const keyStatus = pgEnum('key_status', ['available', 'borrowed']);
export const loanStatus = pgEnum('loan_status', ['active', 'returned', 'cancelled']);
export const consentKind = pgEnum('consent_kind', ['terms', 'privacy']);
export const membershipRole = pgEnum('membership_role', ['super_admin', 'admin']);
export const auditResult = pgEnum('audit_result', ['success', 'failure']);
export const feedbackDeliveryStatus = pgEnum('feedback_delivery_status', [
  'sending',
  'sent',
  'failed',
]);
export const cabinetEventType = pgEnum('cabinet_event_type', [
  'cabinet_bound',
  'cabinet_initialized',
  'member_joined',
  'cabinet_renamed',
  'super_admin_transferred',
  'member_removed',
  'key_added',
  'key_updated',
  'key_deleted',
  'checkout',
  'return',
  'keys_deleted',
]);

const id = (name: string) => varchar(name, { length: 128 });
const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: id('id').primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    avatarUri: text('avatar_uri'),
    locale: varchar('locale', { length: 16 }).notNull().default('en-US'),
    status: userStatus('status').notNull().default('active'),
    loginCount: integer('login_count').notNull().default(0),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
    homeGuidePromptedAt: timestamp('home_guide_prompted_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
    check('users_login_count_nonnegative', sql`${table.loginCount} >= 0`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id('id').primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const passwordResetChallenges = pgTable(
  'password_reset_challenges',
  {
    id: id('id').primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'string' }),
    resetTokenHash: varchar('reset_token_hash', { length: 64 }),
    resetTokenExpiresAt: timestamp('reset_token_expires_at', { withTimezone: true, mode: 'string' }),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('password_reset_user_idx').on(table.userId, table.createdAt),
    uniqueIndex('password_reset_token_hash_unique').on(table.resetTokenHash),
    check('password_reset_attempts_nonnegative', sql`${table.attempts} >= 0`),
  ],
);

export const productSkus = pgTable(
  'product_skus',
  {
    id: id('id').primaryKey(),
    sku: varchar('sku', { length: 64 }).notNull().unique(),
    model: varchar('model', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    color: varchar('color', { length: 64 }).notNull(),
    capacity: integer('capacity').notNull(),
    description: text('description').notNull(),
    manualUrl: text('manual_url').notNull(),
    imageAsset: varchar('image_asset', { length: 256 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [check('product_skus_capacity_positive', sql`${table.capacity} > 0`)],
);

export const cabinetQrs = pgTable(
  'cabinet_qrs',
  {
    id: id('id').primaryKey(),
    code: varchar('code', { length: 256 }).notNull().unique(),
    skuId: id('sku_id')
      .notNull()
      .references(() => productSkus.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    deviceUuid: varchar('device_uuid', { length: 36 }).notNull().unique(),
    status: qrStatus('status').notNull().default('active'),
    createdAt: createdAt(),
  },
  (table) => [index('cabinet_qrs_sku_id_idx').on(table.skuId)],
);

export const productQrs = pgTable(
  'product_qrs',
  {
    id: id('id').primaryKey(),
    code: varchar('code', { length: 256 }).notNull().unique(),
    skuId: id('sku_id')
      .notNull()
      .references(() => productSkus.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    status: qrStatus('status').notNull().default('active'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('product_qrs_sku_id_unique').on(table.skuId),
  ],
);

export const cabinets = pgTable(
  'cabinets',
  {
    id: id('id').primaryKey(),
    skuId: id('sku_id')
      .notNull()
      .references(() => productSkus.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    deviceUuid: varchar('device_uuid', { length: 36 }).notNull().unique(),
    name: varchar('name', { length: 128 }).notNull(),
    location: varchar('location', { length: 256 }).notNull().default(''),
    timeZone: varchar('time_zone', { length: 64 }).notNull().default('UTC'),
    status: cabinetStatus('status').notNull().default('offline'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    createdAt: createdAt(),
    version: integer('version').notNull().default(0),
  },
  (table) => [
    index('cabinets_sku_id_idx').on(table.skuId),
    check('cabinets_version_nonnegative', sql`${table.version} >= 0`),
  ],
);

export const cabinetMemberships = pgTable(
  'cabinet_memberships',
  {
    id: id('id').primaryKey(),
    cabinetId: id('cabinet_id')
      .notNull()
      .references(() => cabinets.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    role: membershipRole('role').notNull().default('admin'),
    active: boolean('active').notNull().default(true),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('cabinet_memberships_cabinet_user_unique').on(table.cabinetId, table.userId),
    uniqueIndex('cabinet_memberships_active_super_admin_unique')
      .on(table.cabinetId)
      .where(sql`${table.active} = true AND ${table.role} = 'super_admin'`),
    index('cabinet_memberships_user_active_idx').on(table.userId, table.active),
  ],
);

export const cabinetJoinInvitations = pgTable(
  'cabinet_join_invitations',
  {
    id: id('id').primaryKey(),
    cabinetId: id('cabinet_id')
      .notNull()
      .references(() => cabinets.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    createdBy: id('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    usedBy: id('used_by').references(() => users.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('cabinet_join_invitations_cabinet_created_idx').on(table.cabinetId, table.createdAt),
    index('cabinet_join_invitations_expires_at_idx').on(table.expiresAt),
  ],
);

export const keySlots = pgTable(
  'key_slots',
  {
    id: id('id').primaryKey(),
    cabinetId: id('cabinet_id')
      .notNull()
      .references(() => cabinets.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    position: integer('position').notNull(),
  },
  (table) => [
    uniqueIndex('key_slots_cabinet_position_unique').on(table.cabinetId, table.position),
    index('key_slots_cabinet_id_idx').on(table.cabinetId),
    check('key_slots_position_positive', sql`${table.position} > 0`),
  ],
);

export const keys = pgTable(
  'keys',
  {
    id: id('id').primaryKey(),
    cabinetId: id('cabinet_id')
      .notNull()
      .references(() => cabinets.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    slotId: id('slot_id')
      .notNull()
      .references(() => keySlots.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    note: text('note').notNull().default(''),
    status: keyStatus('status').notNull().default('available'),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('keys_slot_id_unique').on(table.slotId),
    index('keys_cabinet_status_idx').on(table.cabinetId, table.status),
  ],
);

export const loans = pgTable(
  'loans',
  {
    id: id('id').primaryKey(),
    cabinetId: id('cabinet_id')
      .notNull()
      .references(() => cabinets.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    keyId: id('key_id').notNull(),
    borrowerName: varchar('borrower_name', { length: 128 }).notNull(),
    borrowerContact: varchar('borrower_contact', { length: 320 }),
    checkedOutAt: timestamp('checked_out_at', { withTimezone: true, mode: 'string' }).notNull(),
    expectedReturnAt: timestamp('expected_return_at', { withTimezone: true, mode: 'string' }),
    returnedAt: timestamp('returned_at', { withTimezone: true, mode: 'string' }),
    status: loanStatus('status').notNull().default('active'),
    operatorId: id('operator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    returnOperatorId: id('return_operator_id').references(() => users.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    checkoutEventId: id('checkout_event_id').notNull(),
    returnEventId: id('return_event_id'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('loans_one_active_per_key_unique')
      .on(table.keyId)
      .where(sql`${table.status} = 'active'`),
    index('loans_cabinet_checked_out_idx').on(table.cabinetId, table.checkedOutAt),
    check(
      'loans_expected_return_after_checkout',
      sql`${table.expectedReturnAt} IS NULL OR ${table.expectedReturnAt} > ${table.checkedOutAt}`,
    ),
  ],
);

export const cabinetEvents = pgTable(
  'cabinet_events',
  {
    id: id('id').primaryKey(),
    cabinetId: id('cabinet_id')
      .notNull()
      .references(() => cabinets.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    keyId: id('key_id'),
    actorId: id('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    type: cabinetEventType('type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    reversible: boolean('reversible').notNull().default(false),
    relatedLoanId: id('related_loan_id'),
    summaryData: jsonb('summary_data')
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
  },
  (table) => [
    index('cabinet_events_cabinet_occurred_idx').on(table.cabinetId, table.occurredAt),
    index('cabinet_events_key_occurred_idx').on(table.keyId, table.occurredAt),
  ],
);

export const consents = pgTable(
  'consents',
  {
    id: id('id').primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    kind: consentKind('kind').notNull(),
    granted: boolean('granted').notNull(),
    policyVersion: varchar('policy_version', { length: 64 }).notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('consents_user_kind_policy_unique').on(table.userId, table.kind, table.policyVersion),
  ],
);

export const feedbackRecords = pgTable(
  'feedback_records',
  {
    id: id('id').primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    userDisplayName: varchar('user_display_name', { length: 128 }).notNull(),
    userEmail: varchar('user_email', { length: 320 }).notNull(),
    salutation: varchar('salutation', { length: 128 }).notNull().default(''),
    type: varchar('type', { length: 32 }).notNull(),
    title: varchar('title', { length: 200 }).notNull().default(''),
    content: text('content').notNull(),
    imageCount: integer('image_count').notNull().default(0),
    status: feedbackDeliveryStatus('status').notNull().default('sending'),
    failureCode: varchar('failure_code', { length: 128 }),
    submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'string' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('feedback_records_user_submitted_idx').on(table.userId, table.submittedAt),
    index('feedback_records_status_submitted_idx').on(table.status, table.submittedAt),
    check(
      'feedback_records_image_count_range',
      sql`${table.imageCount} >= 0 AND ${table.imageCount} <= 5`,
    ),
    check(
      'feedback_records_type_valid',
      sql`${table.type} IN ('product', 'application')`,
    ),
  ],
);

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    actorId: id('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    operation: varchar('operation', { length: 128 }).notNull(),
    requestId: varchar('request_id', { length: 128 }).notNull(),
    statusCode: integer('status_code').notNull(),
    responseBody: jsonb('response_body').$type<unknown>(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.actorId, table.operation, table.requestId] }),
    index('idempotency_expires_at_idx').on(table.expiresAt),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id('id').primaryKey(),
    actorId: id('actor_id').references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    action: varchar('action', { length: 128 }).notNull(),
    targetType: varchar('target_type', { length: 64 }).notNull(),
    targetId: varchar('target_id', { length: 128 }).notNull(),
    result: auditResult('result').notNull(),
    reasonCode: varchar('reason_code', { length: 128 }),
    metadata: jsonb('metadata')
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_logs_actor_created_idx').on(table.actorId, table.createdAt),
    index('audit_logs_target_created_idx').on(table.targetType, table.targetId, table.createdAt),
  ],
);
