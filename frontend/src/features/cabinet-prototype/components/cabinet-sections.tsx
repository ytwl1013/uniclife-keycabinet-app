import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, ScrollView, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { ProductImage } from '@/components/ui/product-image';
import { ScrollableChipRow } from '@/components/ui/scrollable-chip-row';
import { TranslationKey, useTranslation } from '@/i18n';

import { CabinetEventKind, CabinetView, PrototypeApp } from '../types';
import { PrototypeEventEmpty, PrototypeEventList, PrototypeEventRow } from './event-list';
import { PrototypeKeySlotGrid } from './key-slot-grid';
import { usePrototypeDialog } from './prototype-dialog';
import { ActionButton, FilterChip, FormField, InlineButton, SearchInput, SectionCard, SectionTitle, Stat, StatePanel } from './prototype-ui';

const trKey = (key: string) => key as TranslationKey;

export function CabinetOverview({ app, cabinet }: { app: PrototypeApp; cabinet: CabinetView }) {
  const { locale, t } = useTranslation();
  const [showProductInfo, setShowProductInfo] = useState(false);
  const cabinetKeys = app.keys.filter((key) => key.cabinetId === cabinet.id);
  const activeLoans = cabinetKeys.filter((key) => key.activeLoan);
  const latestEvents = app.events.filter((event) => event.cabinetId === cabinet.id).slice(0, 3);
  const statusTone: PillTone = cabinet.status === 'online' ? 'green' : cabinet.status === 'maintenance' ? 'orange' : 'gray';

  return (
    <ScrollView
      className="min-w-0 flex-1"
      contentContainerClassName="gap-section px-screen py-screen pb-screen"
      showsVerticalScrollIndicator={false}>
      <SectionCard className="overflow-hidden">
        <View className="items-center gap-2 rounded-card bg-background py-2">
          <ProductImage
            accessibilityLabel={`${cabinet.model} ${cabinet.color}`}
            assetKey={cabinet.imageAsset}
            variant="detail"
          />
        </View>
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <AppText variant="title" tone="foreground">{cabinet.model}</AppText>
            <AppText variant="caption" tone="muted">{cabinet.skuCode} · {cabinet.color}</AppText>
          </View>
          <View className="items-end gap-2">
            <Pill tone={statusTone}>{t(trKey(`cabinet.status.${cabinet.status}`))}</Pill>
            <Pill tone="purple">{t(trKey(`cabinet.role.${cabinet.role}`))}</Pill>
          </View>
        </View>
        <View className="flex-row gap-2 border-t border-line pt-3.5">
          <Stat label={t(trKey('cabinet.available'))} tone="success" value={cabinet.availableCount} />
          <Stat label={t(trKey('cabinet.checkedOut'))} tone="warning" value={cabinet.checkedOutCount} />
          <Stat label={t(trKey('cabinet.overdue'))} tone="danger" value={cabinet.overdueCount} />
        </View>
      </SectionCard>

      <SectionCard>
        <SectionTitle title={t(trKey('activity.borrowedSummary'), { count: activeLoans.length })} />
        {activeLoans.length ? activeLoans.map((key) => (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-control bg-background p-3.5 active:opacity-70"
            key={key.id}
            onPress={() => router.push({ pathname: '/cabinets/[cabinetId]/keys/[keyId]', params: { cabinetId: cabinet.id, keyId: key.id } } as never)}>
            <View className={`h-10 w-10 items-center justify-center rounded-pill ${key.status === 'overdue' ? 'bg-danger-soft' : 'bg-warning-soft'}`}>
              <AppIcon name="key" size={20} tone={key.status === 'overdue' ? 'danger' : 'warning'} />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <AppText numberOfLines={1} variant="label" tone="foreground">{key.name}</AppText>
              <AppText numberOfLines={1} variant="caption" tone="muted">{t(trKey('loan.borrowedBy'), { name: key.activeLoan?.borrowerName })}</AppText>
            </View>
            <AppIcon name="chevronRight" size={22} tone="muted" />
          </Pressable>
        )) : (
          <View className="flex-row items-center gap-3 rounded-control bg-success-soft px-3.5 py-3">
            <AppIcon name="key" size={20} tone="success" />
            <AppText className="flex-1" variant="label" tone="content">{t(trKey('loan.noneDescription'))}</AppText>
          </View>
        )}
      </SectionCard>

      <SectionCard>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showProductInfo }}
          className="flex-row items-center gap-3 active:opacity-70"
          onPress={() => setShowProductInfo((value) => !value)}>
          <View className="min-w-0 flex-1">
            <AppText variant="title" tone="foreground">{t(trKey('cabinet.productTitle'))}</AppText>
            <AppText variant="caption" tone="muted">{t(trKey('cabinet.lastSynced'), { time: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(cabinet.lastSyncedAt)) })}</AppText>
          </View>
          <View style={{ transform: [{ rotate: showProductInfo ? '180deg' : '0deg' }] }}>
            <AppIcon name="chevronDown" size={22} tone="muted" />
          </View>
        </Pressable>
        {showProductInfo ? (
          <View className="gap-2 pt-1">
            <View className="flex-row gap-2">
              <DataRow label={t(trKey('cabinet.sku'))} value={cabinet.skuCode} />
              <DataRow label={t(trKey('cabinet.capacity'))} value={t(trKey('cabinet.capacityValue'), { count: cabinet.capacity })} />
            </View>
            <View className="flex-row gap-2">
              <DataRow label={t(trKey('cabinet.color'))} value={cabinet.color} />
              <DataRow label={t(trKey('cabinet.timezone'))} value={cabinet.timezone} />
            </View>
            {cabinet.manualUrl ? (
              <ActionButton icon="download" label={t(trKey('cabinet.openManual'))} onPress={() => void Linking.openURL(cabinet.manualUrl!)} tone="neutral" />
            ) : null}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionTitle description={t(trKey('activity.latestDescription'))} title={t(trKey('activity.latestTitle'))} />
        <PrototypeEventList emptyLabel={t(trKey('activity.empty'))} events={latestEvents} />
      </SectionCard>
    </ScrollView>
  );
}

export function CabinetKeys({ app, cabinet }: { app: PrototypeApp; cabinet: CabinetView }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'available' | 'checkedOut' | 'overdue' | 'empty'>('all');
  const cabinetSlots = app.slots.filter((slot) => slot.cabinetId === cabinet.id);
  const slots = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return cabinetSlots.filter((slot) => {
      if (status !== 'all' && slot.status !== status) return false;
      if (!normalized) return true;
      return slot.keyName?.toLocaleLowerCase().includes(normalized) || String(slot.number).includes(normalized);
    });
  }, [cabinetSlots, query, status]);

  const statuses = ['all', 'available', 'checkedOut', 'overdue', 'empty'] as const;

  return (
    <PrototypeKeySlotGrid
      cabinetId={cabinet.id}
      empty={<StatePanel description={t(trKey('key.noResultDescription'))} icon="key" title={t(trKey('key.noResultTitle'))} />}
      header={(
        <View className="gap-section">
          <View className="min-w-0 gap-3">
            <SearchInput onChangeText={setQuery} placeholder={t(trKey('key.searchPlaceholder'))} value={query} />
            <ScrollableChipRow
              items={statuses}
              renderItem={(value) => (
                <FilterChip label={t(trKey(`key.filter.${value}`))} onPress={() => setStatus(value)} selected={status === value} />
              )}
              selectedValue={status}
              testID="key-filter-scroll"
            />
          </View>
          <SectionTitle description={t(trKey('key.slotCount'), { count: slots.length })} title={t(trKey('key.gridTitle'))} />
        </View>
      )}
      slots={slots}
    />
  );
}

export function CabinetActivity({ app, cabinet }: { app: PrototypeApp; cabinet: CabinetView }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<'all' | CabinetEventKind | 'admin'>('all');
  const [time, setTime] = useState<'all' | 'week' | 'month'>('all');
  const [actorId, setActorId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cabinetEvents = app.events.filter((event) => event.cabinetId === cabinet.id);
  const operators = useMemo(() => {
    const seen = new Set<string>();
    return cabinetEvents.filter((event) => {
      if (seen.has(event.actorUserId)) return false;
      seen.add(event.actorUserId);
      return true;
    }).map((event) => ({ id: event.actorUserId, name: event.actorName }));
  }, [cabinetEvents]);
  const events = useMemo(() => {
    const cutoff = new Date(app.now);
    if (time === 'week') cutoff.setDate(cutoff.getDate() - 7);
    if (time === 'month') cutoff.setDate(cutoff.getDate() - 30);
    return cabinetEvents.filter((event) => {
      if (actorId !== 'all' && event.actorUserId !== actorId) return false;
      if (time !== 'all' && new Date(event.createdAt) < cutoff) return false;
      if (kind === 'all') return true;
      if (kind === 'admin') return !['checkOut', 'return'].includes(event.kind);
      return event.kind === kind;
    });
  }, [actorId, app.now, cabinetEvents, kind, time]);
  const activeFilters = [
    kind !== 'all' ? { id: 'kind', label: t(trKey(`activity.filter.${kind}`)), clear: () => setKind('all') } : null,
    actorId !== 'all' ? { id: 'actor', label: operators.find((operator) => operator.id === actorId)?.name ?? actorId, clear: () => setActorId('all') } : null,
    time !== 'all' ? { id: 'time', label: t(trKey(`activity.time.${time}`)), clear: () => setTime('all') } : null,
  ].filter((filter): filter is { id: string; label: string; clear: () => void } => Boolean(filter));

  return (
    <View className="min-w-0 flex-1">
      <FlatList
        className="min-w-0 flex-1"
        contentContainerStyle={{ flexGrow: 1, padding: 20, rowGap: 12 }}
        data={events}
        keyExtractor={(event) => event.id}
        ListEmptyComponent={<PrototypeEventEmpty label={t(trKey('activity.emptyFiltered'))} />}
        ListHeaderComponent={(
          <View className="gap-section">
            <View>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 active:opacity-70"
                onPress={() => setFiltersOpen(true)}>
                <AppIcon name="filter" size={19} tone="brand" />
                <AppText variant="label" tone="foreground">{t(trKey('activity.filtersTitle'))}</AppText>
              </Pressable>
            </View>

            {activeFilters.length ? (
              <ScrollableChipRow
                getKey={(filter) => filter.id}
                items={activeFilters}
                renderItem={(filter) => <FilterChip label={filter.label} onPress={filter.clear} selected />}
              />
            ) : null}

            <SectionTitle description={t(trKey('activity.resultCount'), { count: events.length })} title={t(trKey('activity.timelineTitle'))} />
          </View>
        )}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        renderItem={({ index, item }) => (
          <SectionCard>
            <PrototypeEventRow
              event={item}
              isLast={index === events.length - 1}
            />
          </SectionCard>
        )}
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet closeLabel={t(trKey('common.done'))} onClose={() => setFiltersOpen(false)} title={t(trKey('activity.filtersTitle'))} visible={filtersOpen}>
        <AppText variant="label" tone="foreground">{t(trKey('activity.filter.all'))}</AppText>
        <View className="flex-row flex-wrap gap-2">
          {(['all', 'checkOut', 'return', 'keyUpdated', 'admin'] as const).map((value) => <FilterChip key={value} label={t(trKey(`activity.filter.${value}`))} onPress={() => setKind(value)} selected={kind === value} />)}
        </View>
        <AppText variant="label" tone="foreground">{t(trKey('activity.operatorFilter'))}</AppText>
        <View className="flex-row flex-wrap gap-2">
          <FilterChip label={t(trKey('activity.allOperators'))} onPress={() => setActorId('all')} selected={actorId === 'all'} />
          {operators.map((operator) => <FilterChip key={operator.id} label={operator.name} onPress={() => setActorId(operator.id)} selected={actorId === operator.id} />)}
        </View>
        <AppText variant="label" tone="foreground">{t(trKey('activity.timeFilter'))}</AppText>
        <View className="flex-row flex-wrap gap-2">
          {(['all', 'week', 'month'] as const).map((value) => <FilterChip key={value} label={t(trKey(`activity.time.${value}`))} onPress={() => setTime(value)} selected={time === value} />)}
        </View>
      </BottomSheet>

    </View>
  );
}

export function CabinetSettings({ app, cabinet }: { app: PrototypeApp; cabinet: CabinetView }) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string>();
  const [openMemberMenu, setOpenMemberMenu] = useState<string>();
  const [cabinetName, setCabinetName] = useState(cabinet.name);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const visibleMembers = app.members.filter((member) => member.cabinetId === cabinet.id);
  const configuredKeys = app.keys.filter((key) => key.cabinetId === cabinet.id);
  const confirmation = usePrototypeDialog();

  useEffect(() => setCabinetName(cabinet.name), [cabinet.name]);
  useEffect(() => {
    if (!deleteAllOpen || deleteCountdown <= 0) return undefined;
    const timer = setTimeout(() => setDeleteCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [deleteAllOpen, deleteCountdown]);

  const run = async (id: string, action: () => Promise<void>, successKey: string) => {
    setBusyId(id);
    try {
      await action();
      Alert.alert(t(trKey('cabinet.successTitle')), t(trKey(successKey)));
    } catch {
      Alert.alert(t(trKey('cabinet.actionFailedTitle')), t(trKey('cabinet.actionFailedDescription')));
    } finally {
      setBusyId(undefined);
    }
  };

  const removeMember = async (membershipId: string, name: string) => {
    const confirmed = await confirmation.present({
      title: t(trKey('cabinet.removeMemberTitle')),
      description: t(trKey('cabinet.removeMemberDescription'), { name }),
      confirmLabel: t(trKey('cabinet.removeMemberConfirm')),
      cancelLabel: t(trKey('cabinet.cancel')),
      tone: 'danger',
    });
    if (confirmed) await run(membershipId, () => app.removeMember({ cabinetId: cabinet.id, membershipId }), 'cabinet.memberRemovedSuccess');
  };

  const openDeleteAll = () => {
    setDeleteCountdown(5);
    setDeleteAllOpen(true);
  };

  const deleteAll = async () => {
    await run('delete-all', () => app.deleteAllKeys({ cabinetId: cabinet.id }), 'cabinet.keysDeletedSuccess');
    setDeleteAllOpen(false);
  };

  const rename = async () => {
    const next = cabinetName.trim();
    if (!next || next === cabinet.name) return;
    await run('rename', () => app.renameCabinet({ cabinetId: cabinet.id, name: next }), 'cabinet.renamedSuccess');
  };

  return (
    <View className="min-w-0 flex-1">
      <FlatList
        className="min-w-0 flex-1"
        contentContainerStyle={{ padding: 20, rowGap: 10 }}
        data={visibleMembers}
        keyExtractor={(member) => member.id}
        ListHeaderComponent={(
          <View className="gap-section">
            <SectionCard>
              <SectionTitle description={t(trKey('cabinet.renameDescription'))} title={t(trKey('cabinet.renameTitle'))} />
              <FormField label={t(trKey('cabinet.cabinetNameLabel'))} onChangeText={setCabinetName} placeholder={t(trKey('scan.cabinetNamePlaceholder'))} value={cabinetName} />
              <ActionButton disabled={Boolean(busyId) || !cabinetName.trim() || cabinetName.trim() === cabinet.name} icon="settings" label={t(trKey('cabinet.renameAction'))} onPress={() => void rename()} tone="neutral" />
            </SectionCard>
            <SectionTitle description={t(trKey('cabinet.membersDescription'))} title={t(trKey('cabinet.membersTitle'), { count: visibleMembers.length })} />
          </View>
        )}
        ListHeaderComponentStyle={{ marginBottom: 8 }}
        ListFooterComponent={(
          <SectionCard className="mt-2">
            <SectionTitle description={t(trKey('cabinet.clearSectionDescription'))} title={t(trKey('cabinet.clearSectionTitle'))} />
            {deleteAllOpen ? (
              <View className="gap-3 rounded-control border border-danger bg-danger-soft p-4">
                <AppText variant="title" tone="danger">{t(trKey('cabinet.deleteAllConfirmTitle'))}</AppText>
                <AppText tone="content">{t(trKey('cabinet.deleteAllConfirmDescription'), { count: configuredKeys.length })}</AppText>
                <ActionButton disabled={deleteCountdown > 0 || Boolean(busyId)} icon="error" label={deleteCountdown > 0 ? t(trKey('cabinet.deleteAllCountdown'), { seconds: deleteCountdown }) : t(trKey('cabinet.deleteAllConfirm'))} onPress={() => void deleteAll()} tone="danger" />
                <ActionButton disabled={Boolean(busyId)} label={t(trKey('cabinet.cancel'))} onPress={() => setDeleteAllOpen(false)} tone="neutral" />
              </View>
            ) : (
              <ActionButton
                disabled={Boolean(busyId) || app.isOffline || configuredKeys.length === 0}
                icon="error"
                label={t(trKey('cabinet.clearKeysAction'))}
                onPress={openDeleteAll}
                tone="danger"
              />
            )}
          </SectionCard>
        )}
        renderItem={({ item: member }) => {
          const canRemove = member.userId !== app.currentUserId;
          return (
            <View className="gap-2 rounded-control border border-line bg-surface p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft">
                  <AppText variant="title" tone="brand">{member.name.slice(0, 1).toUpperCase()}</AppText>
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <AppText numberOfLines={1} variant="label" tone="foreground">{member.name}</AppText>
                  <AppText numberOfLines={1} variant="caption" tone="muted">{member.email}</AppText>
                </View>
                <View className="items-end gap-1">
                  <Pill tone="blue">{t(trKey('cabinet.role.admin'))}</Pill>
                  {canRemove ? (
                    <Pressable
                      accessibilityLabel={t(trKey('cabinet.memberActions'))}
                      accessibilityRole="button"
                      className="h-11 w-11 items-center justify-center rounded-pill active:opacity-70"
                      onPress={() => setOpenMemberMenu((value) => value === member.id ? undefined : member.id)}>
                      <AppIcon name="more" size={22} tone="muted" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {openMemberMenu === member.id ? (
                <View className="flex-row flex-wrap items-center justify-end gap-3 border-t border-line pt-2">
                  {canRemove ? <InlineButton disabled={Boolean(busyId)} label={t(trKey('cabinet.removeMember'))} onPress={() => void removeMember(member.id, member.name)} tone="danger" /> : null}
                </View>
              ) : null}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      {confirmation.dialog}
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 gap-1 rounded-control bg-background px-3 py-2.5">
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText numberOfLines={2} variant="label" tone="foreground">{value}</AppText>
    </View>
  );
}
