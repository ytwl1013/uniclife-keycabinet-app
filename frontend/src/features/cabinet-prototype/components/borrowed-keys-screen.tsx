import { Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { DateRangeCalendar } from '@/components/ui/date-range-calendar';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { BorrowedKeysFilterMenu } from '@/features/cabinet-prototype/components/borrowed-keys-filter-menu';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { Notice, SearchInput, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { CabinetView, KeyView } from '@/features/cabinet-prototype/types';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;

type StatusFilter = 'all' | 'normal' | 'overdue';
type TimeFilter = 'all' | 'custom';
type BorrowedKeySection = { cabinet: CabinetView; title: string; data: KeyView[] };

export function BorrowedKeysScreen() {
  const { locale, t } = useTranslation();
  const app = usePrototypeApp();
  const confirmation = usePrototypeDialog();
  const dateDefaults = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const [query, setQuery] = useState('');
  const [cabinetId, setCabinetId] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [time, setTime] = useState<TimeFilter>('all');
  const [customFrom, setCustomFrom] = useState(dateDefaults.from);
  const [customTo, setCustomTo] = useState(dateDefaults.to);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string>();

  const borrowedKeys = useMemo(() => app.keys.filter((key) => key.activeLoan), [app.keys]);
  const filteredKeys = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let from: number | undefined;
    let to: number | undefined;
    if (time === 'custom') {
      from = Date.parse(customFrom);
      to = Date.parse(customTo);
    }

    return borrowedKeys.filter((key) => {
      const cabinet = app.cabinets.find((candidate) => candidate.id === key.cabinetId);
      const loan = key.activeLoan;
      if (!loan) return false;
      if (cabinetId !== 'all' && key.cabinetId !== cabinetId) return false;
      if (status === 'normal' && key.status !== 'checkedOut') return false;
      if (status === 'overdue' && key.status !== 'overdue') return false;
      const checkedOutAt = Date.parse(loan.checkedOutAt);
      if (from !== undefined && checkedOutAt < from) return false;
      if (to !== undefined && checkedOutAt > to) return false;
      if (!normalizedQuery) return true;
      return [key.name, key.note, cabinet?.name, loan.borrowerName]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    }).sort((left, right) => {
      if (left.status !== right.status) return left.status === 'overdue' ? -1 : 1;
      return (left.activeLoan?.checkedOutAt ?? '').localeCompare(right.activeLoan?.checkedOutAt ?? '');
    });
  }, [app.cabinets, borrowedKeys, cabinetId, customFrom, customTo, query, status, time]);

  const sections = useMemo<BorrowedKeySection[]>(() => app.cabinets.flatMap((cabinet) => {
    const keys = filteredKeys.filter((key) => key.cabinetId === cabinet.id);
    return keys.length ? [{ cabinet, title: cabinet.name, data: keys }] : [];
  }), [app.cabinets, filteredKeys]);
  const selectedCabinet = app.cabinets.find((cabinet) => cabinet.id === cabinetId);
  const customRangeValid = Date.parse(customFrom) <= Date.parse(customTo);
  const timeLabel = time === 'custom'
    ? t(trKey('borrowed.time.customValue'), {
        from: formatDateOnly(locale, customFrom),
        to: formatDateOnly(locale, customTo),
      })
    : t(trKey(`borrowed.time.${time}`));

  const returnKey = async (key: KeyView) => {
    const loan = key.activeLoan;
    if (!loan) return;
    const cabinet = app.cabinets.find((candidate) => candidate.id === key.cabinetId);
    const returnedAt = new Date().toISOString();
    const confirmed = await confirmation.present({
      title: t(trKey('loan.returnTitle')),
      description: t(trKey('borrowed.returnConfirmationDescription'), {
        key: key.name,
        cabinet: cabinet?.name ?? '',
        borrower: loan.borrowerName,
        checkedOutAt: formatDateTime(locale, loan.checkedOutAt),
        returnedAt: formatDateTime(locale, returnedAt),
      }),
      confirmLabel: t(trKey('loan.confirmReturn')),
      cancelLabel: t(trKey('loan.cancel')),
    });
    if (!confirmed) return;

    setBusyKeyId(key.id);
    try {
      await app.returnKey({ cabinetId: key.cabinetId, keyId: key.id, returnedAt });
      await confirmation.present({
        title: t(trKey('loan.returnedTitle')),
        description: t(trKey('loan.returnedDescription')),
        confirmLabel: t(trKey('loan.done')),
      });
    } catch {
      await confirmation.present({
        title: t(trKey('loan.actionFailedTitle')),
        description: t(trKey('loan.actionFailedDescription')),
        confirmLabel: t(trKey('loan.done')),
        tone: 'danger',
      });
    } finally {
      setBusyKeyId(undefined);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="mx-auto w-full max-w-content flex-row items-center gap-3 px-screen pb-2 pt-3">
        <Pressable
          accessibilityLabel={t(trKey('borrowed.back'))}
          accessibilityRole="button"
          className="h-[50px] w-[50px] items-center justify-center rounded-control bg-surface active:opacity-70"
          onPress={() => router.back()}>
          <AppIcon name="back" size={23} tone="brand" />
        </Pressable>
        <SearchInput onChangeText={setQuery} placeholder={t(trKey('borrowed.searchPlaceholder'))} value={query} />
      </View>

      <ScrollView
        className="grow-0 shrink-0"
        contentContainerClassName="gap-2 px-screen py-2"
        horizontal
        showsHorizontalScrollIndicator={false}>
        <BorrowedKeysFilterMenu
          label={t(trKey('borrowed.cabinetButton'), { cabinet: selectedCabinet?.name ?? t(trKey('borrowed.allCabinets')) })}
          options={[
            { id: 'all', label: t(trKey('borrowed.allCabinets')) },
            ...app.cabinets.map((cabinet) => ({ id: cabinet.id, label: cabinet.name })),
          ]}
          selectedId={cabinetId}
          onSelect={setCabinetId}
        />
        <BorrowedKeysFilterMenu
          label={t(trKey(`borrowed.status.${status}`))}
          options={(['all', 'normal', 'overdue'] as const).map((value) => ({
            id: value,
            label: t(trKey(`borrowed.status.${value}`)),
          }))}
          selectedId={status}
          onSelect={(value) => setStatus(value as StatusFilter)}
        />
        <FilterMenuButton active={time !== 'all'} label={timeLabel} onPress={() => setCalendarOpen(true)} />
      </ScrollView>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1">
        <SectionList
          className="min-w-0 flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={(key) => key.id}
          ListEmptyComponent={app.isLoading ? (
            <View className="px-screen pt-screen">
              <StatePanel description={t(trKey('borrowed.loadingDescription'))} loading title={t(trKey('borrowed.loadingTitle'))} />
            </View>
          ) : (
            <View className="px-screen pt-screen">
              <StatePanel
                description={t(trKey(borrowedKeys.length ? 'borrowed.emptyFilteredDescription' : 'loan.noneDescription'))}
                icon="key"
                title={t(trKey(borrowedKeys.length ? 'borrowed.emptyFilteredTitle' : 'loan.noneTitle'))}
              />
            </View>
          )}
          ListHeaderComponent={app.isOffline ? (
            <View className="px-screen pb-2 pt-2">
              <Notice description={t(trKey('loan.offlineDescription'))} title={t(trKey('loan.offlineTitle'))} tone="warning" />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View className="px-screen pb-2">
              <BorrowedKeyCard
                appOffline={app.isOffline}
                busy={busyKeyId === item.id}
                item={item}
                onReturn={() => void returnKey(item)}
              />
            </View>
          )}
          renderSectionHeader={({ section }) => <CabinetSectionHeader cabinet={section.cabinet} count={section.data.length} />}
          sections={app.isLoading ? [] : sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
        />
      </View>

      <BottomSheet
        closeLabel={t(trKey('common.done'))}
        footer={(
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 active:opacity-70"
              onPress={() => {
                setTime('all');
                setCalendarOpen(false);
              }}>
              <AppText variant="label" tone="foreground">{t(trKey('borrowed.time.clear'))}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !customRangeValid }}
              className={`min-h-12 flex-1 items-center justify-center rounded-control bg-brand px-4 ${customRangeValid ? 'active:opacity-75' : 'opacity-40'}`}
              disabled={!customRangeValid}
              onPress={() => {
                setTime('custom');
                setCalendarOpen(false);
              }}>
              <AppText variant="label" tone="onBrand">{t(trKey('borrowed.time.apply'))}</AppText>
            </Pressable>
          </View>
        )}
        onClose={() => setCalendarOpen(false)}
        title={t(trKey('borrowed.filterTitle.time'))}
        visible={calendarOpen}>
        <DateRangeCalendar
          error={customRangeValid ? undefined : t(trKey('borrowed.time.invalidRange'))}
          from={customFrom}
          fromLabel={t(trKey('borrowed.time.from'))}
          locale={locale}
          onFromChange={setCustomFrom}
          onToChange={setCustomTo}
          to={customTo}
          toLabel={t(trKey('borrowed.time.to'))}
        />
      </BottomSheet>
      {confirmation.dialog}
    </SafeAreaView>
  );
}

function FilterMenuButton({ active, label, onPress }: { active: boolean; label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-11 flex-row items-center gap-2 self-start rounded-pill border px-4 ${
        active ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
      } active:opacity-70`}
      onPress={onPress}>
      <AppText numberOfLines={1} variant="caption" tone={active ? 'brand' : 'muted'}>{label}</AppText>
      <AppIcon name="chevronDown" size={17} tone={active ? 'brand' : 'muted'} />
    </Pressable>
  );
}

function CabinetSectionHeader({ cabinet, count }: { cabinet: CabinetView; count: number }) {
  return (
    <View className="bg-background px-screen pb-2 pt-4">
      <View className="flex-row items-center gap-2 px-1">
        <AppText className="min-w-0 flex-1" numberOfLines={1} variant="label" tone="foreground">{cabinet.name}</AppText>
        <AppText variant="caption" tone="muted">{count}</AppText>
      </View>
    </View>
  );
}

function BorrowedKeyCard({
  appOffline,
  busy,
  item,
  onReturn,
}: {
  appOffline: boolean;
  busy: boolean;
  item: KeyView;
  onReturn: () => void;
}) {
  const { locale, t } = useTranslation();
  const loan = item.activeLoan;
  if (!loan) return null;

  const overdue = item.status === 'overdue';
  const openDetail = () => router.push({
    pathname: '/cabinets/[cabinetId]/keys/[keyId]',
    params: { cabinetId: item.cabinetId, keyId: item.id },
  } as Href);
  return (
    <View className="flex-row items-center gap-3 rounded-control bg-surface px-3 py-3">
      <Pressable accessibilityRole="button" className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-75" onPress={openDetail}>
        <View className={`h-8 w-8 items-center justify-center rounded-pill ${overdue ? 'bg-danger-soft' : 'bg-warning-soft'}`}>
          <AppIcon name="key" size={16} tone={overdue ? 'danger' : 'warning'} />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <AppText numberOfLines={1} variant="label" tone="foreground">{item.name}</AppText>
          <AppText numberOfLines={2} variant="caption" tone="muted">
            {loan.borrowerName}: {formatDateTime(locale, loan.checkedOutAt)} ~{' '}
            <AppText variant="caption" tone={overdue ? 'danger' : 'muted'}>
              {loan.expectedReturnAt ? formatDateTime(locale, loan.expectedReturnAt) : t(trKey('loan.noExpectedReturn'))}
            </AppText>
          </AppText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy || appOffline }}
        className={`min-h-10 items-center justify-center rounded-control bg-brand px-3 ${busy || appOffline ? 'opacity-40' : 'active:opacity-75'}`}
        disabled={busy || appOffline}
        onPress={onReturn}>
        <AppText variant="caption" tone="onBrand">{t(trKey(busy ? 'borrowed.returning' : 'borrowed.returnAction'))}</AppText>
      </Pressable>
    </View>
  );
}

function formatDateTime(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

function formatDateOnly(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(new Date(value));
}
