import type { PushTokenRequest } from '@uniclife/shared';
import * as SecureStore from 'expo-secure-store';

const PUSH_TOKEN_KEY = 'uniclife.expo-push-token.v1';

export async function loadRegisteredPushToken(): Promise<PushTokenRequest | null> {
  if (process.env.EXPO_OS !== 'ios' && process.env.EXPO_OS !== 'android') return null;
  const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<PushTokenRequest>;
    if (
      (value.platform === 'ios' || value.platform === 'android') &&
      typeof value.token === 'string'
    ) {
      return { platform: value.platform, token: value.token };
    }
  } catch {
    // Invalid local registration data is discarded and replaced on the next registration.
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  return null;
}

export async function saveRegisteredPushToken(input: PushTokenRequest): Promise<void> {
  if (process.env.EXPO_OS !== 'ios' && process.env.EXPO_OS !== 'android') return;
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, JSON.stringify(input), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearRegisteredPushToken(): Promise<void> {
  if (process.env.EXPO_OS !== 'ios' && process.env.EXPO_OS !== 'android') return;
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}
