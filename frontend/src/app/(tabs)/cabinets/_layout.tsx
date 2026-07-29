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
    <Stack screenOptions={{ animation: 'slide_from_right', gestureEnabled: true, headerShown: false, headerShadowVisible: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
