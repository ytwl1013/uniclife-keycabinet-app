import { View } from 'react-native';

import { AppIcon, AppIconName } from './app-icon';
import { AppText } from './app-text';

export function FeaturePlaceholder({ description, icon, title }: { description: string; icon: AppIconName; title: string }) {
  return (
    <View className="items-center gap-3 rounded-card border border-line bg-surface p-7 shadow-card">
      <View className="h-20 w-20 items-center justify-center rounded-pill bg-brand-soft">
        <AppIcon name={icon} size={48} tone="brand" />
      </View>
      <AppText variant="pageTitle" tone="foreground">{title}</AppText>
      <AppText className="max-w-sm text-center" tone="muted">{description}</AppText>
    </View>
  );
}
