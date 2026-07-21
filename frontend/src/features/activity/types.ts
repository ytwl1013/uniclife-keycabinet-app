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
