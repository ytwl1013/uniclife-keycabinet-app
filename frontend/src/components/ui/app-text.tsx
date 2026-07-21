import { ComponentProps } from 'react';
import { Text } from 'react-native';

export type AppTextVariant = 'display' | 'pageTitle' | 'title' | 'body' | 'label' | 'caption' | 'metric';
export type AppTextTone = 'foreground' | 'content' | 'muted' | 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'onBrand';

const variantClasses: Record<AppTextVariant, string> = {
  display: 'text-display',
  pageTitle: 'text-pageTitle',
  title: 'text-title',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
  metric: 'text-metric',
};

const toneClasses: Record<AppTextTone, string> = {
  foreground: 'text-foreground',
  content: 'text-content',
  muted: 'text-muted',
  brand: 'text-brand',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  accent: 'text-accent',
  onBrand: 'text-on-brand',
};

type AppTextProps = ComponentProps<typeof Text> & {
  variant?: AppTextVariant;
  tone?: AppTextTone;
};

export function AppText({ className = '', variant = 'body', tone = 'content', ...props }: AppTextProps) {
  return <Text className={`${variantClasses[variant]} ${toneClasses[tone]} ${className}`} {...props} />;
}
