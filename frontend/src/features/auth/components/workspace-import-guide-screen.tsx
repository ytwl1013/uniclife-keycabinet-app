import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useTranslation } from '@/i18n';

import { StandaloneAuthScreen } from './auth-ui';

const cabinetSettingsGuideImage = require('@/assets/images/cabinet-settings-invite-guide.png');

type GuideSectionProps = {
  body: string;
  icon: AppIconName;
  title: string;
  children?: React.ReactNode;
};

function GuideSection({ body, children, icon, title }: GuideSectionProps) {
  return (
    <View className="gap-4 rounded-card border border-line bg-surface p-card">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand-soft">
          <AppIcon name={icon} size={21} tone="brand" />
        </View>
        <AppText className="flex-1" selectable variant="title" tone="foreground">
          {title}
        </AppText>
      </View>
      <AppText selectable tone="content">
        {body}
      </AppText>
      {children}
    </View>
  );
}

export function WorkspaceImportGuideScreen() {
  const { t } = useTranslation();

  return (
    <StandaloneAuthScreen
      backLabel={t('onboarding.importGuide.back')}
      description={t('onboarding.importGuide.description')}
      onBack={() => router.back()}
      title={t('onboarding.importGuide.title')}>
      <View className="gap-4">
        <GuideSection
          body={t('onboarding.importGuide.initializeBody')}
          icon="cabinet"
          title={t('onboarding.importGuide.initializeTitle')}>
          <View className="flex-row items-start gap-3 rounded-control bg-brand-soft p-3">
            <AppIcon name="scan" size={20} tone="brand" />
            <AppText className="flex-1" selectable variant="caption" tone="content">
              {t('onboarding.importGuide.initializeSteps')}
            </AppText>
          </View>
        </GuideSection>

        <GuideSection
          body={t('onboarding.importGuide.joinBody')}
          icon="team"
          title={t('onboarding.importGuide.joinTitle')}>
          <View className="gap-1 rounded-control bg-brand-soft p-3">
            <AppText selectable variant="caption" tone="brand">
              {t('onboarding.importGuide.joinPathLabel')}
            </AppText>
            <AppText selectable tone="foreground">
              {t('onboarding.importGuide.joinPath')}
            </AppText>
          </View>

          <View className="overflow-hidden rounded-control border border-line bg-background">
            <Image
              accessibilityLabel={t('onboarding.importGuide.imageAccessibilityLabel')}
              accessible
              contentFit="contain"
              source={cabinetSettingsGuideImage}
              style={{ aspectRatio: 760 / 1442, width: '100%' }}
            />
          </View>
          <AppText selectable variant="caption" tone="muted">
            {t('onboarding.importGuide.imageCaption')}
          </AppText>
        </GuideSection>
      </View>
    </StandaloneAuthScreen>
  );
}
