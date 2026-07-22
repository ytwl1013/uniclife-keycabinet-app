import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { AppScreen } from '@/components/app-screen';
import { Pill } from '@/components/ui/pill';
import { SwipeSegmentPager } from '@/components/ui/swipe-segment-pager';
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
  const pages = [
    { value: 'overview', content: <CabinetOverview app={app} cabinet={cabinet} /> },
    { value: 'keys', content: <CabinetKeys app={app} cabinet={cabinet} /> },
    { value: 'activity', content: <CabinetActivity app={app} cabinet={cabinet} /> },
    { value: 'settings', content: <CabinetSettings app={app} cabinet={cabinet} /> },
  ] as const;

  return (
    <AppScaffold
      contentClassName="p-0"
      header={(
        <View className="gap-3">
          <ScreenHeader
            action={<Pill tone={cabinet.status === 'online' ? 'green' : cabinet.status === 'maintenance' ? 'orange' : 'gray'}>{t(trKey(`cabinet.status.${cabinet.status}`))}</Pill>}
            onBack={() => router.back()}
            subtitle={cabinet.location}
            title={cabinet.name}
          />

          {app.isOffline ? <Notice description={t(trKey('cabinet.offlineDescription'))} title={t(trKey('cabinet.offlineTitle'))} tone="warning" /> : null}
          {app.sessionExpired ? <Notice description={t(trKey('cabinet.sessionExpiredDescription'))} title={t(trKey('cabinet.sessionExpiredTitle'))} tone="danger" /> : null}

          <SegmentControl items={segments} onChange={setSegment} value={segment} />
        </View>
      )}
      scroll={false}>
      <SwipeSegmentPager
        onChange={setSegment}
        pages={pages}
        testID="cabinet-swipe-pager"
        value={segment}
      />
    </AppScaffold>
  );
}
