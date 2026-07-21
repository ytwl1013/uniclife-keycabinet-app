import { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { AppText, AppTextTone } from './app-text';

export type PillTone = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple';

const toneClasses: Record<PillTone, { container: string; textTone: AppTextTone }> = {
  blue: { container: 'border-brand bg-brand', textTone: 'onBrand' },
  green: { container: 'border-success/25 bg-success-soft', textTone: 'success' },
  orange: { container: 'border-warning/25 bg-warning-soft', textTone: 'warning' },
  red: { container: 'border-danger/25 bg-danger-soft', textTone: 'danger' },
  gray: { container: 'border-line bg-background', textTone: 'muted' },
  purple: { container: 'border-accent/25 bg-accent-soft', textTone: 'accent' },
};

export function Pill({ children, tone = 'gray' }: PropsWithChildren<{ tone?: PillTone }>) {
  const classes = toneClasses[tone];

  return (
    <View className={`min-h-8 items-center rounded-pill border px-controlX py-1.5 ${classes.container}`}>
      <AppText tone={classes.textTone} variant="label">{children}</AppText>
    </View>
  );
}
