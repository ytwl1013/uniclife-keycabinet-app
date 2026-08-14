import { SymbolView, SymbolViewProps } from 'expo-symbols';

import { useAppTheme } from '@/styles/theme';

import { AppIconName, AppIconProps } from './app-icon.types';

const symbolNames: Record<AppIconName, SymbolViewProps['name']> = {
  home: 'house.fill', cabinet: 'archivebox.fill', cabinetGrid: 'square.grid.2x2.fill', scan: 'qrcode.viewfinder', activity: 'clock.fill', history: 'clock.arrow.circlepath', team: 'person.3.fill', person: 'person.crop.circle.fill', accountCircle: 'person.crop.circle.fill', key: 'key.fill',
  error: 'exclamationmark.circle.fill', arrowForward: 'arrow.right', return: 'arrow.uturn.backward', authorize: 'person.badge.key.fill', audit: 'checkmark.shield.fill', notification: 'bell.fill', guide: 'questionmark.circle.fill', support: 'bubble.left.and.bubble.right.fill', send: 'paperplane.fill',
  shield: 'lock.shield.fill', chevronRight: 'chevron.right', search: 'magnifyingglass', download: 'square.and.arrow.down', calendar: 'calendar', chevronDown: 'chevron.down', location: 'location.fill',
  back: 'chevron.left', more: 'ellipsis', filter: 'line.3.horizontal.decrease', checkOut: 'rectangle.portrait.and.arrow.right', settings: 'gearshape.fill', empty: 'minus.circle', check: 'checkmark', expand: 'chevron.down',
};

export function AppIcon({ color, name, size = 24, tone = 'content' }: AppIconProps) {
  const { palette } = useAppTheme();

  return (
    <SymbolView
      name={symbolNames[name]}
      resizeMode="scaleAspectFit"
      style={{ height: size, width: size }}
      tintColor={color ?? palette[tone]}
      weight="semibold"
    />
  );
}

export type { AppIconName, AppIconProps, AppIconTone } from './app-icon.types';
