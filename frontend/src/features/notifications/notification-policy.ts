import { CabinetEventKind, EventView } from '@/features/cabinet-prototype/types';

const NOTIFIABLE_EVENT_KINDS = new Set<CabinetEventKind>([
  'memberAdded',
  'memberRemoved',
  'roleChanged',
  'keysCleared',
]);

export function isNotifiableEvent(event: Pick<EventView, 'kind'>) {
  return NOTIFIABLE_EVENT_KINDS.has(event.kind);
}
