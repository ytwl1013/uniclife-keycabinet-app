import { AppScreen } from '@/components/app-screen';
import { FeaturePlaceholder } from '@/components/ui/feature-placeholder';
import { useTranslation } from '@/i18n';

export default function ScanRoute() {
  const { t } = useTranslation();

  return (
    <AppScreen contentClassName="justify-center" scroll={false}>
      <FeaturePlaceholder description={t('scan.description')} icon="scan" title={t('scan.title')} />
    </AppScreen>
  );
}
