export type AppIconName =
  | 'home'
  | 'cabinet'
  | 'scan'
  | 'activity'
  | 'team'
  | 'person'
  | 'key'
  | 'error'
  | 'arrowForward'
  | 'return'
  | 'authorize'
  | 'audit'
  | 'notification'
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
  | 'empty'
  | 'expand';

export type AppIconTone = 'foreground' | 'content' | 'muted' | 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'onBrand';

export type AppIconProps = {
  name: AppIconName;
  size?: number;
  tone?: AppIconTone;
  color?: string;
};
