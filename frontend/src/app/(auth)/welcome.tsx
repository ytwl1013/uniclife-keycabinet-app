import { Href, router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { ProductImage } from '@/components/ui/product-image';
import {
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/features/auth/components/auth-ui';
import { useTranslation } from '@/i18n';

const signInRoute = '/(auth)/sign-in' as Href;
const signUpRoute = '/(auth)/sign-up' as Href;

export default function WelcomeRoute() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto min-h-full w-full max-w-content gap-6 px-screen pb-screen pt-screen"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand">
            <AppIcon name="cabinet" size={25} tone="onBrand" />
          </View>
          <View>
            <AppText variant="label" tone="brand">
              {t('auth.welcome.brand')}
            </AppText>
            <AppText variant="title" tone="foreground">
              {t('auth.welcome.product')}
            </AppText>
          </View>
        </View>

        <View className="h-[236px] items-center justify-center overflow-hidden rounded-card bg-brand-soft">
          <ProductImage
            accessibilityLabel={t('auth.welcome.heroAlt')}
            assetKey="cabinet-24-white"
            variant="hero"
          />
        </View>

        <View className="gap-2">
          <AppText variant="display" tone="foreground">
            {t('auth.welcome.title')}
          </AppText>
          <AppText tone="muted">{t('auth.welcome.description')}</AppText>
        </View>

        <View className="mt-auto gap-3 pt-4">
          <AuthPrimaryButton
            busyLabel={t('auth.common.working')}
            label={t('auth.welcome.signIn')}
            onPress={() => router.push(signInRoute)}
          />
          <AuthSecondaryButton
            label={t('auth.welcome.createAccount')}
            onPress={() => router.push(signUpRoute)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
