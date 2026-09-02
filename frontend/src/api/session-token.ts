import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'uniclife.session-token.v1';

function webStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export async function loadSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStorage()?.getItem(SESSION_TOKEN_KEY) ?? null;
  }
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function saveSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.setItem(SESSION_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(SESSION_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
