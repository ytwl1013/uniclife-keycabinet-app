import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

type AuthScreenProps = PropsWithChildren<{
  title: string;
  description: string;
  backLabel?: string;
  onBack?: () => void;
  footer?: ReactNode;
}>;

export function AuthScreen({
  backLabel,
  children,
  description,
  footer,
  onBack,
  title,
}: AuthScreenProps) {
  return (
    <AppScreen contentClassName="min-h-full gap-6 pb-screen">
      <View className="gap-6">
        <View className="flex-row items-center justify-between">
          {onBack && backLabel ? (
            <Pressable
              accessibilityLabel={backLabel}
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70"
              hitSlop={8}
              onPress={onBack}>
              <AppIcon name="back" size={22} tone="foreground" />
            </Pressable>
          ) : (
            <View className="h-11 w-11" />
          )}

          <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft">
            <AppIcon name="cabinet" size={24} tone="brand" />
          </View>
        </View>

        <View className="gap-2">
          <AppText variant="pageTitle" tone="foreground">
            {title}
          </AppText>
          <AppText className="max-w-md" tone="muted">
            {description}
          </AppText>
        </View>
      </View>

      <View className="gap-5">{children}</View>

      {footer ? <View className="mt-auto pt-2">{footer}</View> : null}
    </AppScreen>
  );
}

type AuthFieldProps = Omit<ComponentProps<typeof TextInput>, 'placeholderTextColor'> & {
  label: string;
  error?: string;
  helper?: string;
};

export function AuthField({
  className = '',
  error,
  helper,
  label,
  ...inputProps
}: AuthFieldProps) {
  const { palette } = useAppTheme();

  return (
    <View className="gap-2">
      <AppText variant="label" tone="foreground">
        {label}
      </AppText>
      <TextInput
        accessibilityHint={error ?? helper}
        className={`min-h-12 rounded-control border bg-surface px-controlX py-controlY text-body text-foreground ${
          error ? 'border-danger' : 'border-line focus:border-brand'
        } ${className}`}
        placeholderTextColor={palette.muted}
        selectionColor={palette.brand}
        {...inputProps}
      />
      {error ? (
        <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

type AuthPrimaryButtonProps = {
  label: string;
  busyLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function AuthPrimaryButton({
  busy = false,
  busyLabel,
  disabled = false,
  label,
  onPress,
}: AuthPrimaryButtonProps) {
  const isDisabled = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: isDisabled }}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 active:opacity-75 ${
        isDisabled ? 'opacity-50' : ''
      }`}
      disabled={isDisabled}
      onPress={onPress}>
      <AppText className="text-center" variant="label" tone="onBrand">
        {busy ? busyLabel : label}
      </AppText>
      {!busy ? <AppIcon name="arrowForward" size={19} tone="onBrand" /> : null}
    </Pressable>
  );
}

type AuthSecondaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: AppIconName;
  danger?: boolean;
};

export function AuthSecondaryButton({ danger = false, icon, label, onPress }: AuthSecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-control border border-line bg-surface px-5 py-3 active:opacity-70"
      onPress={onPress}>
      {icon ? <AppIcon name={icon} size={19} tone={danger ? 'danger' : 'brand'} /> : null}
      <AppText className="text-center" variant="label" tone={danger ? 'danger' : 'foreground'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function AuthTextButton({
  align = 'center',
  label,
  onPress,
}: {
  align?: 'start' | 'center' | 'end';
  label: string;
  onPress: () => void;
}) {
  const alignmentClass =
    align === 'start' ? 'self-start' : align === 'end' ? 'self-end' : 'self-center';

  return (
    <Pressable
      accessibilityRole="button"
      className={`${alignmentClass} rounded-control px-3 py-2 active:opacity-60`}
      hitSlop={6}
      onPress={onPress}>
      <AppText variant="label" tone="brand">
        {label}
      </AppText>
    </Pressable>
  );
}

type ConsentRowProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

export function ConsentRow({ checked, label, onPress }: ConsentRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-start gap-3 rounded-control px-1 py-1 active:opacity-70"
      onPress={onPress}>
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
          checked ? 'border-brand bg-brand' : 'border-muted bg-surface'
        }`}>
        {checked ? <View className="h-2 w-2 rounded-sm bg-on-brand" /> : null}
      </View>
      <AppText className="flex-1" variant="caption" tone="content">
        {label}
      </AppText>
    </Pressable>
  );
}

export function AuthNotice({ icon = 'shield', text }: { icon?: AppIconName; text: string }) {
  return (
    <View className="flex-row items-start gap-3 rounded-card border border-line bg-brand-soft p-card">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-pill bg-surface">
        <AppIcon name={icon} size={18} tone="brand" />
      </View>
      <AppText className="flex-1" variant="caption" tone="content">
        {text}
      </AppText>
    </View>
  );
}

export function AuthErrorNotice({ text }: { text: string }) {
  return (
    <View
      accessibilityLiveRegion="assertive"
      className="flex-row items-start gap-3 rounded-card border border-danger bg-danger-soft p-card">
      <AppIcon name="error" size={20} tone="danger" />
      <AppText className="flex-1" variant="caption" tone="danger">
        {text}
      </AppText>
    </View>
  );
}

type OnboardingChoiceProps = {
  title: string;
  description: string;
  icon: AppIconName;
  onPress: () => void;
  emphasis?: boolean;
};

export function OnboardingChoice({
  description,
  emphasis = false,
  icon,
  onPress,
  title,
}: OnboardingChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center gap-4 rounded-card border p-card active:opacity-75 ${
        emphasis ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
      }`}
      onPress={onPress}>
      <View className={`h-12 w-12 items-center justify-center rounded-pill ${emphasis ? 'bg-brand' : 'bg-brand-soft'}`}>
        <AppIcon name={icon} size={25} tone={emphasis ? 'onBrand' : 'brand'} />
      </View>
      <View className="flex-1 gap-1">
        <AppText variant="title" tone="foreground">
          {title}
        </AppText>
        <AppText variant="caption" tone="muted">
          {description}
        </AppText>
      </View>
      <AppIcon name="chevronRight" size={22} tone="muted" />
    </Pressable>
  );
}
