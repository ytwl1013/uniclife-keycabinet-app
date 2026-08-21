import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'disabled']);
export const cabinetStatus = pgEnum('cabinet_status', ['online', 'offline', 'maintenance']);
export const keyStatus = pgEnum('key_status', ['available', 'borrowed', 'lost', 'disabled']);
export const recordType = pgEnum('record_type', ['borrow', 'return', 'inventory', 'force_open', 'exception']);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    employeeNo: varchar('employee_no', { length: 64 }).notNull().unique(),
    status: userStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeNoIdx: index('users_employee_no_idx').on(table.employeeNo),
  }),
);

export const cabinets = pgTable('cabinets', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  location: varchar('location', { length: 256 }),
  status: cabinetStatus('status').notNull().default('offline'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

export const keys = pgTable(
  'keys',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 128 }).notNull(),
    cabinetCode: varchar('cabinet_code', { length: 64 }).notNull(),
    slotCode: varchar('slot_code', { length: 64 }).notNull(),
    status: keyStatus('status').notNull().default('available'),
  },
  (table) => ({
    cabinetSlotIdx: index('keys_cabinet_slot_idx').on(table.cabinetCode, table.slotCode),
  }),
);

export const records = pgTable('records', {
  id: serial('id').primaryKey(),
  type: recordType('type').notNull(),
  actorId: integer('actor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  keyCode: varchar('key_code', { length: 64 }),
  cabinetCode: varchar('cabinet_code', { length: 64 }),
  success: boolean('success').notNull(),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  action: varchar('action', { length: 128 }).notNull(),
  targetType: varchar('target_type', { length: 64 }).notNull(),
  targetId: varchar('target_id', { length: 128 }).notNull(),
  result: varchar('result', { length: 32 }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
