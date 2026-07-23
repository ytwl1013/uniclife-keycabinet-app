import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
        <View className="gap-0.5">
          <AppText variant="title" tone="foreground">{t(trKey('cabinet.listTitle'))}</AppText>
          <AppText variant="caption" tone="muted">{t(trKey('cabinet.listSubtitle'), { count: app.cabinets.length })}</AppText>
        </View>
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1">
      <FlatList
        className="min-w-0 flex-1"
        contentContainerStyle={{ flexGrow: 1, padding: 20, rowGap: 12 }}
        contentInsetAdjustmentBehavior="automatic"
        data={app.isLoading ? [] : cabinets}
        keyExtractor={(cabinet) => cabinet.id}
        ListHeaderComponent={(
          <View className="gap-section">
            {app.isOffline ? <Notice description={t(trKey('cabinet.offlineDescription'))} title={t(trKey('cabinet.offlineTitle'))} tone="warning" /> : null}
            {app.sessionExpired ? <Notice description={t(trKey('cabinet.sessionExpiredDescription'))} title={t(trKey('cabinet.sessionExpiredTitle'))} tone="danger" /> : null}
            <SearchInput onChangeText={setQuery} placeholder={t(trKey('cabinet.searchPlaceholder'))} value={query} />
            {!app.isLoading && cabinets.length ? <AppText variant="label" tone="muted">{t(trKey('cabinet.resultCount'), { count: cabinets.length })}</AppText> : null}
          </View>
        )}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        ListEmptyComponent={app.isLoading ? (
          <StatePanel description={t(trKey('cabinet.loadingDescription'))} loading title={t(trKey('cabinet.loadingTitle'))} />
        ) : (
          <StatePanel
            action={<ActionButton icon="scan" label={t(trKey('cabinet.bindFirst'))} onPress={() => router.push('/(tabs)/scan')} />}
            description={query ? t(trKey('cabinet.noSearchDescription')) : t(trKey('cabinet.emptyDescription'))}
            icon="cabinet"
            title={query ? t(trKey('cabinet.noSearchTitle')) : t(trKey('cabinet.emptyTitle'))}
          />
        )}
        renderItem={({ item }) => <PrototypeCabinetCard cabinet={item} />}
        showsVerticalScrollIndicator={false}
      />
      </View>
    </SafeAreaView>
  );
}
