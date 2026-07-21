import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import '../../global.css';

import { I18nProvider, useTranslation } from '@/i18n';
import { MockAppProvider } from '@/mocks';
import { useAppTheme } from '@/styles/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

function AppNavigation() {
  const { t } = useTranslation();
  const { mode, navigationTheme, variables } = useAppTheme();

  return (
    <View className="flex-1 bg-background" style={variables}>
      <NavigationThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="cabinets" options={{ headerShown: false }} />
          <Stack.Screen name="account" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: t('navigation.actionModal') }}
          />
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </NavigationThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <MockAppProvider>
        <AppNavigation />
      </MockAppProvider>
    </I18nProvider>
  );
}
