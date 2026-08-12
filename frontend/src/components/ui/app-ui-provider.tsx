import { HeroUINativeProvider } from 'heroui-native/provider';
import type { PropsWithChildren } from 'react';

const heroUiConfig = {
  toast: false,
} as const;

export function AppUiProvider({ children }: PropsWithChildren) {
  return <HeroUINativeProvider config={heroUiConfig}>{children}</HeroUINativeProvider>;
}
