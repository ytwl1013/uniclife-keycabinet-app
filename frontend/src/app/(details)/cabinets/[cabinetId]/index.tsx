import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { useAppRefreshControl } from '@/components/ui/app-refresh-control';
import { SwipeSegmentPager } from '@/components/ui/swipe-segment-pager';
import { CabinetActivity, CabinetKeys, CabinetSettings } from '@/features/cabinet-prototype/components/cabinet-sections';
import { useAppRefresh } from '@/features/app-refresh/use-app-refresh';
import { HomeSpotlightGuide, SpotlightRect } from '@/features/home/components/home-spotlight-guide';
import { ActionButton, Notice, ScreenHeader, SegmentControl, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { OfflineModeBadge, OfflineSyncBanner } from '@/features/app-refresh/offline-sync-banner';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;
type CabinetSegment = 'keys' | 'activity' | 'settings';

export default function CabinetDetailRoute() {
  const params = useLocalSearchParams<{ cabinetId: string; guide?: string }>();
  const cabinetId = Array.isArray(params.cabinetId) ? params.cabinetId[0] : params.cabinetId;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const app = usePrototypeApp();
  const { onRefresh, refreshing } = useAppRefresh();
  const refreshControl = useAppRefreshControl({ onRefresh, refreshing });
  const [segment, setSegment] = useState<CabinetSegment>('keys');
  const [guideRect, setGuideRect] = useState<SpotlightRect>();
  const [guideVisible, setGuideVisible] = useState(params.guide === 'register-key');
  const restrictionDialog = usePrototypeDialog();
  const cabinet = app.cabinets.find((candidate) => candidate.id === cabinetId);
  const offlineWriteAllowed = app.offlineWritableCabinetIds.includes(cabinetId);
  const guideSlot = app.slots.find((slot) => slot.cabinetId === cabinetId && !slot.keyId);

  if (app.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          alwaysBounceVertical
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}>
          <ScreenHeader onBack={() => router.back()} title={t(trKey('cabinet.loadingTitle'))} />
          <StatePanel description={t(trKey('cabinet.loadingDescription'))} loading title={t(trKey('cabinet.loadingTitle'))} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!cabinet) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          alwaysBounceVertical
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}>
          <ScreenHeader onBack={() => router.back()} title={t(trKey('cabinet.notFoundTitle'))} />
          <StatePanel
            action={<ActionButton label={t(trKey('cabinet.backToList'))} onPress={() => router.replace('/(tabs)')} tone="neutral" />}
            description={t(trKey('cabinet.notFoundDescription'))}
            icon="cabinet"
            title={t(trKey('cabinet.notFoundTitle'))}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const segments = (['keys', 'activity', 'settings'] as const).map((value) => ({
    value,
    label: t(trKey(`cabinet.segment.${value}`)),
  }));
  const pages = [
    {
      value: 'keys',
      content: (
        <CabinetKeys
          app={app}
          cabinet={cabinet}
          onRefresh={onRefresh}
          onSpotlightRect={guideVisible ? setGuideRect : undefined}
          refreshing={refreshing}
          spotlightSlotId={guideVisible ? guideSlot?.id : undefined}
        />
      ),
    },
    {
      value: 'activity',
      content: (
        <CabinetActivity
          app={app}
          cabinet={cabinet}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      ),
    },
    {
      value: 'settings',
      content: (
        <CabinetSettings
          app={app}
          cabinet={cabinet}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      ),
    },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
        <View className="gap-3">
          <ScreenHeader
            action={<OfflineModeBadge />}
            onBack={() => router.back()}
            subtitle={cabinet.location}
            title={cabinet.name}
          />

          <OfflineSyncBanner compact />

          {app.isOffline || app.offlineMode ? (
            <Notice
              action={!offlineWriteAllowed ? (
                <ActionButton
                  compact
                  label={t('common.viewLimits')}
                  onPress={() => void restrictionDialog.present({
                    title: t('common.offlineUse'),
                    description: t('common.offlineUseSharedDescription'),
                    confirmLabel: t('common.done'),
                  })}
                  tone="neutral"
                />
              ) : undefined}
              compact={Boolean(app.offlineMode)}
              description={offlineWriteAllowed
                ? app.offlineMode ? t('common.offlineSingleUser') : t(trKey('cabinet.offlineDescription'))
                : t('common.offlineSharedReadOnly')}
              title={offlineWriteAllowed && app.offlineMode ? t('common.offlineUseActive') : t(trKey('cabinet.offlineTitle'))}
              tone="warning"
            />
          ) : null}
          {app.sessionExpired ? <Notice description={t(trKey('cabinet.sessionExpiredDescription'))} title={t(trKey('cabinet.sessionExpiredTitle'))} tone="danger" /> : null}

          <SegmentControl items={segments} onChange={setSegment} value={segment} />
        </View>
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1">
        <SwipeSegmentPager
          onChange={setSegment}
          pages={pages}
          testID="cabinet-swipe-pager"
          value={segment}
        />
      </View>

      <HomeSpotlightGuide
        onBack={() => {
          setGuideVisible(false);
          router.replace({
            pathname: '/(tabs)',
            params: { guideStep: 'manage-cabinet' },
          });
        }}
        onClose={() => setGuideVisible(false)}
        onNext={() => setGuideVisible(false)}
        rect={guideRect}
        rectOffsetY={insets.top}
        step={2}
        total={3}
        visible={guideVisible}
      />
      {restrictionDialog.dialog}
    </SafeAreaView>
  );
}
