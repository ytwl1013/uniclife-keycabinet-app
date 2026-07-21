import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon, AppIconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { SearchBox } from '@/components/ui/search-box';
import { useTranslation } from '@/i18n';

const summary = [
  { labelKey: 'home.summaryCabinets', value: 3, icon: 'cabinet' },
  { labelKey: 'home.summaryAvailable', value: 90, icon: 'key' },
  { labelKey: 'home.summaryOverdue', value: 10, icon: 'error' },
] as const satisfies readonly { labelKey: 'home.summaryCabinets' | 'home.summaryAvailable' | 'home.summaryOverdue'; value: number; icon: AppIconName }[];

const quickActions = [
  { labelKey: 'home.scanKey', icon: 'scan' },
  { labelKey: 'home.returnKey', icon: 'return' },
  { labelKey: 'home.authorize', icon: 'authorize' },
  { labelKey: 'home.audit', icon: 'audit' },
] as const satisfies readonly { labelKey: 'home.scanKey' | 'home.returnKey' | 'home.authorize' | 'home.audit'; icon: AppIconName }[];

export default function HomeRoute() {
  const { formatNumber, t } = useTranslation();

  return (
    <AppScreen>
      <View className="flex-row items-center justify-between">
        <View>
          <AppText variant="label" tone="brand">{t('common.brandName')}</AppText>
          <AppText variant="display" tone="foreground">{t('common.appName')}</AppText>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft">
          <AppIcon name="person" size={28} tone="brand" />
        </View>
      </View>

      <SearchBox placeholder={t('home.searchPlaceholder')} />

      <View className="flex-row gap-2.5">
        {summary.map((item) => (
          <SummaryCard icon={item.icon} key={item.labelKey} label={t(item.labelKey)} value={formatNumber(item.value)} />
        ))}
      </View>

      <View className="flex-row items-center gap-3.5 rounded-card border border-line bg-surface p-card shadow-card">
        <View className="h-[60px] w-[60px] items-center justify-center rounded-pill bg-brand">
          <AppIcon name="cabinet" size={34} tone="onBrand" />
        </View>
        <View className="flex-1 gap-1">
          <AppText variant="title" tone="foreground">{t('demo.cabinets.mainOffice')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('common.cabinetMeta', { slots: 60, overdue: 3, status: t('common.online') })}
          </AppText>
        </View>
        <Link asChild href={{ pathname: '/cabinets/[cabinetId]', params: { cabinetId: 'main-office' } }}>
          <Pressable accessibilityLabel={t('navigation.cabinets')} className="h-11 w-11 items-center justify-center rounded-pill bg-brand active:opacity-70">
            <AppIcon name="arrowForward" size={22} tone="onBrand" />
          </Pressable>
        </Link>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {quickActions.map((action) => <QuickAction icon={action.icon} key={action.labelKey} label={t(action.labelKey)} />)}
      </View>
    </AppScreen>
  );
}

function SummaryCard({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-card border border-line bg-surface p-3.5 shadow-card">
      <AppIcon name={icon} size={25} tone="brand" />
      <AppText variant="metric" tone="foreground">{value}</AppText>
      <AppText className="text-center" variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}

function QuickAction({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <Pressable accessibilityLabel={label} className="w-[48%] items-center gap-2 rounded-card border border-line bg-surface p-card active:opacity-70">
      <AppIcon name={icon} size={27} tone="brand" />
      <AppText variant="label" tone="foreground">{label}</AppText>
    </Pressable>
  );
}
