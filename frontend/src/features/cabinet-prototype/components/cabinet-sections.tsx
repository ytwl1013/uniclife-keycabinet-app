import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, ScrollView, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { ProductImage } from '@/components/ui/product-image';
import { ScrollableChipRow } from '@/components/ui/scrollable-chip-row';
import { TranslationKey, useTranslation } from '@/i18n';

import { CabinetEventKind, CabinetView, ExportFormat, PrototypeApp } from '../types';
import { PrototypeEventEmpty, PrototypeEventList, PrototypeEventRow } from './event-list';
import { PrototypeKeySlotGrid } from './key-slot-grid';
import { usePrototypeDialog } from './prototype-dialog';
import { ActionButton, FilterChip, InlineButton, Notice, SearchInput, SectionCard, SectionTitle, Stat, StatePanel } from './prototype-ui';

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
        <PrototypeEventList currentUserId={app.currentUserId} emptyLabel={t(trKey('activity.empty'))} events={latestEvents} />
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
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const confirmation = usePrototypeDialog();
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

  const executeUndo = async (eventId: string) => {
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

  const performExport = async (format: ExportFormat, includeFullContact: boolean) => {
    setBusy(true);
    try {
      const artifact = await app.exportLog({ cabinetId: cabinet.id, format, includeFullContact });
      Alert.alert(t(trKey('activity.exportReadyTitle')), t(trKey('activity.exportReadyDescription'), { filename: artifact.filename }));
    } catch {
      Alert.alert(t(trKey('activity.actionFailedTitle')), t(trKey('activity.exportFailedDescription')));
    } finally {
      setBusy(false);
    }
  };

  const exportLog = async (format: ExportFormat) => {
    if (cabinet.role === 'member') {
      await performExport(format, false);
      return;
    }
    const includeFullContact = await confirmation.present({
      title: t(trKey('activity.exportPrivacyTitle')),
      description: t(trKey('activity.exportPrivacyDescription')),
      confirmLabel: t(trKey('activity.exportFull')),
      cancelLabel: t(trKey('activity.exportMasked')),
    });
    await performExport(format, includeFullContact);
  };

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
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 active:opacity-70"
                onPress={() => setFiltersOpen(true)}>
                <AppIcon name="filter" size={19} tone="brand" />
                <AppText variant="label" tone="foreground">{t(trKey('activity.filtersTitle'))}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 active:opacity-70"
                onPress={() => setExportOpen(true)}>
                <AppIcon name="download" size={19} tone="brand" />
                <AppText variant="label" tone="foreground">{t(trKey('activity.exportTitle'))}</AppText>
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
              currentUserId={app.currentUserId}
              event={item}
              isLast={index === events.length - 1}
              onUndo={(event) => void executeUndo(event.id)}
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

      <BottomSheet closeLabel={t(trKey('common.done'))} onClose={() => setExportOpen(false)} title={t(trKey('activity.exportTitle'))} visible={exportOpen}>
        <View className="gap-2">
          {(['csv', 'xlsx', 'pdf'] as const).map((format) => (
            <ActionButton disabled={busy || app.isOffline} icon="download" key={format} label={format.toUpperCase()} onPress={() => void exportLog(format)} tone="neutral" />
          ))}
        </View>
      </BottomSheet>
      {confirmation.dialog}
    </View>
  );
}

export function CabinetSettings({ app, cabinet }: { app: PrototypeApp; cabinet: CabinetView }) {
  const { locale, t } = useTranslation();
  const [busyId, setBusyId] = useState<string>();
  const [openMemberMenu, setOpenMemberMenu] = useState<string>();
  const visibleMembers = app.members.filter((member) => member.cabinetId === cabinet.id);
  const configuredKeys = app.keys.filter((key) => key.cabinetId === cabinet.id);
  const activeLoans = app.keys.filter((key) => key.cabinetId === cabinet.id && key.activeLoan);
  const canManage = cabinet.role === 'owner' || cabinet.role === 'admin';
  const isOwner = cabinet.role === 'owner';
  const confirmation = usePrototypeDialog();

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

  const changeRole = async (membershipId: string, nextRole: 'admin' | 'member', name: string) => {
    const confirmed = await confirmation.present({
      title: t(trKey('cabinet.roleConfirmTitle')),
      description: t(trKey('cabinet.roleConfirmDescription'), { member: name, role: t(trKey(`cabinet.role.${nextRole}`)) }),
      confirmLabel: t(trKey('cabinet.confirm')),
      cancelLabel: t(trKey('cabinet.cancel')),
    });
    if (confirmed) await run(membershipId, () => app.setMemberRole({ cabinetId: cabinet.id, membershipId, role: nextRole }), 'cabinet.roleChangedSuccess');
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

  const clearKeys = async () => {
    if (activeLoans.length) {
      Alert.alert(t(trKey('cabinet.clearBlockedTitle')), t(trKey('cabinet.clearBlockedDescription'), { count: activeLoans.length }));
      return;
    }
    const confirmed = await confirmation.present({
      title: t(trKey('cabinet.clearKeysTitle')),
      description: t(trKey('cabinet.clearKeysDescription')),
      confirmLabel: t(trKey('cabinet.clearKeysConfirm')),
      cancelLabel: t(trKey('cabinet.cancel')),
      tone: 'danger',
    });
    if (confirmed) await run('clear', () => app.clearKeys({ cabinetId: cabinet.id }), 'cabinet.keysClearedSuccess');
  };

  return (
    <View className="min-w-0 flex-1">
      <FlatList
        className="min-w-0 flex-1"
        contentContainerStyle={{ padding: 20, rowGap: 10 }}
        data={visibleMembers}
        keyExtractor={(member) => member.id}
        ListHeaderComponent={<SectionTitle description={t(trKey('cabinet.membersDescription'))} title={t(trKey('cabinet.membersTitle'), { count: visibleMembers.length })} />}
        ListHeaderComponentStyle={{ marginBottom: 8 }}
        ListFooterComponent={(
          <SectionCard className="mt-2">
            <SectionTitle description={t(trKey('cabinet.clearSectionDescription'))} title={t(trKey('cabinet.clearSectionTitle'))} />
            {cabinet.clearRestoreUntil ? (
              <Notice
                description={t(trKey('cabinet.restoreUntilDescription'), { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(cabinet.clearRestoreUntil)) })}
                title={t(trKey('cabinet.restoreUntilTitle'))}
                tone="success"
              />
            ) : null}
            {activeLoans.length ? <Notice description={t(trKey('cabinet.clearBlockedDescription'), { count: activeLoans.length })} title={t(trKey('cabinet.clearBlockedTitle'))} tone="warning" /> : null}
            {canManage ? (
              <ActionButton
                disabled={Boolean(busyId) || app.isOffline || Boolean(activeLoans.length) || configuredKeys.length === 0}
                icon="error"
                label={t(trKey('cabinet.clearKeysAction'))}
                onPress={() => void clearKeys()}
                tone="danger"
              />
            ) : (
              <Notice description={t(trKey('cabinet.managePermissionRequiredDescription'))} title={t(trKey('cabinet.managePermissionRequiredTitle'))} tone="warning" />
            )}
          </SectionCard>
        )}
        renderItem={({ item: member }) => {
          const canChangeRole = isOwner && member.role !== 'owner' && member.userId !== app.currentUserId;
          const canRemove = canManage && member.role === 'member' && member.userId !== app.currentUserId;
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
                  <Pill tone={member.role === 'owner' ? 'purple' : member.role === 'admin' ? 'blue' : 'gray'}>{t(trKey(`cabinet.role.${member.role}`))}</Pill>
                  {(canChangeRole || canRemove) ? (
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
                  {canChangeRole ? (
                    <InlineButton
                      disabled={Boolean(busyId)}
                      label={member.role === 'admin' ? t(trKey('cabinet.revokeAdmin')) : t(trKey('cabinet.makeAdmin'))}
                      onPress={() => void changeRole(member.id, member.role === 'admin' ? 'member' : 'admin', member.name)}
                    />
                  ) : null}
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
