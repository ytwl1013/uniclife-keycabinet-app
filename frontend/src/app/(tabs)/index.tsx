import { Href, router } from 'expo-router';
import { Ref, useMemo, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, Linking, Pressable, ScrollView, View } from 'react-native';

import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { ProductImage } from '@/components/ui/product-image';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { SearchInput } from '@/features/cabinet-prototype/components/prototype-ui';
import { HomeSpotlightGuide, SpotlightRect } from '@/features/home/components/home-spotlight-guide';
import { useTranslation } from '@/i18n';
import { Cabinet, Key, ProductSku, useMockApp } from '@/mocks';

const GUIDE_STEPS = 5;

export default function HomeRoute() {
  const { t } = useTranslation();
  const { currentUser, selectors, state } = useMockApp();
  const cabinets = selectors.cabinetsForCurrentUser();
  const borrowedKeys = selectors.borrowedKeys();
  const [query, setQuery] = useState('');
  const [guideStep, setGuideStep] = useState(0);
  const [guideVisible, setGuideVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect>();
  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = [
    useRef<View>(null),
    useRef<View>(null),
    useRef<View>(null),
    useRef<View>(null),
    useRef<View>(null),
  ];
  const sectionY = useRef<number[]>([]);
  const firstName = currentUser?.displayName.split(' ')[0] ?? '';
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCabinets = useMemo(
    () => cabinets.filter((cabinet) => {
      if (!normalizedQuery) return true;
      const sku = selectors.skuById(cabinet.skuId);
      return [cabinet.name, cabinet.location, sku?.sku, sku?.model]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    }),
    [cabinets, normalizedQuery, selectors],
  );

  const measureStep = (step: number) => {
    sectionRefs[step].current?.measureInWindow((x, y, width, height) => {
      setSpotlightRect({ x, y, width, height });
    });
  };
  const showGuideStep = (step: number) => {
    setGuideStep(step);
    scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, (sectionY.current[step] ?? 0) - 12) });
    setTimeout(() => measureStep(step), 260);
  };
  const openGuide = () => {
    setGuideVisible(true);
    showGuideStep(0);
  };
  const closeGuide = () => {
    setGuideVisible(false);
    setSpotlightRect(undefined);
  };
  const contactSupport = async () => {
    const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
    if (!email) {
      Alert.alert(t('home.supportUnavailableTitle'), t('home.supportUnavailableDescription'));
      return;
    }
    const url = `mailto:${email}?subject=${encodeURIComponent(t('home.supportEmailSubject'))}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('home.supportUnavailableTitle'), t('home.supportOpenFailed'));
    }
  };
  const sectionLayout = (...indices: number[]) => (event: LayoutChangeEvent) => {
    for (const index of indices) {
      sectionY.current[index] = event.nativeEvent.layout.y;
    }
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
          <View className="flex-row items-center gap-4">
            <View className="min-w-0 flex-1 gap-1">
              <AppText variant="caption" tone="brand">{t('home.eyebrow')}</AppText>
              <AppText numberOfLines={1} variant="title" tone="foreground">{t('home.greeting', { name: firstName })}</AppText>
            </View>
            <Pressable accessibilityLabel={t('navigation.account')} className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft" onPress={() => router.push('/(tabs)/account' as Href)}>
              <AppIcon name="person" size={25} tone="brand" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        className="min-w-0 flex-1"
        contentContainerClassName="mx-auto w-full max-w-content gap-6 px-screen pb-screen pt-screen"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}>
        <View collapsable={false} onLayout={sectionLayout(0)} ref={sectionRefs[0]}>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-4 rounded-card bg-brand p-5 shadow-card active:opacity-80"
            onPress={() => router.push('/(details)/scan' as Href)}
            testID="home-primary-scan">
            <View className="h-14 w-14 items-center justify-center rounded-pill bg-on-brand/15"><AppIcon name="scan" size={29} tone="onBrand" /></View>
            <View className="min-w-0 flex-1 gap-1">
              <AppText variant="title" tone="onBrand">{t('home.scanTitle')}</AppText>
              <AppText variant="caption" tone="onBrand">{t('home.scanDescription')}</AppText>
            </View>
            <AppIcon name="chevronRight" size={23} tone="onBrand" />
          </Pressable>
        </View>

        <View className="gap-3" collapsable={false} onLayout={sectionLayout(2)} ref={sectionRefs[2]}>
          <View className="gap-1 px-1">
            <AppText variant="title" tone="foreground">{t('home.activeLoansTitle')}</AppText>
            <AppText variant="caption" tone="muted">{t('home.activeLoansDescription', { count: borrowedKeys.length })}</AppText>
          </View>
          {borrowedKeys.length ? borrowedKeys.map((key) => (
            <BorrowedKeyRow key={key.id} item={key} />
          )) : (
            <View className="flex-row items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
              <AppIcon name="key" size={20} tone="success" />
              <AppText className="flex-1" variant="label" tone="content">{t('loan.noneDescription')}</AppText>
            </View>
          )}
        </View>

        <View className="gap-3" collapsable={false} onLayout={sectionLayout(1)} ref={sectionRefs[1]}>
          <AppText className="px-1" variant="title" tone="foreground">{t('home.cabinetsTitle')}</AppText>
          {cabinets.length > 1 ? <SearchInput onChangeText={setQuery} placeholder={t('cabinet.searchPlaceholder')} value={query} /> : null}
          {filteredCabinets.length ? filteredCabinets.map((cabinet) => (
            <CabinetCard cabinet={cabinet} key={cabinet.id} sku={selectors.skuById(cabinet.skuId)} />
          )) : (
            <View className="items-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-8">
              <AppIcon name="cabinet" size={28} tone="brand" />
              <AppText className="text-center" variant="label" tone="muted">{t(query ? 'cabinet.noSearchDescription' : 'home.noCabinetsDescription')}</AppText>
            </View>
          )}
        </View>

        <View className="gap-3" collapsable={false} onLayout={sectionLayout(3, 4)} ref={sectionRefs[4]}>
          <AppText className="px-1" variant="title" tone="foreground">{t('home.quickActionsTitle')}</AppText>
          <View className="flex-row flex-wrap gap-3">
            <QuickAction icon="return" label={t('home.returnKey')} onPress={() => router.push({ pathname: '/(tabs)/activity', params: { filter: 'borrowed' } } as Href)} />
            <QuickAction containerRef={sectionRefs[3]} icon="audit" label={t('home.audit')} onPress={() => router.push('/(tabs)/activity' as Href)} />
            <QuickAction icon="notification" label={t('home.contactSupport')} onPress={() => void contactSupport()} />
            <QuickAction icon="settings" label={t('home.userGuide')} onPress={openGuide} />
          </View>
        </View>
      </ScrollView>

      <HomeSpotlightGuide
        onBack={() => showGuideStep(guideStep - 1)}
        onClose={closeGuide}
        onNext={() => guideStep === GUIDE_STEPS - 1 ? closeGuide() : showGuideStep(guideStep + 1)}
        rect={spotlightRect}
        step={guideStep}
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

function BorrowedKeyRow({ item }: { item: Key }) {
  const { formatDateTime, t } = useTranslation();
  const { state } = useMockApp();
  const loan = state.loans.find((candidate) => candidate.keyId === item.id && candidate.status === 'active');
  const cabinet = state.cabinets.find((candidate) => candidate.id === item.cabinetId);
  const detail = loan?.expectedReturnAt
    ? t('home.loanDue', { cabinet: cabinet?.name ?? '', date: formatDateTime(loan.expectedReturnAt) })
    : t('home.loanNoDue', { cabinet: cabinet?.name ?? '' });
  return (
    <Pressable className="flex-row items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5" onPress={() => router.push({ pathname: '/cabinets/[cabinetId]/keys/[keyId]', params: { cabinetId: item.cabinetId, keyId: item.id } } as Href)}>
      <View className="h-10 w-10 items-center justify-center rounded-pill bg-warning-soft"><AppIcon name="key" size={20} tone="warning" /></View>
      <View className="min-w-0 flex-1 gap-0.5">
        <AppText numberOfLines={1} variant="label" tone="foreground">{item.name}</AppText>
        <AppText numberOfLines={1} variant="caption" tone="muted">{detail}</AppText>
      </View>
      <AppIcon name="chevronRight" size={21} tone="muted" />
    </Pressable>
  );
}

function QuickAction({ containerRef, icon, label, onPress }: { containerRef?: Ref<View>; icon: AppIconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" className="w-[48%] flex-grow flex-row items-center gap-3 rounded-card border border-line bg-surface p-4" collapsable={false} onPress={onPress} ref={containerRef}>
      <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand-soft"><AppIcon name={icon} size={21} tone="brand" /></View>
      <AppText className="flex-1" variant="label" tone="foreground">{label}</AppText>
    </Pressable>
  );
}
