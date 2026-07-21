import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppText } from '@/components/ui/app-text';
import { useTranslation } from '@/i18n';
import { useMockApp } from '@/mocks';

export default function AppEntryRoute() {
  const { t } = useTranslation();
  const { state } = useMockApp();

  if (!state.hydrated) {
    return (
      <AppScreen contentClassName="min-h-full items-center justify-center gap-4">
        <View className="h-16 w-16 rounded-card bg-brand-soft" />
        <AppText variant="title" tone="foreground">{t('onboarding.loadingTitle')}</AppText>
        <AppText className="text-center" tone="muted">{t('onboarding.loadingDescription')}</AppText>
      </AppScreen>
    );
  }

  return state.sessionStatus === 'authenticated'
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/welcome" />;
}
