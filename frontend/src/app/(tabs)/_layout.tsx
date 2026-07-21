import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { TranslationKey, useTranslation } from '@/i18n';
import { useMockApp } from '@/mocks';
import { navigationMetrics, useAppTheme } from '@/styles/theme';

const tabRoutes = [
  { id: 'home', screen: 'index', titleKey: 'navigation.home', icon: 'home' },
  { id: 'cabinets', screen: 'cabinets', titleKey: 'navigation.cabinets', icon: 'cabinet' },
  { id: 'scan', screen: 'scan', titleKey: 'navigation.scan', icon: 'scan' },
  { id: 'activity', screen: 'activity', titleKey: 'navigation.activity', icon: 'activity' },
  { id: 'account', screen: 'account', titleKey: 'navigation.account', icon: 'person' },
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

  if (state.hydrated && state.sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          alignSelf: 'center',
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          height: navigationMetrics.tabBarHeight,
          maxWidth: navigationMetrics.tabBarMaxWidth,
          paddingBottom: navigationMetrics.tabBarPaddingBottom,
          paddingTop: navigationMetrics.tabBarPaddingTop,
          width: '100%',
        },
        tabBarLabelStyle: {
          fontSize: navigationMetrics.tabLabelSize,
          fontWeight: '700',
        },
      }}>
      {tabRoutes.map((route) => (
        <Tabs.Screen
          key={route.id}
          name={route.screen}
          options={{
            title: t(route.titleKey),
            tabBarIcon: ({ color, focused }) => {
              const isPrimaryAction = route.id === 'scan' && focused;

              return (
                <View className={isPrimaryAction ? 'rounded-pill bg-brand p-3' : ''}>
                  <AppIcon
                    color={isPrimaryAction ? palette.onBrand : color}
                    name={route.icon}
                    size={isPrimaryAction ? navigationMetrics.scanIconSize : navigationMetrics.tabIconSize}
                  />
                </View>
              );
            },
          }}
        />
      ))}
    </Tabs>
  );
}
