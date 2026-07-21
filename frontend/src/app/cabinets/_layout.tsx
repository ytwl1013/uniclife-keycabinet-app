import { Redirect, Stack } from 'expo-router';

import { useMockApp } from '@/mocks';

export default function CabinetRoutesLayout() {
  const { state } = useMockApp();

  if (!state.hydrated) {
    return null;
  }

  if (state.sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[cabinetId]/index" />
      <Stack.Screen name="[cabinetId]/keys/new" />
      <Stack.Screen name="[cabinetId]/keys/[keyId]" />
      <Stack.Screen name="[cabinetId]/loans/[keyId]" />
    </Stack>
  );
}
