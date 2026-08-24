import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import '../../global.css';

import { AppUiProvider } from '@/components/ui/app-ui-provider';
import { AppProvider, useApp } from '@/app-state';
import { I18nProvider, useTranslation } from '@/i18n';
import { NotificationsProvider } from '@/features/notifications/notifications-provider';
import { useAppTheme } from '@/styles/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

function AppNavigation() {
  const { t } = useTranslation();
  const { state } = useApp();
  const { mode, navigationTheme, palette } = useAppTheme();
  const authenticated = state.sessionStatus === 'authenticated';

  return (
    <View
      className="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: palette.background }}>
      <NavigationThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false,headerShadowVisible: false }} />
          <Stack.Protected guard={!authenticated}>
            <Stack.Screen name="(auth)" options={{ headerShown: false,headerShadowVisible: false }} />
          </Stack.Protected>
          <Stack.Protected guard={authenticated}>
            <Stack.Screen name="onboarding" options={{ headerShown: false,headerShadowVisible: false }} />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, headerShown: false, headerShadowVisible: false }} />
            <Stack.Screen name="(details)" options={{ headerShown: false,headerShadowVisible: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: t('navigation.actionModal') }}
            />
          </Stack.Protected>
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </NavigationThemeProvider>
    </View>
  );
}

function AppNavigationGate() {
  const { t } = useTranslation();
  const { state } = useApp();
  const { palette } = useAppTheme();

  if (!state.hydrated) {
    return (
      <View
        style={[
          styles.loading,
          {
            backgroundColor: palette.background,
          },
        ]}>
        <ActivityIndicator color={palette.brand} size="large" />
        <Text style={[styles.loadingText, { color: palette.foreground }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return <AppNavigation />;
}

export default function RootLayout() {
  return (
    <AppUiProvider>
      <I18nProvider>
        <AppProvider>
          <NotificationsProvider>
            <AppNavigationGate />
          </NotificationsProvider>
        </AppProvider>
      </I18nProvider>
    </AppUiProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
