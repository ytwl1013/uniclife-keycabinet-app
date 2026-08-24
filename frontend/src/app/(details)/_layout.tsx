import { Redirect, Stack } from 'expo-router';

import { useApp } from '@/app-state';

export default function DetailRoutesLayout() {
  const { state } = useApp();

  if (!state.hydrated) {
    return null;
  }

  if (state.sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ animation: 'slide_from_right', gestureEnabled: true, headerShown: false }}>
      <Stack.Screen name="account/privacy" />
      <Stack.Screen name="account/terms" />
      <Stack.Screen name="account/data" />
      <Stack.Screen name="account/developer-settings" />
      <Stack.Screen name="account/profile" />
      <Stack.Screen name="account/security" />
      <Stack.Screen name="account/change-email" />
      <Stack.Screen name="account/change-password" />
      <Stack.Screen name="account/delete" />
      <Stack.Screen name="account/contact-support" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="loans/index" />
      <Stack.Screen name="cabinets/[cabinetId]/index" />
      <Stack.Screen name="cabinets/[cabinetId]/keys/new" />
      <Stack.Screen name="cabinets/[cabinetId]/keys/[keyId]" />
      <Stack.Screen name="cabinets/[cabinetId]/loans/[keyId]" />
    </Stack>
  );
}
