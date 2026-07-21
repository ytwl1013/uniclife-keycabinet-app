import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { PrototypeEventList } from '@/features/cabinet-prototype/components/event-list';
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
  const app = usePrototypeApp();
  const [kind, setKind] = useState<KindFilter>('all');
  const [actorId, setActorId] = useState('all');
  const [time, setTime] = useState<TimeFilter>('all');
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
    <AppScreen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="display" tone="foreground">{t(trKey('activity.title'))}</AppText>
          <AppText variant="body" tone="muted">{t(trKey('activity.subtitle'))}</AppText>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft">
          <AppIcon name="activity" size={25} tone="brand" />
        </View>
      </View>

      {app.isOffline ? <Notice description={t(trKey('activity.offlineDescription'))} title={t(trKey('activity.offlineTitle'))} tone="warning" /> : null}

      {borrowedKeys.length ? (
        <SectionCard>
          <SectionTitle description={t(trKey('activity.borrowedSummaryDescription'))} title={t(trKey('activity.borrowedSummary'), { count: borrowedKeys.length })} />
          <View className="gap-2">
            {borrowedKeys.map((key) => (
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-control bg-background px-3.5 py-3 active:opacity-70"
                key={key.id}
                onPress={() => router.push({ pathname: '/cabinets/[cabinetId]/keys/[keyId]', params: { cabinetId: key.cabinetId, keyId: key.id } } as never)}>
                <AppIcon name="key" size={20} tone={key.status === 'overdue' ? 'danger' : 'warning'} />
                <View className="min-w-0 flex-1">
                  <AppText numberOfLines={1} variant="label" tone="foreground">{key.name}</AppText>
                  <AppText numberOfLines={1} variant="caption" tone="muted">{key.activeLoan?.borrowerName}</AppText>
                </View>
                <AppIcon name="chevronRight" size={21} tone="muted" />
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard>
        <SectionTitle description={t(trKey('activity.filtersDescription'))} title={t(trKey('activity.filtersTitle'))} />
        <View className="flex-row flex-wrap gap-2">
          {kindFilters.map((item) => <FilterChip key={item} label={t(trKey(`activity.filter.${item}`))} onPress={() => setKind(item)} selected={kind === item} />)}
        </View>
        <AppText variant="label" tone="foreground">{t(trKey('activity.operatorFilter'))}</AppText>
        <View className="flex-row flex-wrap gap-2">
          <FilterChip label={t(trKey('activity.allOperators'))} onPress={() => setActorId('all')} selected={actorId === 'all'} />
          {operators.map((operator) => <FilterChip key={operator.id} label={operator.name} onPress={() => setActorId(operator.id)} selected={actorId === operator.id} />)}
        </View>
        <AppText variant="label" tone="foreground">{t(trKey('activity.timeFilter'))}</AppText>
        <View className="flex-row flex-wrap gap-2">
          {timeFilters.map((item) => <FilterChip key={item} label={t(trKey(`activity.time.${item}`))} onPress={() => setTime(item)} selected={time === item} />)}
        </View>
      </SectionCard>

      {app.isLoading ? (
        <StatePanel description={t(trKey('activity.loadingDescription'))} loading title={t(trKey('activity.loadingTitle'))} />
      ) : (
        <SectionCard>
          <SectionTitle description={t(trKey('activity.resultCount'), { count: events.length })} title={t(trKey('activity.timelineTitle'))} />
          <PrototypeEventList currentUserId={app.currentUserId} emptyLabel={t(trKey('activity.emptyFiltered'))} events={events} onUndo={(event) => void undo(event.id)} />
        </SectionCard>
      )}
      {confirmation.dialog}
    </AppScreen>
  );
}
