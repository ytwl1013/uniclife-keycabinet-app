import { AppScreen } from '@/components/app-screen';
import { FeaturePlaceholder } from '@/components/ui/feature-placeholder';
import { useTranslation } from '@/i18n';

export default function TeamRoute() {
  const { t } = useTranslation();

  return (
    <AppScreen contentClassName="justify-center" scroll={false}>
      <FeaturePlaceholder description={t('team.description')} icon="team" title={t('team.title')} />
    </AppScreen>
  );
}
