import { HeroUINativeProvider } from 'heroui-native/provider';
import type { PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const heroUiConfig = {
  toast: true,
} as const;

export function AppUiProvider({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={heroUiConfig}>
        {children}
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
