export type AppIconName =
  | 'home'
  | 'cabinet'
  | 'cabinetGrid'
  | 'scan'
  | 'photo'
  | 'activity'
  | 'history'
  | 'team'
  | 'person'
  | 'accountCircle'
  | 'key'
  | 'error'
  | 'arrowForward'
  | 'return'
  | 'authorize'
  | 'audit'
  | 'notification'
  | 'manual'
  | 'guide'
  | 'support'
  | 'send'
  | 'shield'
  | 'chevronRight'
  | 'search'
  | 'download'
  | 'calendar'
  | 'chevronDown'
  | 'location'
  | 'back'
  | 'more'
  | 'filter'
  | 'checkOut'
  | 'settings'
  | 'trash'
  | 'empty'
  | 'check'
  | 'expand';

export type AppIconTone = 'foreground' | 'content' | 'muted' | 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'onBrand';

export type AppIconProps = {
  name: AppIconName;
  size?: number;
  tone?: AppIconTone;
  color?: string;
};
