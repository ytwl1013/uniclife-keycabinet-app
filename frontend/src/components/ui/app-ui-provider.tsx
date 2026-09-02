import { HeroUINativeProvider } from 'heroui-native/provider';
import type { PropsWithChildren } from 'react';

const heroUiConfig = {
  toast: true,
} as const;

export function AppUiProvider({ children }: PropsWithChildren) {
  return <HeroUINativeProvider config={heroUiConfig}>{children}</HeroUINativeProvider>;
}
