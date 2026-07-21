import { useMemo } from 'react';

import { TranslationKey, useTranslation } from '@/i18n';
import { useMockApp } from '@/mocks';
import { loadPdfFontBytes, saveExportArtifact } from '@/mocks/exports';

import {
  CabinetEventKind,
  CabinetRole,
  CabinetStatus,
  CabinetView,
  EventView,
  ExportArtifactView,
  ExportFormat,
  KeyStatus,
  KeyView,
  LoanView,
  MemberView,
  PrototypeActions,
  PrototypeApp,
  SlotView,
} from './types';

type UnknownRecord = Record<string, unknown>;
type UnknownFunction = (...args: never[]) => unknown;

type MockSource = {
  state: UnknownRecord;
  currentUser: UnknownRecord | null;
  actions: Record<string, UnknownFunction>;
  selectors: Record<string, UnknownFunction>;
};

const trKey = (key: string) => key as TranslationKey;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

function array(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function callSelector(source: MockSource, name: string, ...args: unknown[]): unknown {
  const fn = source.selectors[name];
  return typeof fn === 'function' ? fn(...args as never[]) : undefined;
}

async function callAction(source: MockSource, names: string[], input: UnknownRecord): Promise<unknown> {
  const name = names.find((candidate) => typeof source.actions[candidate] === 'function');
  if (!name) {
    throw new Error(`Missing mock action: ${names[0]}`);
  }
  return Promise.resolve(source.actions[name](input as never));
}

function role(value: unknown): CabinetRole {
  return value === 'owner' || value === 'admin' ? value : 'member';
}

function cabinetStatus(value: unknown): CabinetStatus {
  return value === 'offline' || value === 'maintenance' ? value : 'online';
}

function normalizeEventKind(value: unknown): CabinetEventKind {
  const normalized = text(value).replaceAll('-', '_').toLowerCase();
  if (normalized.includes('undo') || normalized.includes('revert')) return 'undo';
  if (normalized.includes('checkout') || normalized.includes('check_out') || normalized.includes('borrow')) return 'checkOut';
  if (normalized.includes('return') && !normalized.includes('restore')) return 'return';
  if (normalized.includes('key_added') || normalized.includes('add_key')) return 'keyAdded';
  if (normalized.includes('key_updated') || normalized.includes('update_key') || normalized.includes('note')) return 'keyUpdated';
  if (normalized.includes('member_added') || normalized.includes('bind')) return 'memberAdded';
  if (normalized.includes('member_removed') || normalized.includes('unbind')) return 'memberRemoved';
  if (normalized.includes('role') || normalized.includes('admin_grant') || normalized.includes('admin_revoke')) return 'roleChanged';
  if (normalized.includes('clear')) return 'keysCleared';
  if (normalized.includes('restore')) return 'keysRestored';
  return 'admin';
}

function idempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function usePrototypeApp(): PrototypeApp {
  const source = useMockApp() as unknown as MockSource;
  const { t } = useTranslation();

  return useMemo(() => {
    const state = source.state;
    const users = array(state.users);
    const skus = array(state.skus);
    const rawMemberships = array(state.memberships).filter((membership) => membership.active !== false && !text(membership.removedAt));
    const rawSlots = array(state.slots);
    const rawKeys = array(state.keys);
    const rawLoans = array(state.loans);
    const rawEvents = array(state.events);
    const rawClearBatches = array(state.clearBatches);
    const currentUserId =
      state.sessionStatus === 'authenticated'
        ? text(source.currentUser?.id, text(state.currentUserId))
        : '';
    const now = new Date(text(state.now, new Date().toISOString()));

    const userById = new Map(users.map((user) => [text(user.id), user]));
    const skuById = new Map(skus.map((sku) => [text(sku.id), sku]));
    const keyById = new Map(rawKeys.map((key) => [text(key.id), key]));

    const selectedCabinets = array(callSelector(source, 'cabinetsForCurrentUser'));
    const rawCabinets = selectedCabinets.length ? selectedCabinets : array(state.cabinets).filter((cabinet) => {
      const cabinetId = text(cabinet.id);
      return rawMemberships.some((membership) => text(membership.cabinetId) === cabinetId && text(membership.userId) === currentUserId);
    });
    const visibleCabinetIds = new Set(rawCabinets.map((cabinet) => text(cabinet.id)));

    const loanViews: LoanView[] = rawLoans.filter((loan) => visibleCabinetIds.has(text(loan.cabinetId))).map((loan) => ({
      id: text(loan.id),
      cabinetId: text(loan.cabinetId),
      keyId: text(loan.keyId),
      borrowerName: text(loan.borrowerName),
      borrowerContact: text(loan.borrowerContact) || undefined,
      checkedOutAt: text(loan.checkedOutAt),
      expectedReturnAt: text(loan.expectedReturnAt),
      returnedAt: text(loan.returnedAt) || undefined,
      operatorUserId: text(loan.operatorId, text(loan.operatorUserId)),
    }));

    const activeLoanByKey = new Map(
      rawLoans
        .filter((loan) => text(loan.status) === 'active' && !text(loan.returnedAt))
        .map((loan) => [text(loan.keyId), loanViews.find((view) => view.id === text(loan.id))!]),
    );

    const keyViews: KeyView[] = rawKeys
      .filter((key) => visibleCabinetIds.has(text(key.cabinetId)) && !text(key.deletedAt))
      .map((key) => {
        const activeLoan = activeLoanByKey.get(text(key.id));
        const dueAt = activeLoan?.expectedReturnAt ? new Date(activeLoan.expectedReturnAt) : undefined;
        const status: Exclude<KeyStatus, 'empty'> = activeLoan
          ? dueAt && dueAt.getTime() < now.getTime() ? 'overdue' : 'checkedOut'
          : 'available';
        const slot = rawSlots.find((candidate) => text(candidate.id) === text(key.slotId));
        return {
          id: text(key.id),
          cabinetId: text(key.cabinetId),
          slotId: text(key.slotId),
          slotNumber: number(slot?.position, number(slot?.number)),
          name: text(key.name),
          note: text(key.note),
          status,
          activeLoan,
        };
      });

    const keyViewById = new Map(keyViews.map((key) => [key.id, key]));
    const slotViews: SlotView[] = rawSlots.filter((slot) => visibleCabinetIds.has(text(slot.cabinetId))).map((slot) => {
      const rawKey = keyById.get(text(slot.keyId));
      const key = rawKey && !text(rawKey.deletedAt) ? keyViewById.get(text(rawKey.id)) : undefined;
      return {
        id: text(slot.id),
        cabinetId: text(slot.cabinetId),
        number: number(slot.position, number(slot.number)),
        keyId: key?.id,
        keyName: key?.name,
        status: key?.status ?? 'empty',
        holder: key?.activeLoan?.borrowerName,
      };
    });

    const members: MemberView[] = rawMemberships.filter((membership) => visibleCabinetIds.has(text(membership.cabinetId))).map((membership) => {
      const user = userById.get(text(membership.userId)) ?? {};
      return {
        id: text(membership.id),
        cabinetId: text(membership.cabinetId),
        userId: text(membership.userId),
        name: text(user.name, text(user.displayName, text(user.email))),
        email: text(user.email),
        role: role(membership.role),
        boundAt: text(membership.joinedAt, text(membership.boundAt, text(membership.createdAt))),
      };
    });

    const cabinets: CabinetView[] = rawCabinets.map((cabinet) => {
      const cabinetId = text(cabinet.id);
      const selectedSku = record(callSelector(source, 'skuById', text(cabinet.skuId)));
      const sku = Object.keys(selectedSku).length ? selectedSku : skuById.get(text(cabinet.skuId)) ?? {};
      const membership = record(callSelector(source, 'membershipForCurrentUser', cabinetId));
      const fallbackMembership = rawMemberships.find((candidate) => text(candidate.cabinetId) === cabinetId && text(candidate.userId) === currentUserId);
      const cabinetKeys = keyViews.filter((key) => key.cabinetId === cabinetId);
      const cabinetSlots = slotViews.filter((slot) => slot.cabinetId === cabinetId);
      const clearBatch = rawClearBatches
        .filter((batch) => text(batch.cabinetId) === cabinetId)
        .sort((a, b) => text(b.clearedAt, text(b.createdAt)).localeCompare(text(a.clearedAt, text(a.createdAt))))[0];
      const recoverableUntil = text(clearBatch?.recoverableUntil, text(clearBatch?.restoreUntil));
      return {
        id: cabinetId,
        name: text(cabinet.name),
        location: text(cabinet.location),
        timezone: text(cabinet.timeZone, 'UTC'),
        status: cabinetStatus(cabinet.status),
        lastSyncedAt: text(cabinet.lastSyncedAt),
        skuId: text(cabinet.skuId),
        skuCode: text(sku.sku, text(sku.code, text(sku.id))),
        model: text(sku.model, text(sku.name)),
        color: text(sku.color, text(sku.colorName)),
        capacity: number(sku.capacity, number(sku.slotCount, cabinetSlots.length)),
        manualUrl: text(sku.manualUrl) || undefined,
        imageUri: text(sku.imageAsset, text(sku.imageUri, text(sku.imageUrl))) || undefined,
        role: role(membership.role ?? fallbackMembership?.role),
        availableCount: cabinetKeys.filter((key) => key.status === 'available').length,
        checkedOutCount: cabinetKeys.filter((key) => key.status === 'checkedOut').length,
        overdueCount: cabinetKeys.filter((key) => key.status === 'overdue').length,
        clearRestoreUntil: clearBatch?.status === 'restorable' && recoverableUntil && new Date(recoverableUntil).getTime() > now.getTime() ? recoverableUntil : undefined,
      };
    });

    const events: EventView[] = rawEvents
      .filter((event) => visibleCabinetIds.has(text(event.cabinetId)))
      .map((event) => {
        const kind = normalizeEventKind(event.type);
        const key = keyViewById.get(text(event.keyId));
        const actor = userById.get(text(event.actorId)) ?? {};
        const summary = record(event.summaryData);
        const keyName = text(summary.keyName, key?.name ?? t(trKey('key.unknown')));
        const actorName = text(actor.name, text(actor.displayName, text(actor.email, t(trKey('activity.systemActor')))));
        const targetName = text(summary.memberName, text(summary.targetName));
        let detail: string | undefined;
        if (text(summary.borrowerName)) {
          detail = t(trKey('loan.borrowerDetail'), { borrower: text(summary.borrowerName) });
        } else if (targetName) {
          detail = t(trKey('activity.memberDetail'), { member: targetName });
        }
        return {
          id: text(event.id),
          cabinetId: text(event.cabinetId),
          keyId: text(event.keyId) || undefined,
          keyName,
          actorUserId: text(event.actorId),
          actorName,
          kind,
          createdAt: text(event.occurredAt, text(event.createdAt)),
          title: t(trKey(`activity.event.${kind}`), { key: keyName, actor: actorName }),
          detail,
          borrowerContact: text(summary.borrowerContact) || undefined,
          reversible: Boolean(callSelector(source, 'canUndoEvent', text(event.id))),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const currentVersion = number(state.version);
    const writeOptions = (prefix: string, cabinetId: string) => ({
      requestId: idempotencyKey(`${prefix}:${cabinetId}`),
      expectedVersion: currentVersion,
    });

    const actions: PrototypeActions = {
      addKey: async (input) => {
        await callAction(source, ['addKey'], { ...input, ...writeOptions('add-key', input.cabinetId) });
      },
      updateKey: async (input) => {
        const cabinetId = keyViewById.get(input.keyId)?.cabinetId ?? '';
        await callAction(source, ['updateKey'], { ...input, ...writeOptions('update-key', cabinetId) });
      },
      checkoutKey: async (input) => {
        const { cabinetId, ...command } = input;
        await callAction(source, ['checkOutKey', 'checkoutKey'], { ...command, ...writeOptions('check-out', cabinetId) });
      },
      returnKey: async (input) => {
        const { cabinetId, ...command } = input;
        await callAction(source, ['returnKey'], { ...command, ...writeOptions('return-key', cabinetId) });
      },
      undoEvent: async (input) => {
        const cabinetId = events.find((event) => event.id === input.eventId)?.cabinetId ?? '';
        await callAction(source, ['undoEvent'], { ...input, ...writeOptions('undo-event', cabinetId) });
      },
      setMemberRole: async (input) => {
        await callAction(source, ['setMemberRole'], { ...input, ...writeOptions('set-role', input.cabinetId) });
      },
      removeMember: async (input) => {
        await callAction(source, ['removeMember'], { ...input, ...writeOptions('remove-member', input.cabinetId) });
      },
      clearKeys: async (input) => {
        await callAction(source, ['clearCabinetKeys', 'clearKeys'], { ...input, ...writeOptions('clear-keys', input.cabinetId) });
      },
      restoreLastClear: async (input) => {
        const batch = rawClearBatches
          .filter((candidate) => text(candidate.cabinetId) === input.cabinetId)
          .sort((a, b) => text(b.clearedAt, text(b.createdAt)).localeCompare(text(a.clearedAt, text(a.createdAt))))[0];
        await callAction(source, ['restoreClearBatch', 'restoreCabinetKeys'], {
          ...input,
          batchId: text(batch?.id),
          ...writeOptions('restore-keys', input.cabinetId),
        });
      },
      exportLog: async (input) => {
        const fontBytes = input.format === 'pdf' ? await loadPdfFontBytes() : undefined;
        const artifact = await callAction(source, ['exportCabinetLog'], {
          ...input,
          fontBytes,
        } as unknown as UnknownRecord) as ExportArtifactView;
        await saveExportArtifact(artifact);
        return artifact;
      },
    };

    return {
      cabinets,
      members,
      slots: slotViews,
      keys: keyViews,
      loans: loanViews,
      events,
      currentUserId,
      now: now.toISOString(),
      isOffline: state.online === false,
      isLoading: state.hydrated === false,
      sessionExpired: state.sessionStatus === 'expired',
      ...actions,
    };
  }, [source, t]);
}

export function maskContact(value?: string) {
  if (!value) return '';
  const at = value.indexOf('@');
  if (at > 1) return `${value.slice(0, 2)}•••${value.slice(at)}`;
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 7) return `${value.slice(0, 3)}••••${value.slice(-2)}`;
  return '••••••';
}

export function isExportFormat(value: string): value is ExportFormat {
  return value === 'csv' || value === 'xlsx' || value === 'pdf';
}
