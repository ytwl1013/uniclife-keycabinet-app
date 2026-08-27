import { Redirect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppText } from '@/components/ui/app-text';
import { useApp } from '@/app-state';
import { useTranslation } from '@/i18n';

export default function AppEntryRoute() {
  const { t } = useTranslation();
  const { state } = useApp();

  if (!state.hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto min-h-full w-full max-w-content items-center justify-center gap-4 px-screen py-screen"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}>
          <View className="h-16 w-16 rounded-card bg-brand-soft" />
          <AppText variant="title" tone="foreground">{t('onboarding.loadingTitle')}</AppText>
          <AppText className="text-center" tone="muted">{t('onboarding.loadingDescription')}</AppText>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return state.sessionStatus === 'authenticated'
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/sign-in" />;
}
