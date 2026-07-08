export type ActivityKind = 'checkOut' | 'return' | 'overdue' | 'admin';

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  day: string;
  time: string;
  title: string;
  detail: string;
};
