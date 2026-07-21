import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useTranslation } from '@/i18n';

export default function ActionModalRoute() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-section bg-background p-screen">
      <View className="h-16 w-16 items-center justify-center rounded-pill bg-brand-soft">
        <AppIcon name="audit" size={34} tone="brand" />
      </View>
      <AppText className="text-center" variant="pageTitle" tone="foreground">{t('modal.title')}</AppText>
      <AppText className="max-w-sm text-center" tone="muted">{t('modal.description')}</AppText>
      <Link asChild dismissTo href="/">
        <Pressable className="rounded-control bg-brand px-5 py-3 active:opacity-70">
          <AppText variant="label" tone="onBrand">{t('modal.goHome')}</AppText>
        </Pressable>
      </Link>
    </View>
  );
}
