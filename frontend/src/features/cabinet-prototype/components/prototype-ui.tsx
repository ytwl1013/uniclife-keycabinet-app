import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText, AppTextTone } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

export function ScreenHeader({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3">
      {onBack ? (
        <Pressable accessibilityLabel={title} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70" onPress={onBack}>
          <AppIcon name="back" size={23} tone="brand" />
        </Pressable>
      ) : null}
      <View className="min-w-0 flex-1 gap-1">
        <AppText numberOfLines={2} variant="pageTitle" tone="foreground">{title}</AppText>
        {subtitle ? <AppText numberOfLines={2} variant="caption" tone="muted">{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

export function SegmentControl<T extends string>({ items, value, onChange }: { items: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <View className="flex-row rounded-control border border-line bg-surface p-1">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`min-h-10 flex-1 items-center justify-center rounded-[10px] px-2 ${selected ? 'bg-brand' : 'bg-transparent'} active:opacity-70`}
            key={item.value}
            onPress={() => onChange(item.value)}>
            <AppText className="text-center" variant="caption" tone={selected ? 'onBrand' : 'muted'}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionCard({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <View className={`gap-3.5 rounded-card border border-line bg-surface p-card shadow-card ${className}`}>{children}</View>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="min-w-0 flex-1 gap-1">
        <AppText variant="title" tone="foreground">{title}</AppText>
        {description ? <AppText variant="caption" tone="muted">{description}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

export function ActionButton({ label, icon, onPress, tone = 'brand', disabled = false, compact = false }: { label: string; icon?: AppIconName; onPress: () => void; tone?: 'brand' | 'danger' | 'neutral'; disabled?: boolean; compact?: boolean }) {
  const buttonClass = tone === 'brand'
    ? 'border-brand bg-brand'
    : tone === 'danger'
      ? 'border-danger bg-danger'
      : 'border-line bg-surface';
  const textTone: AppTextTone = tone === 'neutral' ? 'foreground' : 'onBrand';

  return (
    <Pressable
      accessibilityRole="button"
      className={`${compact ? 'min-h-10 px-3' : 'min-h-[50px] px-4'} flex-row items-center justify-center gap-2 rounded-control border ${buttonClass} ${disabled ? 'opacity-40' : 'active:opacity-75'}`}
      disabled={disabled}
      onPress={onPress}>
      {icon ? <AppIcon name={icon} size={compact ? 18 : 21} tone={tone === 'neutral' ? 'foreground' : 'onBrand'} /> : null}
      <AppText className="text-center" variant="label" tone={textTone}>{label}</AppText>
    </Pressable>
  );
}

export function InlineButton({ label, onPress, tone = 'brand', disabled = false }: { label: string; onPress: () => void; tone?: AppTextTone; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" className={`min-h-10 justify-center px-1 ${disabled ? 'opacity-40' : 'active:opacity-60'}`} disabled={disabled} onPress={onPress}>
      <AppText variant="label" tone={tone}>{label}</AppText>
    </Pressable>
  );
}

export function FormField({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', error }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad'; error?: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="gap-2">
      <AppText variant="label" tone="foreground">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        className={`rounded-control border bg-background px-4 py-3 text-body text-content ${multiline ? 'min-h-24' : 'min-h-[50px]'} ${error ? 'border-danger' : 'border-line'}`}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
    </View>
  );
}

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="min-h-[50px] flex-1 flex-row items-center gap-2.5 rounded-control border border-line bg-surface px-4">
      <AppIcon name="search" size={21} tone="muted" />
      <TextInput
        accessibilityLabel={placeholder}
        className="flex-1 text-body text-content"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        value={value}
      />
    </View>
  );
}

export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-10 items-center justify-center rounded-pill border px-4 ${selected ? 'border-brand bg-brand' : 'border-line bg-surface'} active:opacity-70`}
      onPress={onPress}>
      <AppText variant="caption" tone={selected ? 'onBrand' : 'muted'}>{label}</AppText>
    </Pressable>
  );
}

export function Notice({ title, description, tone = 'brand' }: { title: string; description: string; tone?: 'brand' | 'warning' | 'danger' | 'success' }) {
  const classes = {
    brand: { container: 'border-brand/25 bg-brand-soft', icon: 'shield' as const, iconTone: 'brand' as const },
    warning: { container: 'border-warning/25 bg-warning-soft', icon: 'error' as const, iconTone: 'warning' as const },
    danger: { container: 'border-danger/25 bg-danger-soft', icon: 'error' as const, iconTone: 'danger' as const },
    success: { container: 'border-success/25 bg-success-soft', icon: 'shield' as const, iconTone: 'success' as const },
  }[tone];
  return (
    <View className={`flex-row gap-3 rounded-card border p-3.5 ${classes.container}`}>
      <AppIcon name={classes.icon} size={22} tone={classes.iconTone} />
      <View className="flex-1 gap-1">
        <AppText variant="label" tone="foreground">{title}</AppText>
        <AppText variant="caption" tone="content">{description}</AppText>
      </View>
    </View>
  );
}

export function StatePanel({ icon = 'empty', title, description, action, loading = false }: { icon?: AppIconName; title: string; description: string; action?: ReactNode; loading?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View className="min-h-[260px] items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface px-7 py-10">
      {loading ? <ActivityIndicator color={palette.brand} size="large" /> : (
        <View className="h-16 w-16 items-center justify-center rounded-pill bg-brand-soft">
          <AppIcon name={icon} size={31} tone="brand" />
        </View>
      )}
      <AppText className="text-center" variant="title" tone="foreground">{title}</AppText>
      <AppText className="text-center" variant="body" tone="muted">{description}</AppText>
      {action}
    </View>
  );
}

export function Stat({ label, value, tone = 'foreground' }: { label: string; value: string | number; tone?: AppTextTone }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-control bg-background px-2 py-3">
      <AppText variant="metric" tone={tone}>{value}</AppText>
      <AppText className="text-center" variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}
