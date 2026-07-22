import { Stack } from 'expo-router';

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ animation: 'slide_from_right', gestureEnabled: true, headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="data" />
      <Stack.Screen name="developer-settings" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="delete" />
    </Stack>
  );
}
