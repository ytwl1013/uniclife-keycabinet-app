import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

export function useCameraAccess() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [generation, setGeneration] = useState(0);

  useFocusEffect(useCallback(() => {
    let disposed = false;
    const refreshPermission = async () => {
      try {
        await getPermission();
        if (!disposed && AppState.currentState === 'active') {
          setGeneration((value) => value + 1);
          setActive(true);
        }
      } catch {
        // Keep the permission/retry UI usable if the native permission check fails.
        if (!disposed) setActive(AppState.currentState === 'active');
      }
    };
    if (AppState.currentState === 'active') void refreshPermission();
    const subscription = AppState.addEventListener('change', (next) => {
      setActive(false);
      if (next === 'active') void refreshPermission();
    });
    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [getPermission]));

  return { active, generation, permission, requestPermission };
}
