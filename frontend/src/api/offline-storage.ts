import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cabinetEventSchema,
  cabinetMembershipSchema,
  cabinetSchema,
  currentUserAccountSchema,
  addKeyRequestSchema,
  feedbackThreadSummarySchema,
  keySchema,
  keySlotSchema,
  loanSchema,
  productQrSchema,
  productSkuSchema,
  userAccountSchema,
  checkoutKeyRequestSchema,
  renameCabinetRequestSchema,
  returnKeyRequestSchema,
  updateKeyRequestSchema,
  writeOptionsSchema,
  type CheckoutKeyRequest,
  type AddKeyRequest,
  type FeedbackThreadSummary,
  type ReturnKeyRequest,
  type UpdateKeyRequest,
  type WriteOptions,
} from '@uniclife/shared';
import { z } from 'zod';

import type { AppState } from '@/app-state/types';

export type RenameCabinetRequest = { name: string } & WriteOptions;
type OfflineAddKeyRequest = Omit<AddKeyRequest, 'note'> & { note?: string };

export type OfflineWorkspaceSnapshot = Pick<
  AppState,
  | 'currentUserId'
  | 'currentUser'
  | 'users'
  | 'skus'
  | 'qrs'
  | 'cabinets'
  | 'memberships'
  | 'slots'
  | 'keys'
  | 'loans'
  | 'events'
  | 'feedbackThreads'
> & {
  syncedAt: string;
};

export type OfflineOperationStatus = 'pending' | 'conflict';

export type OfflineOperation = {
  id: string;
  actorUserId: string;
  cabinetId: string;
  createdAt: string;
  baseCabinetVersion: number;
  status: OfflineOperationStatus;
  conflictCode?: string;
} & (
  | { type: 'checkout'; keyId: string; input: CheckoutKeyRequest }
  | { type: 'return'; keyId: string; input: ReturnKeyRequest }
  | { type: 'update_key'; keyId: string; input: UpdateKeyRequest }
  | { type: 'add_key'; input: OfflineAddKeyRequest }
  | { type: 'delete_key'; keyId: string; input: WriteOptions }
  | { type: 'rename_cabinet'; input: RenameCabinetRequest }
  | { type: 'delete_cabinet_keys'; input: WriteOptions }
  | { type: 'delete_cabinet'; input: WriteOptions }
);

const isoDate = z.string().datetime({ offset: true });
const snapshotSchema = z.object({
  currentUserId: z.string().nullable(),
  currentUser: currentUserAccountSchema.nullable(),
  users: z.array(userAccountSchema),
  skus: z.array(productSkuSchema),
  qrs: z.array(productQrSchema),
  cabinets: z.array(cabinetSchema),
  memberships: z.array(cabinetMembershipSchema),
  slots: z.array(keySlotSchema),
  keys: z.array(keySchema),
  loans: z.array(loanSchema),
  events: z.array(cabinetEventSchema),
  feedbackThreads: z.array(feedbackThreadSummarySchema),
  syncedAt: isoDate,
});

const operationBaseSchema = z.object({
  id: z.string().min(8).max(160),
  actorUserId: z.string().min(1).max(128),
  cabinetId: z.string().min(1).max(128),
  createdAt: isoDate,
  baseCabinetVersion: z.number().int().nonnegative(),
  status: z.enum(['pending', 'conflict']),
  conflictCode: z.string().min(1).max(128).optional(),
});

const operationSchema = z.discriminatedUnion('type', [
  operationBaseSchema.extend({
    type: z.literal('checkout'),
    keyId: z.string().min(1).max(128),
    input: checkoutKeyRequestSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('return'),
    keyId: z.string().min(1).max(128),
    input: returnKeyRequestSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('update_key'),
    keyId: z.string().min(1).max(128),
    input: updateKeyRequestSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('add_key'),
    input: addKeyRequestSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('delete_key'),
    keyId: z.string().min(1).max(128),
    input: writeOptionsSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('rename_cabinet'),
    input: renameCabinetRequestSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('delete_cabinet_keys'),
    input: writeOptionsSchema,
  }),
  operationBaseSchema.extend({
    type: z.literal('delete_cabinet'),
    input: writeOptionsSchema,
  }),
]);

const operationsSchema = z.array(operationSchema);

function accountKey(prefix: string, userId: string): string {
  return `uniclife.${prefix}.v1.${encodeURIComponent(userId)}`;
}

export async function loadOfflineMode(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(accountKey('offline-mode', userId))) === 'true';
}

export async function saveOfflineMode(userId: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(accountKey('offline-mode', userId), String(enabled));
}

function parseJson<T>(raw: string | null, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function loadOfflineWorkspaceSnapshot(
  userId: string,
): Promise<OfflineWorkspaceSnapshot | null> {
  const raw = await AsyncStorage.getItem(accountKey('offline-workspace', userId));
  return parseJson(raw, snapshotSchema);
}

export async function loadOfflineServerWorkspaceSnapshot(
  userId: string,
): Promise<OfflineWorkspaceSnapshot | null> {
  const raw = await AsyncStorage.getItem(accountKey('offline-server-workspace', userId));
  return parseJson(raw, snapshotSchema);
}

export async function saveOfflineWorkspaceSnapshot(
  userId: string,
  snapshot: OfflineWorkspaceSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(
    accountKey('offline-workspace', userId),
    JSON.stringify(snapshot),
  );
}

export async function saveOfflineServerWorkspaceSnapshot(
  userId: string,
  snapshot: OfflineWorkspaceSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(
    accountKey('offline-server-workspace', userId),
    JSON.stringify(snapshot),
  );
}

export async function clearOfflineWorkspace(userId: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(accountKey('offline-workspace', userId)),
    AsyncStorage.removeItem(accountKey('offline-server-workspace', userId)),
    AsyncStorage.removeItem(accountKey('offline-outbox', userId)),
    AsyncStorage.removeItem(accountKey('offline-mode', userId)),
  ]);
}

export async function loadOfflineOutbox(userId: string): Promise<OfflineOperation[]> {
  const raw = await AsyncStorage.getItem(accountKey('offline-outbox', userId));
  return parseJson(raw, operationsSchema) ?? [];
}

export async function saveOfflineOutbox(
  userId: string,
  operations: OfflineOperation[],
): Promise<void> {
  await AsyncStorage.setItem(
    accountKey('offline-outbox', userId),
    JSON.stringify(operations),
  );
}

export function snapshotFromState(state: AppState, syncedAt = state.now): OfflineWorkspaceSnapshot {
  return {
    currentUserId: state.currentUserId,
    currentUser: state.currentUser,
    users: state.users,
    skus: state.skus,
    qrs: state.qrs,
    cabinets: state.cabinets,
    memberships: state.memberships,
    slots: state.slots,
    keys: state.keys,
    loans: state.loans,
    events: state.events,
    feedbackThreads: state.feedbackThreads,
    syncedAt,
  };
}

export function stateFromOfflineSnapshot(
  state: AppState,
  snapshot: OfflineWorkspaceSnapshot,
): AppState {
  return {
    ...state,
    currentUserId: snapshot.currentUserId,
    currentUser: snapshot.currentUser,
    users: snapshot.users,
    skus: snapshot.skus,
    qrs: snapshot.qrs,
    cabinets: snapshot.cabinets,
    memberships: snapshot.memberships,
    slots: snapshot.slots,
    keys: snapshot.keys,
    loans: snapshot.loans,
    events: snapshot.events,
    feedbackThreads: snapshot.feedbackThreads,
    now: snapshot.syncedAt,
  };
}

export type { FeedbackThreadSummary };
