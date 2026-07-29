import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { AppIconName } from '@/components/ui/app-icon';
import { BottomTabIcon } from '@/components/ui/bottom-tab-icon';
import { TranslationKey, useTranslation } from '@/i18n';
import { useMockApp } from '@/mocks';
import { navigationMetrics, useAppTheme } from '@/styles/theme';

const tabRoutes = [
  { id: 'home', screen: 'index', titleKey: 'navigation.home', icon: 'home' },
  { id: 'cabinets', screen: 'cabinets', titleKey: 'navigation.cabinets', icon: 'cabinetGrid' },
  { id: 'scan', screen: 'scan', titleKey: 'navigation.scan', icon: 'scan' },
  { id: 'activity', screen: 'activity', titleKey: 'navigation.activity', icon: 'history' },
  { id: 'account', screen: 'account', titleKey: 'navigation.account', icon: 'accountCircle' },
] as const satisfies readonly {
  id: string;
  screen: string;
  titleKey: TranslationKey;
  icon: AppIconName;
}[];

export default function TabLayout() {
  const { t } = useTranslation();
  const { state } = useMockApp();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, navigationMetrics.tabBarPaddingBottom);
  const tabBarHeight = navigationMetrics.tabBarHeight
    + tabBarBottomPadding
    - navigationMetrics.tabBarPaddingBottom;

  if (state.hydrated && state.sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.muted,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          padding: navigationMetrics.iconpadding,
        },
        tabBarShowLabel: false,
        tabBarStyle: {
          alignSelf: 'center',
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          height: tabBarHeight,
          maxWidth: navigationMetrics.tabBarMaxWidth,
          paddingBottom: tabBarBottomPadding,
          width: '100%',
        },
      }}>
      {tabRoutes.map((route) => (
        <Tabs.Screen
          key={route.id}
          name={route.screen}
          options={{
            tabBarAccessibilityLabel: t(route.titleKey),
            tabBarButtonTestID: `bottom-tab-${route.id}`,
            title: t(route.titleKey),
            tabBarIcon: ({ focused }) => (
              <BottomTabIcon focused={focused} name={route.icon} primary={route.id === 'scan'} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
