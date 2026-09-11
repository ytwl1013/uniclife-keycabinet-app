import { Stack } from 'expo-router';

import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: palette.background },
        gestureEnabled: true,
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.foreground,
      }}>
      <Stack.Screen name="sign-in" options={{ title: t('auth.signIn.title') }} />
      <Stack.Screen name="sign-up" options={{ title: t('auth.signUp.title') }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: t('auth.forgotPassword.title') }}
      />
      <Stack.Screen name="verify-reset" options={{ title: t('auth.verifyReset.title') }} />
      <Stack.Screen
        name="reset-password"
        options={{ title: t('auth.resetPassword.title') }}
      />
    </Stack>
  );
}
