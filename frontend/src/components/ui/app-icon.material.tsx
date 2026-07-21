import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';

import { useAppTheme } from '@/styles/theme';

import { AppIconName, AppIconProps } from './app-icon.types';

const materialNames: Record<AppIconName, ComponentProps<typeof MaterialIcons>['name']> = {
  home: 'home', cabinet: 'kitchen', scan: 'qr-code-scanner', activity: 'schedule', team: 'groups', person: 'person', key: 'vpn-key', error: 'error-outline',
  arrowForward: 'arrow-forward', return: 'assignment-return', authorize: 'manage-accounts', audit: 'fact-check', notification: 'notifications-none', shield: 'shield', chevronRight: 'chevron-right',
  search: 'search', download: 'file-download', calendar: 'calendar-today', chevronDown: 'keyboard-arrow-down', location: 'location-on', back: 'arrow-back', more: 'more-horiz', filter: 'tune',
  checkOut: 'logout', settings: 'settings', empty: 'remove-circle-outline', expand: 'keyboard-arrow-down',
};

export function MaterialAppIcon({ color, name, size = 24, tone = 'content' }: AppIconProps) {
  const { palette } = useAppTheme();
  return <MaterialIcons color={color ?? palette[tone]} name={materialNames[name]} size={size} />;
}
