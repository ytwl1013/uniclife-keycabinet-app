import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import '../../global.css';

import { I18nProvider, useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppNavigation() {
  const { t } = useTranslation();
  const { mode, navigationTheme, variables } = useAppTheme();

  return (
    <View className="flex-1 bg-background" style={variables}>
      <NavigationThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="cabinets/[cabinetId]" options={{ headerShown: false }} />
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
      <AppNavigation />
    </I18nProvider>
  );
}
