import { CabinetEventKind, CabinetRole, EventView } from '@/features/cabinet-prototype/types';

const NOTIFIABLE_EVENT_KINDS = new Set<CabinetEventKind>([
  'memberAdded',
  'memberRemoved',
  'roleChanged',
  'keysCleared',
]);

export function isNotifiableEvent(
  event: Pick<EventView, 'actorUserId' | 'initiatorUserId' | 'kind'>,
  context: { cabinetRole?: CabinetRole; currentUserId: string },
) {
  if (!NOTIFIABLE_EVENT_KINDS.has(event.kind)) return false;
  if (event.kind !== 'memberAdded') return true;
  return context.cabinetRole === 'superAdmin' &&
    event.actorUserId !== context.currentUserId &&
    event.initiatorUserId !== context.currentUserId;
}
