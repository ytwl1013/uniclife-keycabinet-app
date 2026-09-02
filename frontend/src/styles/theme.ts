import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

import tokens from '../../design-tokens.json';

export type ThemeMode = 'light' | 'dark';
export type ThemePalette = { [K in keyof typeof tokens.colors.light]: string };

export const bottomSheetMetrics = tokens.bottomSheet;
export const navigationMetrics = tokens.navigation;

export function getFixedBottomSheetHeight(viewportHeight: number): number {
  return Math.min(
    bottomSheetMetrics.fixedHeight,
    viewportHeight * bottomSheetMetrics.maxHeightRatio,
  );
}

export function getNavigationTheme(mode: ThemeMode): Theme {
  const palette = tokens.colors[mode];
  const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: palette.brand,
      background: palette.background,
      card: palette.surface,
      text: palette.foreground,
      border: palette.line,
      notification: palette.danger,
    },
  };
}

export function useAppTheme() {
  const mode: ThemeMode = useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    mode,
    palette: tokens.colors[mode] as ThemePalette,
    navigationTheme: getNavigationTheme(mode),
  };
}
