import { TranslationKey } from '@/i18n';

export type ActivityKind = 'checkOut' | 'return' | 'overdue' | 'admin';

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  dayKey: TranslationKey;
  time: string;
  titleKey: TranslationKey;
  detailKey: TranslationKey;
};

export type ActivityEventKind =
  | 'checkOut'
  | 'return'
  | 'keyAdded'
  | 'keyUpdated'
  | 'undo'
  | 'memberAdded'
  | 'memberRemoved'
  | 'roleChanged'
  | 'keysCleared'
  | 'keysRestored'
  | 'admin';

export type ActivityEvent = {
  id: string;
  cabinetId: string;
  keyId?: string;
  keyName?: string;
  actorUserId: string;
  actorName: string;
  kind: ActivityEventKind;
  createdAt: string;
  title: string;
  detail?: string;
  borrowerName?: string;
  borrowerContact?: string;
};
