import { Href, router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { ProductImage } from '@/components/ui/product-image';
import { useTranslation } from '@/i18n';
import { Cabinet, Key, ProductSku, useMockApp } from '@/mocks';

export default function HomeRoute() {
  const { formatNumber, t } = useTranslation();
  const { currentUser, selectors, state } = useMockApp();
  const cabinets = selectors.cabinetsForCurrentUser();
  const metrics = cabinets.map((cabinet) => selectors.cabinetMetrics(cabinet.id));
  const totals = metrics.reduce(
    (summary, item) => ({ available: summary.available + item.available, overdue: summary.overdue + item.overdue }),
    { available: 0, overdue: 0 },
  );
  const borrowedKeys = selectors.borrowedKeys();
  const firstName = currentUser?.displayName.split(' ')[0] ?? currentUser?.email.split('@')[0] ?? '';

  if (!state.hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}>
          <View className="h-32 rounded-card bg-brand-soft" />
          <View className="h-24 rounded-card bg-surface" />
          <View className="h-56 rounded-card bg-surface" />
        </ScrollView>
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
            <AppText numberOfLines={1} variant="title" tone="foreground">
              {t('home.greeting', { name: firstName })}
            </AppText>
          </View>
          <Pressable
            accessibilityLabel={t('navigation.account')}
            className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft active:opacity-70"
            onPress={() => router.push('/(tabs)/account' as Href)}>
            <AppIcon name="person" size={25} tone="brand" />
          </Pressable>
        </View>
        </View>
      </View>

      <ScrollView
        className="min-w-0 flex-1"
        contentContainerClassName="mx-auto w-full max-w-content gap-6 px-screen pb-screen pt-screen"
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

      <View className="flex-row gap-2.5">
        <SummaryCard icon="cabinet" label={t('home.summaryCabinets')} value={formatNumber(cabinets.length)} />
        <SummaryCard icon="key" label={t('home.summaryAvailable')} value={formatNumber(totals.available)} />
        <SummaryCard icon="error" label={t('home.summaryOverdue')} tone={totals.overdue ? 'danger' : 'brand'} value={formatNumber(totals.overdue)} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-end justify-between gap-4 px-1">
          <View className="min-w-0 flex-1 gap-1">
            <AppText variant="title" tone="foreground">{t('home.activeLoansTitle')}</AppText>
            <AppText variant="caption" tone="muted">{t('home.activeLoansDescription', { count: borrowedKeys.length })}</AppText>
          </View>
          {borrowedKeys.length ? (
            <Pressable accessibilityRole="button" className="px-2 py-2" onPress={() => router.push({ pathname: '/(tabs)/activity', params: { filter: 'borrowed' } } as Href)}>
              <AppText variant="label" tone="brand">{t('home.viewAll')}</AppText>
            </Pressable>
          ) : null}
        </View>
        {borrowedKeys.length ? borrowedKeys.slice(0, 2).map((key) => (
          <BorrowedKeyRow key={key.id} item={key} />
        )) : (
          <View className="flex-row items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
            <View className="h-10 w-10 items-center justify-center rounded-pill bg-success-soft">
              <AppIcon name="key" size={20} tone="success" />
            </View>
            <AppText className="flex-1" variant="label" tone="content">{t('loan.noneDescription')}</AppText>
          </View>
        )}
      </View>

      <View className="gap-3">
        <View className="flex-row items-end justify-between gap-4 px-1">
          <View className="flex-1 gap-1">
            <AppText variant="title" tone="foreground">{t('home.cabinetsTitle')}</AppText>
          </View>
          <Pressable accessibilityRole="button" className="rounded-control px-2 py-2" onPress={() => router.push('/(tabs)/cabinets' as Href)}>
            <AppText variant="label" tone="brand">{t('home.viewAll')}</AppText>
          </Pressable>
        </View>

        {cabinets.length ? cabinets.slice(0, 2).map((cabinet) => (
          <CabinetCard cabinet={cabinet} key={cabinet.id} sku={selectors.skuById(cabinet.skuId)} />
        )) : (
          <View className="items-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-9">
            <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand-soft"><AppIcon name="scan" size={28} tone="brand" /></View>
            <AppText className="text-center" variant="title" tone="foreground">{t('home.noCabinetsTitle')}</AppText>
            <AppText className="max-w-sm text-center" tone="muted">{t('home.noCabinetsDescription')}</AppText>
            <Pressable className="min-h-11 items-center justify-center rounded-control bg-brand px-5" onPress={() => router.push('/(tabs)/scan' as Href)}>
              <AppText variant="label" tone="onBrand">{t('home.startScan')}</AppText>
            </Pressable>
          </View>
        )}
      </View>

      <View className="gap-3">
        <AppText className="px-1" variant="title" tone="foreground">{t('home.quickActionsTitle')}</AppText>
        <View className="flex-row flex-wrap gap-3">
          <QuickAction icon="scan" label={t('home.scanKey')} onPress={() => router.push('/(tabs)/scan' as Href)} />
          <QuickAction icon="return" label={t('home.returnKey')} onPress={() => router.push({ pathname: '/(tabs)/activity', params: { filter: 'borrowed' } } as Href)} />
          <QuickAction icon="authorize" label={t('home.authorize')} onPress={() => router.push('/(tabs)/cabinets' as Href)} />
          <QuickAction icon="audit" label={t('home.audit')} onPress={() => router.push('/(tabs)/activity' as Href)} />
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CabinetCard({ cabinet, sku }: { cabinet: Cabinet; sku?: ProductSku }) {
  const { t } = useTranslation();
  const { selectors } = useMockApp();
  const metrics = selectors.cabinetMetrics(cabinet.id);

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-4 overflow-hidden rounded-card border border-line bg-surface p-3 active:opacity-75"
      onPress={() => router.push({ pathname: '/cabinets/[cabinetId]', params: { cabinetId: cabinet.id } } as Href)}>
      <View className="h-[88px] w-[88px] items-center justify-center rounded-[18px] bg-background">
        <ProductImage accessibilityLabel={sku?.name ?? cabinet.name} assetKey={sku?.imageAsset} variant="thumbnail" />
      </View>
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center gap-2">
          <View className={`h-2 w-2 rounded-pill ${cabinet.status === 'online' ? 'bg-success' : cabinet.status === 'maintenance' ? 'bg-warning' : 'bg-muted'}`} />
          <AppText variant="caption" tone={cabinet.status === 'online' ? 'success' : cabinet.status === 'maintenance' ? 'warning' : 'muted'}>{t(`cabinet.status.${cabinet.status}`)}</AppText>
        </View>
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

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 active:opacity-70"
      onPress={() => router.push({ pathname: '/cabinets/[cabinetId]/keys/[keyId]', params: { cabinetId: item.cabinetId, keyId: item.id } } as Href)}>
      <View className="h-10 w-10 items-center justify-center rounded-pill bg-warning-soft">
        <AppIcon name="key" size={20} tone="warning" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <AppText numberOfLines={1} variant="label" tone="foreground">{item.name}</AppText>
        <AppText numberOfLines={1} variant="caption" tone="muted">
          {loan ? t('home.loanDue', { cabinet: cabinet?.name ?? '', date: formatDateTime(loan.expectedReturnAt) }) : cabinet?.name}
        </AppText>
      </View>
      <AppIcon name="chevronRight" size={21} tone="muted" />
    </Pressable>
  );
}

function SummaryCard({ icon, label, tone = 'brand', value }: { icon: AppIconName; label: string; tone?: 'brand' | 'danger'; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-card border border-line bg-surface p-3 shadow-card">
      <AppIcon name={icon} size={22} tone={tone} />
      <AppText variant="metric" tone="foreground">{value}</AppText>
      <AppText className="text-center" variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: AppIconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" className="w-[48%] flex-grow flex-row items-center gap-3 rounded-card border border-line bg-surface p-4 active:opacity-70" onPress={onPress}>
      <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand-soft"><AppIcon name={icon} size={21} tone="brand" /></View>
      <AppText className="flex-1" variant="label" tone="foreground">{label}</AppText>
    </Pressable>
  );
}
