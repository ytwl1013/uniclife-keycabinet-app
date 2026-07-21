import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { CabinetActivity, CabinetKeys, CabinetOverview, CabinetSettings } from '@/features/cabinet-prototype/components/cabinet-sections';
import { ActionButton, Notice, ScreenHeader, SegmentControl, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;
type CabinetSegment = 'overview' | 'keys' | 'activity' | 'settings';

export default function CabinetDetailRoute() {
  const params = useLocalSearchParams<{ cabinetId: string }>();
  const cabinetId = Array.isArray(params.cabinetId) ? params.cabinetId[0] : params.cabinetId;
  const { t } = useTranslation();
  const app = usePrototypeApp();
  const [segment, setSegment] = useState<CabinetSegment>('overview');
  const cabinet = app.cabinets.find((candidate) => candidate.id === cabinetId);

  if (app.isLoading) {
    return (
      <AppScreen>
        <ScreenHeader onBack={() => router.back()} title={t(trKey('cabinet.loadingTitle'))} />
        <StatePanel description={t(trKey('cabinet.loadingDescription'))} loading title={t(trKey('cabinet.loadingTitle'))} />
      </AppScreen>
    );
  }

  if (!cabinet) {
    return (
      <AppScreen>
        <ScreenHeader onBack={() => router.back()} title={t(trKey('cabinet.notFoundTitle'))} />
        <StatePanel
          action={<ActionButton label={t(trKey('cabinet.backToList'))} onPress={() => router.replace('/(tabs)/cabinets')} tone="neutral" />}
          description={t(trKey('cabinet.notFoundDescription'))}
          icon="cabinet"
          title={t(trKey('cabinet.notFoundTitle'))}
        />
      </AppScreen>
    );
  }

  const segments = (['overview', 'keys', 'activity', 'settings'] as const).map((value) => ({
    value,
    label: t(trKey(`cabinet.segment.${value}`)),
  }));

  return (
    <AppScreen>
      <ScreenHeader
        action={<Pill tone={cabinet.status === 'online' ? 'green' : cabinet.status === 'maintenance' ? 'orange' : 'gray'}>{t(trKey(`cabinet.status.${cabinet.status}`))}</Pill>}
        onBack={() => router.back()}
        subtitle={cabinet.location}
        title={cabinet.name}
      />

      {app.isOffline ? <Notice description={t(trKey('cabinet.offlineDescription'))} title={t(trKey('cabinet.offlineTitle'))} tone="warning" /> : null}
      {app.sessionExpired ? <Notice description={t(trKey('cabinet.sessionExpiredDescription'))} title={t(trKey('cabinet.sessionExpiredTitle'))} tone="danger" /> : null}

      <SegmentControl items={segments} onChange={setSegment} value={segment} />

      <View className="flex-row items-center gap-2 px-1">
        <AppIcon name={segment === 'overview' ? 'cabinet' : segment === 'keys' ? 'key' : segment === 'activity' ? 'activity' : 'settings'} size={19} tone="brand" />
        <AppText variant="label" tone="foreground">{t(trKey(`cabinet.sectionTitle.${segment}`))}</AppText>
      </View>

      {segment === 'overview' ? <CabinetOverview app={app} cabinet={cabinet} /> : null}
      {segment === 'keys' ? <CabinetKeys app={app} cabinet={cabinet} /> : null}
      {segment === 'activity' ? <CabinetActivity app={app} cabinet={cabinet} /> : null}
      {segment === 'settings' ? <CabinetSettings app={app} cabinet={cabinet} /> : null}
    </AppScreen>
  );
}
