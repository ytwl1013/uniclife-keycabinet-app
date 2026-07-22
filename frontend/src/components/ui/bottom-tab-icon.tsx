import { Platform, StyleSheet, View } from 'react-native';

import { navigationMetrics, useAppTheme } from '@/styles/theme';

import { AppIcon, AppIconName } from './app-icon';

type BottomTabIconProps = {
  focused: boolean;
  name: AppIconName;
  primary?: boolean;
};

export const bottomTabIconTestIds = {
  regular: 'bottom-tab-icon',
  primaryHalo: 'bottom-tab-primary-halo',
  primaryCore: 'bottom-tab-primary-core',
} as const;

export function BottomTabIcon({ focused, name, primary = false }: BottomTabIconProps) {
  const { palette } = useAppTheme();

  if (primary) {
    return (
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.primaryHalo,
          { backgroundColor: focused ? palette.brandSoft : 'transparent' },
        ]}
        testID={bottomTabIconTestIds.primaryHalo}>
        <View
          style={[styles.primaryCore, { backgroundColor: palette.brand }]}
          testID={bottomTabIconTestIds.primaryCore}>
          <AppIcon color={palette.onBrand} name={name} size={navigationMetrics.scanIconSize} />
        </View>
      </View>
    );
  }

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.regular,
        { backgroundColor: focused ? palette.brandSoft : 'transparent' },
      ]}
      testID={bottomTabIconTestIds.regular}>
      <AppIcon
        color={focused ? palette.brand : palette.muted}
        name={name}
        size={navigationMetrics.tabIconSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  regular: {
    alignItems: 'center',
    borderRadius: 16,
    height: navigationMetrics.tabIconFrameHeight,
    justifyContent: 'center',
    pointerEvents: 'none',
    width: navigationMetrics.tabIconFrameWidth,
  },
  primaryHalo: {
    alignItems: 'center',
    borderRadius: navigationMetrics.scanHaloSize / 2,
    height: navigationMetrics.scanHaloSize,
    justifyContent: 'center',
    marginTop: -10,
    pointerEvents: 'none',
    width: navigationMetrics.scanHaloSize,
  },
  primaryCore: {
    alignItems: 'center',
    borderRadius: navigationMetrics.scanButtonSize / 2,
    height: navigationMetrics.scanButtonSize,
    justifyContent: 'center',
    width: navigationMetrics.scanButtonSize,
    ...Platform.select({
      default: {
        elevation: 5,
        shadowColor: '#0C1533',
        shadowOffset: { height: 4, width: 0 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(12, 21, 51, 0.16)',
      },
    }),
  },
});
