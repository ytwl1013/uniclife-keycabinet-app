import { Href, router, useLocalSearchParams } from 'expo-router';
import { Dialog } from 'heroui-native/dialog';
import { createRef, useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { ProductImage } from '@/components/ui/product-image';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { HomeSpotlightGuide, SpotlightRect } from '@/features/home/components/home-spotlight-guide';
import { useNotifications } from '@/features/notifications/notifications-provider';
import { useTranslation } from '@/i18n';
import { Cabinet, ProductSku, useMockApp } from '@/mocks';

const GUIDE_STEPS = 3;

export default function HomeRoute() {
  const params = useLocalSearchParams<{ guideStep?: string }>();
  const { t } = useTranslation();
  const { currentUser, selectors, state } = useMockApp();
  const { unreadCount } = useNotifications();
  const cabinets = selectors.cabinetsForCurrentUser();
  const borrowedKeys = selectors.borrowedKeys();
  const [guideConfirmationVisible, setGuideConfirmationVisible] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideVisible, setGuideVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect>();
  const scrollRef = useRef<ScrollView>(null);
  const guideTargetRefs = useRef([createRef<View>(), createRef<View>(), createRef<View>()]).current;
  const sectionY = useRef<number[]>([]);
  const guideRequest = useRef(0);
  const guideFrame = useRef<number | undefined>(undefined);
  const resumedGuide = useRef(false);
  const initials = currentUser?.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('') ?? '';
  const overdueCount = borrowedKeys.filter((key) => {
    const loan = state.loans.find((candidate) => candidate.keyId === key.id && candidate.status === 'active');
    return Boolean(loan?.expectedReturnAt && Date.parse(loan.expectedReturnAt) < Date.parse(state.now));
  }).length;

  const prepareGuideStep = useCallback((step: number) => {
    const request = ++guideRequest.current;
    if (guideFrame.current !== undefined) cancelAnimationFrame(guideFrame.current);
    setGuideVisible(false);
    setSpotlightRect(undefined);
    setGuideStep(step);
    const targetOffset = step === 1 ? 260 : step === 2 ? 320 : 12;
    const targetY = step === 2
      ? (sectionY.current[1] ?? 0) + (sectionY.current[2] ?? 0)
      : sectionY.current[step] ?? 0;
    scrollRef.current?.scrollTo({ animated: false, y: Math.max(0, targetY - targetOffset) });

    let attempts = 0;
    const measureWhenReady = () => {
      guideFrame.current = requestAnimationFrame(() => {
        if (request !== guideRequest.current) return;
        const target = guideTargetRefs[step].current;
        if (!target) {
          if (attempts++ < 4) measureWhenReady();
          return;
        }
        target.measureInWindow((x, y, width, height) => {
          if (request !== guideRequest.current) return;
          if (width <= 0 || height <= 0) {
            if (attempts++ < 4) measureWhenReady();
            return;
          }
          setSpotlightRect({ x, y, width, height });
          setGuideVisible(true);
        });
      });
    };
    guideFrame.current = requestAnimationFrame(measureWhenReady);
  }, [guideTargetRefs]);
  const startGuide = () => {
    setGuideConfirmationVisible(false);
    prepareGuideStep(0);
  };
  const closeGuide = () => {
    guideRequest.current += 1;
    if (guideFrame.current !== undefined) cancelAnimationFrame(guideFrame.current);
    setGuideVisible(false);
    setSpotlightRect(undefined);
  };
  useEffect(() => {
    if (params.guideStep !== 'manage-cabinet' || resumedGuide.current) return;
    resumedGuide.current = true;
    prepareGuideStep(1);
    router.setParams({ guideStep: undefined });
  }, [params.guideStep, prepareGuideStep]);
  useEffect(() => () => {
    guideRequest.current += 1;
    if (guideFrame.current !== undefined) cancelAnimationFrame(guideFrame.current);
  }, []);
  const openCabinetGuide = () => {
    const cabinet = cabinets.find((candidate) =>
      state.slots.some((slot) => slot.cabinetId === candidate.id && !slot.keyId),
    );
    if (!cabinet) {
      prepareGuideStep(2);
      return;
    }
    closeGuide();
    router.push({
      pathname: '/cabinets/[cabinetId]',
      params: { cabinetId: cabinet.id, guide: 'register-key' },
    } as Href);
  };
  const sectionLayout = (index: number) => (event: LayoutChangeEvent) => {
    sectionY.current[index] = event.nativeEvent.layout.y;
  };

  if (!state.hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="m-screen h-32 rounded-card bg-brand-soft" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
          <View className="flex-row items-center justify-between gap-4">
            <Pressable
              accessibilityLabel={t('navigation.account')}
              accessibilityRole="button"
              className="h-12 w-12 items-center justify-center rounded-pill bg-brand active:opacity-75"
              onPress={() => router.push('/(tabs)/account' as Href)}>
              <AppText variant="label" tone="onBrand">{initials}</AppText>
            </Pressable>
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityLabel={t('notifications.title')}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft active:opacity-70"
                onPress={() => router.push('/(details)/notifications' as Href)}
                testID="home-notifications-button">
                <AppIcon name="notification" size={22} tone="brand" />
                {unreadCount ? (
                  <View className="absolute right-0.5 top-0.5 min-h-4 min-w-4 items-center justify-center rounded-pill border-2 border-background bg-danger px-0.5">
                    <AppText className="text-[9px] leading-[11px]" tone="onBrand">{Math.min(unreadCount, 9)}</AppText>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityLabel={t('home.userGuide')}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft active:opacity-70"
                onPress={() => setGuideConfirmationVisible(true)}
                testID="home-guide-button">
                <AppIcon name="guide" size={22} tone="brand" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="min-w-0 flex-1"
        contentContainerClassName="mx-auto w-full max-w-content gap-6 px-screen pb-screen pt-screen"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}>
        <View className="gap-3" collapsable={false} onLayout={sectionLayout(0)} ref={guideTargetRefs[0]}>
          <AppText className="px-1" variant="title" tone="foreground">{t('home.activeLoansTitle')}</AppText>
          <View className="gap-4 rounded-card border border-line bg-surface p-5 shadow-card" testID="home-borrowed-summary">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-pill bg-warning-soft">
                <AppIcon name="key" size={27} tone="warning" />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <View className="flex-row items-baseline gap-2">
                  <AppText variant="metric" tone="foreground">{borrowedKeys.length}</AppText>
                  <AppText className="flex-1" variant="label" tone="foreground">{t('home.borrowedCountLabel')}</AppText>
                </View>
                <AppText variant="caption" tone={overdueCount ? 'danger' : 'muted'}>{t('home.overdueCountLabel', { count: overdueCount })}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                className="min-h-11 flex-row items-center justify-center gap-2 rounded-control bg-brand px-4 active:opacity-75"
                onPress={() => router.push('/(details)/loans' as Href)}
                testID="home-return-borrowed-key">
                <AppIcon name="return" size={19} tone="onBrand" />
                <AppText variant="label" tone="onBrand">{t('home.returnBorrowedKey')}</AppText>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="gap-3" collapsable={false} onLayout={sectionLayout(1)} ref={guideTargetRefs[1]}>
          <AppText className="px-1" variant="title" tone="foreground">{t('home.cabinetsTitle')}</AppText>
          {cabinets.length ? cabinets.map((cabinet) => (
            <CabinetCard cabinet={cabinet} key={cabinet.id} sku={selectors.skuById(cabinet.skuId)} />
          )) : (
            <View className="items-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-8">
              <AppIcon name="cabinet" size={28} tone="brand" />
              <AppText className="text-center" variant="label" tone="muted">{t('home.noCabinetsDescription')}</AppText>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            className="min-h-[50px] flex-row items-center justify-center gap-2 rounded-control border border-brand bg-brand-soft px-4 active:opacity-75"
            collapsable={false}
            onLayout={sectionLayout(2)}
            onPress={() => router.push('/(details)/scan' as Href)}
            ref={guideTargetRefs[2]}
            testID="home-add-cabinet">
            <AppIcon name="scan" size={21} tone="brand" />
            <AppText variant="label" tone="brand">{t('home.addCabinet')}</AppText>
          </Pressable>
        </View>

      </ScrollView>

      <Dialog isOpen={guideConfirmationVisible} onOpenChange={setGuideConfirmationVisible}>
        <Dialog.Portal unstable_accessibilityContainerViewIsModal>
          <Dialog.Overlay />
          <Dialog.Content className="w-full max-w-[430px] gap-4" isSwipeable={false} testID="home-guide-prompt-modal">
            <View className="items-center gap-4 py-2">
              <View className="h-16 w-16 items-center justify-center rounded-pill bg-brand-soft">
                <AppIcon name="guide" size={31} tone="brand" />
              </View>
              <View className="items-center gap-2">
                <Dialog.Title className="text-center">{t('home.guidePromptTitle')}</Dialog.Title>
                <Dialog.Description className="text-center">{t('home.guidePromptDescription')}</Dialog.Description>
              </View>
            </View>
            <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 active:opacity-70"
              onPress={() => setGuideConfirmationVisible(false)}>
              <AppText variant="label" tone="foreground">{t('home.guideLater')}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-control bg-brand px-4 active:opacity-75"
              onPress={startGuide}>
              <AppIcon name="guide" size={19} tone="onBrand" />
              <AppText variant="label" tone="onBrand">{t('home.guideStart')}</AppText>
            </Pressable>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <HomeSpotlightGuide
        description={guideStep === 2 ? t('home.guideNoCabinetDescription') : undefined}
        nextLabel={guideStep === 2 ? t('home.guideAddCabinetAction') : undefined}
        onBack={() => prepareGuideStep(guideStep - 1)}
        onClose={closeGuide}
        onNext={() => {
          if (guideStep === 1) {
            openCabinetGuide();
          } else if (guideStep === 2) {
            closeGuide();
            router.push('/(details)/scan' as Href);
          } else {
            prepareGuideStep(guideStep + 1);
          }
        }}
        placement={guideStep === 1 ? 'top' : 'auto'}
        rect={spotlightRect}
        step={guideStep}
        title={guideStep === 2 ? t('home.guideNoCabinetTitle') : undefined}
        total={GUIDE_STEPS}
        visible={guideVisible}
      />
    </SafeAreaView>
  );
}

function CabinetCard({ cabinet, sku }: { cabinet: Cabinet; sku?: ProductSku }) {
  const { t } = useTranslation();
  const { selectors } = useMockApp();
  const metrics = selectors.cabinetMetrics(cabinet.id);
  return (
    <Pressable className="flex-row items-center gap-4 rounded-card border border-line bg-surface p-3" onPress={() => router.push({ pathname: '/cabinets/[cabinetId]', params: { cabinetId: cabinet.id } } as Href)}>
      <View className="h-[88px] w-[88px] items-center justify-center rounded-[18px] bg-background">
        <ProductImage accessibilityLabel={sku?.name ?? cabinet.name} assetKey={sku?.imageAsset} variant="thumbnail" />
      </View>
      <View className="min-w-0 flex-1 gap-1.5">
        <AppText variant="caption" tone={cabinet.status === 'online' ? 'success' : 'muted'}>{t(`cabinet.status.${cabinet.status}`)}</AppText>
        <AppText variant="title" tone="foreground">{cabinet.name}</AppText>
        <AppText numberOfLines={1} variant="caption" tone="muted">{cabinet.location}</AppText>
        <AppText variant="caption" tone="content">{t('common.cabinetMeta', { slots: metrics.capacity, overdue: metrics.overdue, status: t(`cabinet.status.${cabinet.status}`) })}</AppText>
      </View>
      <AppIcon name="chevronRight" size={23} tone="muted" />
    </Pressable>
  );
}
