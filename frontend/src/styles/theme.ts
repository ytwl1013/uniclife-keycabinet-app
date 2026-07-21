import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { vars } from 'nativewind';
import { useColorScheme } from 'react-native';

import tokens from '../../design-tokens.json';

export type ThemeMode = 'light' | 'dark';
export type ThemePalette = { [K in keyof typeof tokens.colors.light]: string };

const colorVariableNames: Record<keyof ThemePalette, string> = {
  background: '--color-background',
  surface: '--color-surface',
  foreground: '--color-foreground',
  content: '--color-content',
  muted: '--color-muted',
  line: '--color-line',
  brand: '--color-brand',
  brandSoft: '--color-brand-soft',
  success: '--color-success',
  successSoft: '--color-success-soft',
  warning: '--color-warning',
  warningSoft: '--color-warning-soft',
  danger: '--color-danger',
  dangerSoft: '--color-danger-soft',
  accent: '--color-accent',
  accentSoft: '--color-accent-soft',
  onBrand: '--color-on-brand',
};

function hexToRgbChannels(hex: string) {
  const value = hex.replace('#', '');
  return `${Number.parseInt(value.slice(0, 2), 16)} ${Number.parseInt(value.slice(2, 4), 16)} ${Number.parseInt(value.slice(4, 6), 16)}`;
}

function createThemeVariables(palette: ThemePalette) {
  return vars(
    Object.fromEntries(
      Object.entries(colorVariableNames).map(([name, variable]) => [variable, hexToRgbChannels(palette[name as keyof ThemePalette])]),
    ),
  );
}

export const themeVariables = {
  light: createThemeVariables(tokens.colors.light),
  dark: createThemeVariables(tokens.colors.dark),
};

export const navigationMetrics = tokens.navigation;

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
    variables: themeVariables[mode],
    navigationTheme: getNavigationTheme(mode),
  };
}
