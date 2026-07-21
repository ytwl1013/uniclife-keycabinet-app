import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { TranslationKey, useTranslation } from '@/i18n';

import { AccountPage, FeedbackBanner } from './account-ui';

export type LegalDocumentKind = 'privacy' | 'terms' | 'data';

const legalDocuments: Record<
  LegalDocumentKind,
  { titleKey: TranslationKey; bodyKey: TranslationKey; icon: 'shield' | 'audit' | 'notification' }
> = {
  privacy: {
    titleKey: 'legal.privacyTitle',
    bodyKey: 'legal.privacyBody',
    icon: 'shield',
  },
  terms: {
    titleKey: 'legal.termsTitle',
    bodyKey: 'legal.termsBody',
    icon: 'audit',
  },
  data: {
    titleKey: 'legal.dataTitle',
    bodyKey: 'legal.dataBody',
    icon: 'notification',
  },
};

export function LegalScreen({ kind }: { kind: LegalDocumentKind }) {
  const router = useRouter();
  const { t } = useTranslation();
  const document = legalDocuments[kind];

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.legalDraft')}
      onBack={() => router.back()}
      title={t(document.titleKey)}>
      <FeedbackBanner message={t('legal.draftNotice')} tone="warning" />

      <View className="gap-5 rounded-card border border-line bg-surface p-card shadow-card">
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft">
          <AppIcon name={document.icon} size={24} tone="brand" />
        </View>
        <AppText className="leading-7" tone="content">
          {t(document.bodyKey)}
        </AppText>
      </View>
    </AccountPage>
  );
}
