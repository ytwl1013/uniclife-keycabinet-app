import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { TranslationKey, useTranslation } from '@/i18n';

import { AccountPage } from './account-ui';

export type LegalDocumentKind = 'privacy' | 'terms' | 'data';

const legalDocuments: Record<
  LegalDocumentKind,
  {
    titleKey: TranslationKey;
    summaryKey: TranslationKey;
    icon: 'shield' | 'audit' | 'notification';
    sections: readonly { titleKey: TranslationKey; bodyKey: TranslationKey }[];
  }
> = {
  privacy: {
    titleKey: 'legal.privacyTitle',
    summaryKey: 'legal.privacySummary',
    icon: 'shield',
    sections: [
      { titleKey: 'legal.privacy.controllerTitle', bodyKey: 'legal.privacy.controllerBody' },
      { titleKey: 'legal.privacy.collectionTitle', bodyKey: 'legal.privacy.collectionBody' },
      { titleKey: 'legal.privacy.purposeTitle', bodyKey: 'legal.privacy.purposeBody' },
      { titleKey: 'legal.privacy.disclosureTitle', bodyKey: 'legal.privacy.disclosureBody' },
      { titleKey: 'legal.privacy.transferTitle', bodyKey: 'legal.privacy.transferBody' },
      { titleKey: 'legal.privacy.retentionTitle', bodyKey: 'legal.privacy.retentionBody' },
      { titleKey: 'legal.privacy.securityTitle', bodyKey: 'legal.privacy.securityBody' },
      { titleKey: 'legal.privacy.rightsTitle', bodyKey: 'legal.privacy.rightsBody' },
      { titleKey: 'legal.privacy.californiaTitle', bodyKey: 'legal.privacy.californiaBody' },
      { titleKey: 'legal.privacy.childrenTitle', bodyKey: 'legal.privacy.childrenBody' },
      { titleKey: 'legal.privacy.changesTitle', bodyKey: 'legal.privacy.changesBody' },
    ],
  },
  terms: {
    titleKey: 'legal.termsTitle',
    summaryKey: 'legal.termsSummary',
    icon: 'audit',
    sections: [
      { titleKey: 'legal.terms.acceptanceTitle', bodyKey: 'legal.terms.acceptanceBody' },
      { titleKey: 'legal.terms.accountsTitle', bodyKey: 'legal.terms.accountsBody' },
      { titleKey: 'legal.terms.authorizedUseTitle', bodyKey: 'legal.terms.authorizedUseBody' },
      { titleKey: 'legal.terms.safetyTitle', bodyKey: 'legal.terms.safetyBody' },
      { titleKey: 'legal.terms.customerDataTitle', bodyKey: 'legal.terms.customerDataBody' },
      { titleKey: 'legal.terms.serviceTitle', bodyKey: 'legal.terms.serviceBody' },
      { titleKey: 'legal.terms.ipTitle', bodyKey: 'legal.terms.ipBody' },
      { titleKey: 'legal.terms.terminationTitle', bodyKey: 'legal.terms.terminationBody' },
      { titleKey: 'legal.terms.disclaimerTitle', bodyKey: 'legal.terms.disclaimerBody' },
      { titleKey: 'legal.terms.liabilityTitle', bodyKey: 'legal.terms.liabilityBody' },
      { titleKey: 'legal.terms.lawTitle', bodyKey: 'legal.terms.lawBody' },
      { titleKey: 'legal.terms.changesTitle', bodyKey: 'legal.terms.changesBody' },
    ],
  },
  data: {
    titleKey: 'legal.dataTitle',
    summaryKey: 'legal.dataSummary',
    icon: 'notification',
    sections: [
      { titleKey: 'legal.data.accountTitle', bodyKey: 'legal.data.accountBody' },
      { titleKey: 'legal.data.cabinetTitle', bodyKey: 'legal.data.cabinetBody' },
      { titleKey: 'legal.data.keyTitle', bodyKey: 'legal.data.keyBody' },
      { titleKey: 'legal.data.auditTitle', bodyKey: 'legal.data.auditBody' },
      { titleKey: 'legal.data.cameraTitle', bodyKey: 'legal.data.cameraBody' },
      { titleKey: 'legal.data.sharingTitle', bodyKey: 'legal.data.sharingBody' },
      { titleKey: 'legal.data.controlTitle', bodyKey: 'legal.data.controlBody' },
    ],
  },
};

export function LegalScreen({ kind }: { kind: LegalDocumentKind }) {
  const router = useRouter();
  const { t } = useTranslation();
  const document = legalDocuments[kind];

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t(document.summaryKey)}
      onBack={() => router.back()}
      title={t(document.titleKey)}>
      <View className="gap-5 rounded-card border border-line bg-surface p-card shadow-card">
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft">
          <AppIcon name={document.icon} size={24} tone="brand" />
        </View>
        <View className="gap-1">
          <AppText variant="caption" tone="brand">{t('legal.effectiveDate')}</AppText>
          <AppText tone="content">{t('legal.contactRoute')}</AppText>
        </View>

        {document.sections.map((section, index) => (
          <View className="gap-2 border-t border-line pt-4" key={section.titleKey}>
            <AppText variant="label" tone="foreground">
              {index + 1}. {t(section.titleKey)}
            </AppText>
            <AppText className="leading-7" tone="content">
              {t(section.bodyKey)}
            </AppText>
          </View>
        ))}
      </View>
    </AccountPage>
  );
}
