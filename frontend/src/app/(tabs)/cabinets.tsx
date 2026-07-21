import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { PrototypeCabinetCard } from '@/features/cabinet-prototype/components/cabinet-card';
import { ActionButton, Notice, SearchInput, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;

export default function CabinetsRoute() {
  const { t } = useTranslation();
  const app = usePrototypeApp();
  const [query, setQuery] = useState('');

  const cabinets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return app.cabinets;
    return app.cabinets.filter((cabinet) => [cabinet.name, cabinet.location, cabinet.skuCode, cabinet.model, cabinet.color]
      .some((value) => value.toLocaleLowerCase().includes(normalized)));
  }, [app.cabinets, query]);

  return (
    <AppScreen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="display" tone="foreground">{t(trKey('cabinet.listTitle'))}</AppText>
          <AppText variant="body" tone="muted">{t(trKey('cabinet.listSubtitle'), { count: app.cabinets.length })}</AppText>
        </View>
        <Pressable
          accessibilityLabel={t(trKey('cabinet.notifications'))}
          className="h-12 w-12 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70">
          <AppIcon name="notification" size={25} tone="foreground" />
        </Pressable>
      </View>

      {app.isOffline ? <Notice description={t(trKey('cabinet.offlineDescription'))} title={t(trKey('cabinet.offlineTitle'))} tone="warning" /> : null}
      {app.sessionExpired ? <Notice description={t(trKey('cabinet.sessionExpiredDescription'))} title={t(trKey('cabinet.sessionExpiredTitle'))} tone="danger" /> : null}

      <View className="flex-row gap-2.5">
        <SearchInput onChangeText={setQuery} placeholder={t(trKey('cabinet.searchPlaceholder'))} value={query} />
        <ActionButton compact icon="scan" label={t(trKey('cabinet.scanToAdd'))} onPress={() => router.push('/(tabs)/scan')} />
      </View>

      {app.isLoading ? (
        <StatePanel description={t(trKey('cabinet.loadingDescription'))} loading title={t(trKey('cabinet.loadingTitle'))} />
      ) : cabinets.length ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <AppText variant="label" tone="muted">{t(trKey('cabinet.resultCount'), { count: cabinets.length })}</AppText>
            <AppText variant="caption" tone="muted">{t(trKey('cabinet.syncedDemo'))}</AppText>
          </View>
          {cabinets.map((cabinet) => <PrototypeCabinetCard cabinet={cabinet} key={cabinet.id} />)}
        </View>
      ) : (
        <StatePanel
          action={<ActionButton icon="scan" label={t(trKey('cabinet.bindFirst'))} onPress={() => router.push('/(tabs)/scan')} />}
          description={query ? t(trKey('cabinet.noSearchDescription')) : t(trKey('cabinet.emptyDescription'))}
          icon="cabinet"
          title={query ? t(trKey('cabinet.noSearchTitle')) : t(trKey('cabinet.emptyTitle'))}
        />
      )}

      <Notice description={t(trKey('cabinet.syncNoticeDescription'))} title={t(trKey('cabinet.syncNoticeTitle'))} />
    </AppScreen>
  );
}
