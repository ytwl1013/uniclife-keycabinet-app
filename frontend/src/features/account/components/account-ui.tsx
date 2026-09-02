import { Image } from 'expo-image';
import { PropsWithChildren, ReactNode, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppRefreshControl } from '@/components/ui/app-refresh-control';
import { AppText, AppTextTone } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

export function UserAvatar({
  accessibilityLabel,
  avatarUri,
  displayName,
  size = 'large',
}: {
  accessibilityLabel: string;
  avatarUri?: string;
  displayName: string;
  size?: 'compact' | 'large';
}) {
  const [failedImageUri, setFailedImageUri] = useState<string>();
  const imageSize = size === 'compact' ? 48 : 112;
  const sizeClassName = size === 'compact' ? 'h-12 w-12' : 'h-28 w-28';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');

  const showImage = Boolean(avatarUri && avatarUri !== failedImageUri);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      className={`${sizeClassName} items-center justify-center overflow-hidden rounded-pill ${
        showImage ? 'bg-brand-soft' : 'bg-brand'
      }`}
      testID="user-avatar">
      {avatarUri && showImage ? (
        <Image
          contentFit="cover"
          onError={() => setFailedImageUri(avatarUri)}
          source={{ uri: avatarUri }}
          style={{ height: imageSize, width: imageSize }}
          testID="user-avatar-image"
          transition={160}
        />
      ) : (
        <AppText variant={size === 'compact' ? 'label' : 'display'} tone="onBrand">
          {initials}
        </AppText>
      )}
    </View>
  );
}

type AccountPageProps = PropsWithChildren<{
  title: string;
  description: string;
  backLabel?: string;
  footer?: ReactNode;
  headerShown?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollToEndOnContentChange?: boolean;
  trailing?: ReactNode;
}>;

export function AccountPage({
  backLabel,
  children,
  description,
  footer,
  headerShown = true,
  onBack,
  onRefresh,
  refreshing = false,
  scrollToEndOnContentChange = false,
  title,
  trailing,
}: AccountPageProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {headerShown ? (
        <View className="bg-background">
          <View className="mx-auto w-full max-w-content px-screen py-3">
            <View className="flex-row items-center gap-3">
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
                <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft">
                  <AppIcon name="person" size={22} tone="brand" />
                </View>
              )}
              <View className="min-w-0 flex-1 gap-0.5">
                <AppText numberOfLines={1} variant="title" tone="foreground">
                  {title}
                </AppText>
                <AppText numberOfLines={2} variant="caption" tone="muted">
                  {description}
                </AppText>
              </View>
              {trailing ?? <View className="h-11 w-11" />}
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        alwaysBounceVertical
        className="min-w-0 flex-1"
        contentContainerClassName={`pb-screen ${
          headerShown ? 'pt-screen' : 'pt-3'
        }`}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (scrollToEndOnContentChange) {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }
        }}
        ref={scrollViewRef}
        refreshControl={onRefresh ? (
          <AppRefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        ) : undefined}
        showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-content gap-6 px-screen">
          {children}
        </View>
      </ScrollView>

      {footer ? (
        <SafeAreaView
          className="border-t border-line bg-surface"
          edges={['bottom', 'left', 'right']}>
          <View className="mx-auto w-full max-w-content px-screen py-2">
            {footer}
          </View>
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

export function AccountSection({
  children,
  description,
  title,
}: PropsWithChildren<{
  title: string;
  description?: string;
  icon: AppIconName;
}>) {
  return (
    <View className="gap-3">
      <View className="gap-1 px-1">
        <AppText variant="title" tone="content">
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <View className="gap-1 overflow-hidden rounded-[24px] bg-surface p-2 shadow-card">
        {children}
      </View>
    </View>
  );
}

export function SettingsAction({
  detail,
  disabled = false,
  icon,
  label,
  onPress,
  selected = false,
  tone = 'foreground',
}: {
  label: string;
  detail?: string;
  icon: AppIconName;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  tone?: AppTextTone;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      className={`min-h-16 flex-row items-center gap-4 rounded-control px-3 py-3 active:bg-brand-soft active:opacity-80 ${
        selected ? 'bg-brand-soft' : 'bg-surface'
      } ${disabled ? 'opacity-45' : ''}`}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}>
      <View className={`h-10 w-10 items-center justify-center rounded-pill ${selected ? 'bg-brand' : 'bg-brand-soft'}`}>
        <AppIcon name={icon} size={19} tone={selected ? 'onBrand' : tone} />
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="label" tone={tone}>
          {label}
        </AppText>
        {detail ? (
          <AppText variant="caption" tone="muted">
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppIcon name="chevronRight" size={21} tone="muted" />
    </Pressable>
  );
}

export function ToggleRow({
  description,
  disabled = false,
  label,
  onChange,
  value,
  valueLabel,
}: {
  label: string;
  description: string;
  valueLabel: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}. ${valueLabel}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      className={`min-h-16 flex-row items-center gap-4 rounded-control bg-surface px-3 py-3 active:bg-brand-soft active:opacity-80 ${
        disabled ? 'opacity-45' : ''
      }`}
      disabled={disabled}
      hitSlop={4}
      onPress={() => onChange(!value)}>
      <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand-soft">
        <AppIcon name="notification" size={19} tone="brand" />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <AppText variant="label" tone="foreground">
            {label}
          </AppText>
          <View className={`rounded-pill px-2 py-0.5 ${value ? 'bg-success-soft' : 'bg-background'}`}>
            <AppText variant="caption" tone={value ? 'success' : 'muted'}>
              {valueLabel}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="muted">
          {description}
        </AppText>
      </View>
      <View
        className={`h-7 w-12 justify-center rounded-pill px-1 ${value ? 'items-end bg-brand' : 'items-start bg-line'}`}>
        <View className="h-5 w-5 rounded-pill bg-surface" />
      </View>
    </Pressable>
  );
}

export function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      className={`min-h-12 flex-row items-center justify-between rounded-control border px-4 py-3 active:opacity-70 ${
        selected ? 'border-brand bg-brand-soft' : 'border-line bg-background'
      }`}
      onPress={onPress}>
      <AppText variant="label" tone={selected ? 'brand' : 'content'}>
        {label}
      </AppText>
      {selected ? <AppIcon name="check" size={18} tone="brand" /> : <View className="h-[18px] w-[18px]" />}
    </Pressable>
  );
}

export function FeedbackBanner({
  message,
  tone = 'brand',
}: {
  message: string;
  tone?: Extract<AppTextTone, 'brand' | 'danger' | 'success' | 'warning'>;
}) {
  const backgroundClass =
    tone === 'danger'
      ? 'border-danger bg-danger-soft'
      : tone === 'success'
        ? 'border-success bg-success-soft'
        : tone === 'warning'
          ? 'border-warning bg-warning-soft'
          : 'border-brand bg-brand-soft';

  return (
    <View
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      className={`flex-row items-start gap-3 rounded-control border p-card ${backgroundClass}`}>
      <AppIcon name={tone === 'danger' ? 'error' : tone === 'brand' ? 'notification' : 'shield'} size={20} tone={tone} />
      <AppText className="flex-1" variant="caption" tone={tone}>
        {message}
      </AppText>
    </View>
  );
}

export function ConfirmationPanel({
  cancelLabel,
  confirmLabel,
  description,
  destructive = false,
  disabled = false,
  onCancel,
  onConfirm,
  title,
}: {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={`gap-4 rounded-card border p-card ${
        destructive ? 'border-danger bg-danger-soft' : 'border-warning bg-warning-soft'
      }`}>
      <View className="gap-1">
        <AppText variant="title" tone={destructive ? 'danger' : 'foreground'}>
          {title}
        </AppText>
        <AppText variant="caption" tone="content">
          {description}
        </AppText>
      </View>
      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 py-2 active:opacity-70"
          onPress={onCancel}>
          <AppText variant="label" tone="foreground">
            {cancelLabel}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          className={`min-h-11 flex-1 items-center justify-center rounded-control px-4 py-2 active:opacity-70 ${
            destructive ? 'bg-danger' : 'bg-brand'
          } ${disabled ? 'opacity-45' : ''}`}
          disabled={disabled}
          onPress={onConfirm}>
          <AppText className="text-center" variant="label" tone="onBrand">
            {confirmLabel}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export function AccountLoading({ label }: { label: string }) {
  const { palette } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="mx-auto min-h-full w-full max-w-content flex-1 items-center justify-center gap-4 px-screen pb-screen pt-screen">
        <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
          <ActivityIndicator color={palette.brand} />
        </View>
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
      </View>
    </SafeAreaView>
  );
}
