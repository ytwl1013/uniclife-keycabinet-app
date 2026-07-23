import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { ScrollableChipRow } from '@/components/ui/scrollable-chip-row';
import { PrototypeEventEmpty, PrototypeEventRow } from '@/features/cabinet-prototype/components/event-list';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { FilterChip, Notice, SectionCard, SectionTitle, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { CabinetEventKind } from '@/features/cabinet-prototype/types';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;
type KindFilter = CabinetEventKind | 'all' | 'borrowed';
type TimeFilter = 'all' | 'week' | 'month';

const kindFilters: KindFilter[] = ['all', 'borrowed', 'checkOut', 'return', 'keyUpdated', 'admin'];
const timeFilters: TimeFilter[] = ['all', 'week', 'month'];

export default function ActivityRoute() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const app = usePrototypeApp();
  const requestedFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const [kind, setKind] = useState<KindFilter>(requestedFilter === 'borrowed' ? 'borrowed' : 'all');
  const [actorId, setActorId] = useState('all');
  const [time, setTime] = useState<TimeFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const confirmation = usePrototypeDialog();

  const operators = useMemo(() => {
    const seen = new Set<string>();
    return app.events.filter((event) => {
      if (seen.has(event.actorUserId)) return false;
      seen.add(event.actorUserId);
      return true;
    }).map((event) => ({ id: event.actorUserId, name: event.actorName }));
  }, [app.events]);

  const events = useMemo(() => {
    const cutoff = new Date(app.now);
    if (time === 'week') cutoff.setDate(cutoff.getDate() - 7);
    if (time === 'month') cutoff.setDate(cutoff.getDate() - 30);
    return app.events.filter((event) => {
      if (actorId !== 'all' && event.actorUserId !== actorId) return false;
      if (time !== 'all' && new Date(event.createdAt) < cutoff) return false;
      if (kind === 'all') return true;
      if (kind === 'borrowed') return event.kind === 'checkOut' && app.keys.some((key) => key.id === event.keyId && key.activeLoan);
      if (kind === 'admin') return !['checkOut', 'return'].includes(event.kind);
      return event.kind === kind;
    });
  }, [actorId, app.events, app.keys, app.now, kind, time]);

  const borrowedKeys = app.keys.filter((key) => key.activeLoan);
  const activeFilters = [
    kind !== 'all' ? { id: 'kind', label: t(trKey(`activity.filter.${kind}`)), clear: () => setKind('all') } : null,
    actorId !== 'all' ? { id: 'actor', label: operators.find((item) => item.id === actorId)?.name ?? '', clear: () => setActorId('all') } : null,
    time !== 'all' ? { id: 'time', label: t(trKey(`activity.time.${time}`)), clear: () => setTime('all') } : null,
  ].filter((filter): filter is { id: string; label: string; clear: () => void } => Boolean(filter));

  const undo = async (eventId: string) => {
    const confirmed = await confirmation.present({
      title: t(trKey('activity.undoTitle')),
      description: t(trKey('activity.undoDescription')),
      confirmLabel: t(trKey('activity.confirmUndo')),
      cancelLabel: t(trKey('activity.cancel')),
    });
    if (!confirmed) return;
    try {
      await app.undoEvent({ eventId });
    } catch {
      await confirmation.present({
        title: t(trKey('activity.actionFailedTitle')),
        description: t(trKey('activity.actionFailedDescription')),
        confirmLabel: t(trKey('loan.done')),
        tone: 'danger',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
        <View className="flex-row items-center justify-between gap-3">
          <AppText className="flex-1" variant="title" tone="foreground">{t(trKey('activity.title'))}</AppText>
          <Pressable
            accessibilityLabel={t(trKey('activity.filtersTitle'))}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft active:opacity-70"
            onPress={() => setFiltersOpen(true)}>
            <AppIcon name="filter" size={23} tone="brand" />
          </Pressable>
        </View>
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1">
      <FlatList
        className="min-w-0 flex-1"
        contentContainerStyle={{ flexGrow: 1, padding: 20, rowGap: 12 }}
        contentInsetAdjustmentBehavior="automatic"
        data={app.isLoading ? [] : events}
        keyExtractor={(event) => event.id}
        ListEmptyComponent={app.isLoading ? (
          <StatePanel description={t(trKey('activity.loadingDescription'))} loading title={t(trKey('activity.loadingTitle'))} />
        ) : <PrototypeEventEmpty label={t(trKey('activity.emptyFiltered'))} />}
        ListHeaderComponent={(
          <View className="gap-section">
            {app.isOffline ? <Notice description={t(trKey('activity.offlineDescription'))} title={t(trKey('activity.offlineTitle'))} tone="warning" /> : null}

            <Pressable
              accessibilityRole="button"
              className={`flex-row items-center gap-3 rounded-card border px-4 py-3.5 active:opacity-70 ${kind === 'borrowed' ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}
              onPress={() => setKind(kind === 'borrowed' ? 'all' : 'borrowed')}>
              <View className="h-10 w-10 items-center justify-center rounded-pill bg-warning-soft">
                <AppIcon name="key" size={20} tone="warning" />
              </View>
              <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
                <AppText variant="title" tone="foreground">{borrowedKeys.length}</AppText>
                <AppText className="flex-1" variant="label" tone="foreground">{t(trKey('activity.borrowedSummary'))}</AppText>
              </View>
              <AppIcon name="chevronRight" size={21} tone="muted" />
            </Pressable>

            {activeFilters.length ? (
              <ScrollableChipRow
                getKey={(filter) => filter.id}
                items={activeFilters}
                renderItem={(filter) => <FilterChip label={filter.label} onPress={filter.clear} selected />}
              />
            ) : null}

            {!app.isLoading ? <SectionTitle description={t(trKey('activity.resultCount'), { count: events.length })} title={t(trKey('activity.timelineTitle'))} /> : null}
          </View>
        )}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        renderItem={({ index, item }) => (
          <SectionCard>
            <PrototypeEventRow
              currentUserId={app.currentUserId}
              event={item}
              isLast={index === events.length - 1}
              onUndo={(event) => void undo(event.id)}
            />
          </SectionCard>
        )}
        showsVerticalScrollIndicator={false}
      />
      </View>
      <BottomSheet
        closeLabel={t(trKey('common.done'))}
        onClose={() => setFiltersOpen(false)}
        title={t(trKey('activity.filtersTitle'))}
        visible={filtersOpen}>
        <View className="gap-3">
          <AppText variant="label" tone="foreground">{t(trKey('activity.filtersTitle'))}</AppText>
          <View className="flex-row flex-wrap gap-2">
            {kindFilters.map((item) => <FilterChip key={item} label={t(trKey(`activity.filter.${item}`))} onPress={() => setKind(item)} selected={kind === item} />)}
          </View>
        </View>
        <View className="gap-3">
          <AppText variant="label" tone="foreground">{t(trKey('activity.operatorFilter'))}</AppText>
          <View className="flex-row flex-wrap gap-2">
            <FilterChip label={t(trKey('activity.allOperators'))} onPress={() => setActorId('all')} selected={actorId === 'all'} />
            {operators.map((operator) => <FilterChip key={operator.id} label={operator.name} onPress={() => setActorId(operator.id)} selected={actorId === operator.id} />)}
          </View>
        </View>
        <View className="gap-3">
          <AppText variant="label" tone="foreground">{t(trKey('activity.timeFilter'))}</AppText>
          <View className="flex-row flex-wrap gap-2">
            {timeFilters.map((item) => <FilterChip key={item} label={t(trKey(`activity.time.${item}`))} onPress={() => setTime(item)} selected={time === item} />)}
          </View>
        </View>
      </BottomSheet>
      {confirmation.dialog}
    </SafeAreaView>
  );
}
