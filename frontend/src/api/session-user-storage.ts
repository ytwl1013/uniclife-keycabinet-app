import * as SecureStore from 'expo-secure-store';
import { currentUserAccountSchema, type CurrentUserAccount } from '@uniclife/shared';

const SESSION_USER_KEY = 'uniclife.session-user.v1';

function webStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export async function loadSessionUser(): Promise<CurrentUserAccount | null> {
  const stored = process.env.EXPO_OS === 'web'
    ? webStorage()?.getItem(SESSION_USER_KEY) ?? null
    : await SecureStore.getItemAsync(SESSION_USER_KEY);
  if (!stored) return null;

  try {
    const parsed = currentUserAccountSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveSessionUser(user: CurrentUserAccount): Promise<void> {
  const value = JSON.stringify(user);
  if (process.env.EXPO_OS === 'web') {
    webStorage()?.setItem(SESSION_USER_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_USER_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSessionUser(): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    webStorage()?.removeItem(SESSION_USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_USER_KEY);
}
