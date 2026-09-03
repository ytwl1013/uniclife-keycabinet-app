import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';

import { useAppTheme } from '@/styles/theme';

import { AppIconName, AppIconProps } from './app-icon.types';

const materialNames: Record<AppIconName, ComponentProps<typeof MaterialIcons>['name']> = {
  home: 'home-filled', cabinet: 'kitchen', cabinetGrid: 'grid-view', scan: 'qr-code-scanner', photo: 'photo-library', activity: 'schedule', history: 'history', team: 'groups', person: 'person', accountCircle: 'account-circle', key: 'vpn-key', error: 'error-outline',
  arrowForward: 'arrow-forward', return: 'assignment-return', authorize: 'manage-accounts', audit: 'fact-check', notification: 'notifications-none', manual: 'menu-book', guide: 'help-outline', support: 'chat-bubble-outline', send: 'send', shield: 'shield', chevronRight: 'chevron-right',
  search: 'search', download: 'file-download', calendar: 'calendar-today', chevronDown: 'keyboard-arrow-down', location: 'location-on', back: 'arrow-back', more: 'more-horiz', filter: 'tune',
  checkOut: 'logout', settings: 'settings', trash: 'delete-outline', empty: 'remove-circle-outline', check: 'check', expand: 'keyboard-arrow-down',
};

export function MaterialAppIcon({ color, name, size = 24, tone = 'content' }: AppIconProps) {
  const { palette } = useAppTheme();
  return <MaterialIcons color={color ?? palette[tone]} name={materialNames[name]} size={size} />;
}
