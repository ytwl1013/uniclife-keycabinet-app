import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppIcon } from '@/components/ui/app-icon';
import { AppRefreshControl } from '@/components/ui/app-refresh-control';
import { AppText } from '@/components/ui/app-text';
import { Pill, PillTone } from '@/components/ui/pill';
import { ProductImage } from '@/components/ui/product-image';
import { ScrollableChipRow } from '@/components/ui/scrollable-chip-row';
import { ActivityTimelineItem } from '@/features/activity/components/activity-timeline';
import { useActivityPagination } from '@/features/activity/use-activity-pagination';
import { TranslationKey, useTranslation } from '@/i18n';
import { SpotlightRect } from '@/features/home/components/home-spotlight-guide';

import { CabinetEventKind, CabinetView, PrototypeApp } from '../types';
import { PrototypeEventEmpty, PrototypeEventList } from './event-list';
import { PrototypeKeySlotGrid } from './key-slot-grid';
import { usePrototypeDialog } from './prototype-dialog';
import { ActionButton, FilterChip, FormField, InlineButton, SearchInput, SectionCard, SectionTitle, Stat, StatePanel } from './prototype-ui';

const trKey = (key: string) => key as TranslationKey;
type RefreshProps = {
  onRefresh: () => void;
  refreshing: boolean;
};

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
            imagePath={cabinet.imagePath}
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

export function CabinetKeys({
  app,
  cabinet,
  onRefresh,
  onSpotlightRect,
  refreshing,
  spotlightSlotId,
}: RefreshProps & {
  app: PrototypeApp;
  cabinet: CabinetView;
  onSpotlightRect?: (rect: SpotlightRect) => void;
  spotlightSlotId?: string;
}) {
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
      onRefresh={onRefresh}
      onSpotlightRect={onSpotlightRect}
      refreshing={refreshing}
      slots={slots}
      spotlightSlotId={spotlightSlotId}
    />
  );
}

export function CabinetActivity({
  app,
  cabinet,
  onRefresh,
  refreshing,
}: RefreshProps & { app: PrototypeApp; cabinet: CabinetView }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<'all' | CabinetEventKind | 'admin'>('all');
  const [time, setTime] = useState<'all' | 'week' | 'month'>('all');
  const [actorId, setActorId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cabinetEvents = useMemo(
    () => app.events.filter((event) => event.cabinetId === cabinet.id),
    [app.events, cabinet.id],
  );
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
  const {
    hasMore,
    loadMore,
    visibleEntries: visibleEvents,
  } = useActivityPagination(events, `${cabinet.id}:${kind}:${actorId}:${time}`);
  const activeFilters = [
    kind !== 'all' ? { id: 'kind', label: t(trKey(`activity.filter.${kind}`)), clear: () => setKind('all') } : null,
    actorId !== 'all' ? { id: 'actor', label: operators.find((operator) => operator.id === actorId)?.name ?? actorId, clear: () => setActorId('all') } : null,
    time !== 'all' ? { id: 'time', label: t(trKey(`activity.time.${time}`)), clear: () => setTime('all') } : null,
  ].filter((filter): filter is { id: string; label: string; clear: () => void } => Boolean(filter));

  return (
    <View className="min-w-0 flex-1">
      <FlatList
        alwaysBounceVertical
        className="min-w-0 flex-1"
        contentContainerStyle={{ flexGrow: 1, padding: 20, rowGap: 12 }}
        contentInsetAdjustmentBehavior="automatic"
        data={visibleEvents}
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
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.35}
        refreshControl={<AppRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
        renderItem={({ item }) => (
          <SectionCard>
            <ActivityTimelineItem event={item} />
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

export function CabinetSettings({
  app,
  cabinet,
  onRefresh,
  refreshing,
}: RefreshProps & { app: PrototypeApp; cabinet: CabinetView }) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string>();
  const [openMemberMenu, setOpenMemberMenu] = useState<string>();
  const [cabinetName, setCabinetName] = useState(cabinet.name);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [joinInvitation, setJoinInvitation] = useState<
    Awaited<ReturnType<PrototypeApp['createJoinInvitation']>>
  >();
  const [invitationClock, setInvitationClock] = useState(Date.now());
  const visibleMembers = app.members.filter((member) => member.cabinetId === cabinet.id);
  const configuredKeys = app.keys.filter((key) => key.cabinetId === cabinet.id);
  const isSuperAdmin = cabinet.role === 'superAdmin';
  const confirmation = usePrototypeDialog();

  useEffect(() => setCabinetName(cabinet.name), [cabinet.name]);
  useEffect(() => {
    if (!deleteAllOpen || deleteCountdown <= 0) return undefined;
    const timer = setTimeout(() => setDeleteCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [deleteAllOpen, deleteCountdown]);
  useEffect(() => {
    if (!joinInvitation) return undefined;
    const timer = setInterval(() => setInvitationClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [joinInvitation]);

  const invitationSeconds = joinInvitation
    ? Math.max(0, Math.ceil((Date.parse(joinInvitation.expiresAt) - invitationClock) / 1_000))
    : 0;
  const invitationExpired = Boolean(joinInvitation && invitationSeconds === 0);

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
    setOpenMemberMenu(undefined);
    const confirmed = await confirmation.present({
      title: t(trKey('cabinet.removeMemberTitle')),
      description: t(trKey('cabinet.removeMemberDescription'), { name }),
      confirmLabel: t(trKey('cabinet.removeMemberConfirm')),
      cancelLabel: t(trKey('cabinet.cancel')),
      tone: 'danger',
    });
    if (confirmed) await run(membershipId, () => app.removeMember({ cabinetId: cabinet.id, membershipId }), 'cabinet.memberRemovedSuccess');
  };

  const transferSuperAdmin = async (membershipId: string, name: string) => {
    setOpenMemberMenu(undefined);
    const confirmed = await confirmation.present({
      title: t(trKey('cabinet.transferSuperAdminTitle')),
      description: t(trKey('cabinet.transferSuperAdminDescription'), { name }),
      confirmLabel: t(trKey('cabinet.transferSuperAdminConfirm')),
      cancelLabel: t(trKey('cabinet.cancel')),
      tone: 'danger',
    });
    if (confirmed) {
      await run(
        membershipId,
        () => app.transferSuperAdmin({ cabinetId: cabinet.id, membershipId }),
        'cabinet.superAdminTransferredSuccess',
      );
    }
  };

  const openDeleteAll = () => {
    if (!isSuperAdmin) return;
    setDeleteCountdown(5);
    setDeleteAllOpen(true);
  };

  const deleteAll = async () => {
    if (!isSuperAdmin) return;
    await run('delete-all', () => app.deleteAllKeys({ cabinetId: cabinet.id }), 'cabinet.keysDeletedSuccess');
    setDeleteAllOpen(false);
  };

  const removeCabinet = async () => {
    const permanentlyDelete = isSuperAdmin;
    const confirmed = await confirmation.present({
      title: t(
        trKey(permanentlyDelete
          ? 'cabinetManagement.deleteConfirmTitle'
          : 'cabinetManagement.confirmTitle'),
        { cabinet: cabinet.name },
      ),
      description: t(trKey(permanentlyDelete
        ? 'cabinetManagement.deleteConfirmDescription'
        : 'cabinetManagement.confirmDescription')),
      confirmLabel: t(trKey(permanentlyDelete
        ? 'cabinetManagement.deleteConfirm'
        : 'cabinetManagement.removeConfirm')),
      cancelLabel: t(trKey('cabinet.cancel')),
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusyId('delete-cabinet');
    try {
      if (permanentlyDelete) {
        await app.deleteCabinet({ cabinetId: cabinet.id });
      } else {
        await app.disconnectCabinet({ cabinetId: cabinet.id });
      }
      Alert.alert(
        t(trKey('cabinet.successTitle')),
        t(
          trKey(permanentlyDelete
            ? 'cabinetManagement.deletedSuccess'
            : 'cabinetManagement.removedSuccess'),
          { cabinet: cabinet.name },
        ),
      );
      router.replace('/(tabs)');
    } catch {
      Alert.alert(
        t(trKey('cabinet.actionFailedTitle')),
        t(trKey('cabinetManagement.actionFailed')),
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const rename = async () => {
    const next = cabinetName.trim();
    if (!next || next === cabinet.name) return;
    await run('rename', () => app.renameCabinet({ cabinetId: cabinet.id, name: next }), 'cabinet.renamedSuccess');
  };

  const generateJoinInvitation = async () => {
    setBusyId('join-invitation');
    try {
      const invitation = await app.createJoinInvitation({ cabinetId: cabinet.id });
      setJoinInvitation(invitation);
      setInvitationClock(Date.now());
    } catch {
      Alert.alert(t(trKey('cabinet.actionFailedTitle')), t('cabinetInvite.failed'));
    } finally {
      setBusyId(undefined);
    }
  };

  const revokeJoinInvitation = async () => {
    if (!joinInvitation) return;
    setBusyId('join-invitation');
    try {
      await app.revokeJoinInvitation({
        cabinetId: cabinet.id,
        invitationId: joinInvitation.id,
      });
      setJoinInvitation(undefined);
      Alert.alert(t(trKey('cabinet.successTitle')), t('cabinetInvite.revoked'));
    } catch {
      Alert.alert(t(trKey('cabinet.actionFailedTitle')), t('cabinetInvite.failed'));
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <View className="min-w-0 flex-1">
      <FlatList
        alwaysBounceVertical
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
            <SectionCard>
              <SectionTitle
                description={t('cabinetInvite.description')}
                title={t('cabinetInvite.title')}
              />
              {joinInvitation && !invitationExpired ? (
                <View className="items-center gap-4">
                  <View className="rounded-card bg-white p-4">
                    <QRCode
                      backgroundColor="#ffffff"
                      color="#111827"
                      size={220}
                      value={joinInvitation.joinQrCode}
                    />
                  </View>
                  <AppText className="font-mono" selectable variant="label" tone="muted">
                    {t('cabinetInvite.expiresIn', {
                      minutes: Math.floor(invitationSeconds / 60),
                      seconds: String(invitationSeconds % 60).padStart(2, '0'),
                    })}
                  </AppText>
                  <View className="w-full gap-3">
                    <ActionButton
                      disabled={Boolean(busyId) || app.isOffline}
                      label={t('cabinetInvite.refresh')}
                      onPress={() => void generateJoinInvitation()}
                      tone="neutral"
                    />
                    <ActionButton
                      disabled={Boolean(busyId) || app.isOffline}
                      label={t('cabinetInvite.revoke')}
                      onPress={() => void revokeJoinInvitation()}
                      tone="danger"
                    />
                  </View>
                </View>
              ) : (
                <View className="gap-3">
                  {invitationExpired ? (
                    <AppText tone="danger">{t('cabinetInvite.expired')}</AppText>
                  ) : null}
                  <ActionButton
                    disabled={Boolean(busyId) || app.isOffline}
                    icon="scan"
                    label={busyId === 'join-invitation'
                      ? t('cabinetInvite.generating')
                      : t('cabinetInvite.generate')}
                    onPress={() => void generateJoinInvitation()}
                  />
                </View>
              )}
            </SectionCard>
            <SectionTitle description={t(trKey('cabinet.membersDescription'))} title={t(trKey('cabinet.membersTitle'), { count: visibleMembers.length })} />
          </View>
        )}
        ListHeaderComponentStyle={{ marginBottom: 8 }}
        ListFooterComponent={(
          <View className="mt-2 gap-section">
            <SectionCard>
              <SectionTitle description={t(trKey('cabinet.clearSectionDescription'))} title={t(trKey('cabinet.clearSectionTitle'))} />
              {!isSuperAdmin ? (
                <View className="flex-row items-center gap-3 rounded-control bg-warning-soft px-3.5 py-3">
                  <AppIcon name="error" size={20} tone="warning" />
                  <AppText className="flex-1" variant="caption" tone="warning">
                    {t(trKey('cabinet.clearKeysSuperAdminRequired'))}
                  </AppText>
                </View>
              ) : null}
              {deleteAllOpen && isSuperAdmin ? (
                <View className="gap-3 rounded-control border border-danger bg-danger-soft p-4">
                  <AppText variant="title" tone="danger">{t(trKey('cabinet.deleteAllConfirmTitle'))}</AppText>
                  <AppText tone="content">{t(trKey('cabinet.deleteAllConfirmDescription'), { count: configuredKeys.length })}</AppText>
                  <ActionButton disabled={deleteCountdown > 0 || Boolean(busyId)} icon="error" label={deleteCountdown > 0 ? t(trKey('cabinet.deleteAllCountdown'), { seconds: deleteCountdown }) : t(trKey('cabinet.deleteAllConfirm'))} onPress={() => void deleteAll()} tone="danger" />
                  <ActionButton disabled={Boolean(busyId)} label={t(trKey('cabinet.cancel'))} onPress={() => setDeleteAllOpen(false)} tone="neutral" />
                </View>
              ) : (
                <ActionButton
                  disabled={!isSuperAdmin || Boolean(busyId) || app.isOffline || configuredKeys.length === 0}
                  icon="error"
                  label={t(trKey('cabinet.clearKeysAction'))}
                  onPress={openDeleteAll}
                  tone="danger"
                />
              )}
            </SectionCard>

            <SectionCard>
              <SectionTitle
                description={t(trKey(isSuperAdmin
                  ? 'cabinet.deleteCabinetSectionDescription'
                  : 'cabinet.disconnectCabinetSectionDescription'))}
                title={t(trKey('cabinet.deleteCabinetSectionTitle'))}
              />
              <ActionButton
                disabled={Boolean(busyId) || app.isOffline}
                icon="trash"
                label={busyId === 'delete-cabinet'
                  ? t(trKey('cabinetManagement.removing'))
                  : t(trKey(isSuperAdmin
                    ? 'cabinetManagement.deleteConfirm'
                    : 'cabinetManagement.removeConfirm'))}
                onPress={() => void removeCabinet()}
                tone="danger"
              />
            </SectionCard>
          </View>
        )}
        refreshControl={<AppRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
        renderItem={({ item: member }) => {
          const canManageMember =
            isSuperAdmin &&
            member.userId !== app.currentUserId &&
            member.role !== 'superAdmin';
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
                  <Pill tone={member.role === 'superAdmin' ? 'purple' : 'blue'}>
                    {t(trKey(`cabinet.role.${member.role}`))}
                  </Pill>
                  {canManageMember ? (
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
                  <InlineButton
                    disabled={Boolean(busyId)}
                    label={t(trKey('cabinet.transferSuperAdmin'))}
                    onPress={() => void transferSuperAdmin(member.id, member.name)}
                  />
                  <InlineButton
                    disabled={Boolean(busyId)}
                    label={t(trKey('cabinet.removeMember'))}
                    onPress={() => void removeMember(member.id, member.name)}
                    tone="danger"
                  />
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
