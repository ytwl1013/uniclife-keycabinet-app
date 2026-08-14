import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppText } from '@/components/ui/app-text';
import { DateTimeField } from '@/components/ui/date-time-field';
import { isExpectedReturnAfter } from '@/components/ui/date-time';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { ActionButton, FilterChip, FormField, Notice, ScreenHeader, SectionCard, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;
const quickReturnOptions = [1, 3, 7] as const;
type QuickReturnDays = (typeof quickReturnOptions)[number];

export default function CheckOutKeyRoute() {
  const params = useLocalSearchParams<{ cabinetId: string; keyId: string }>();
  const cabinetId = first(params.cabinetId);
  const keyId = first(params.keyId);
  const { t } = useTranslation();
  const app = usePrototypeApp();
  const cabinet = app.cabinets.find((candidate) => candidate.id === cabinetId);
  const key = app.keys.find((candidate) => candidate.id === keyId && candidate.cabinetId === cabinetId);
  const defaultCheckedOutAt = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString();
  }, []);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [checkedOutAt, setCheckedOutAt] = useState(defaultCheckedOutAt);
  const [expectedReturnAt, setExpectedReturnAt] = useState<string>();
  const [quickReturnDays, setQuickReturnDays] = useState<QuickReturnDays>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const confirmation = usePrototypeDialog();

  if (!cabinet || !key || key.status !== 'available') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ScreenHeader onBack={() => router.back()} title={t(trKey('loan.checkOutTitle'))} />
          <StatePanel description={t(trKey('loan.unavailableDescription'))} icon="key" title={t(trKey('loan.unavailableTitle'))} />
          {confirmation.dialog}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    const checkedOut = new Date(checkedOutAt);
    const due = expectedReturnAt ? new Date(expectedReturnAt) : null;
    if (!borrowerName.trim()) next.borrowerName = t(trKey('loan.borrowerRequired'));
    if (Number.isNaN(checkedOut.getTime())) next.checkedOutAt = t(trKey('loan.invalidDate'));
    if (due && Number.isNaN(due.getTime())) next.expectedReturnAt = t(trKey('loan.invalidDate'));
    if (expectedReturnAt && !next.checkedOutAt && !next.expectedReturnAt && !isExpectedReturnAfter(checkedOutAt, expectedReturnAt)) next.expectedReturnAt = t(trKey('loan.dueAfterCheckout'));
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await app.checkoutKey({
        cabinetId,
        keyId,
        borrowerName: borrowerName.trim(),
        borrowerContact: borrowerContact.trim() || undefined,
        checkedOutAt: new Date(checkedOutAt).toISOString(),
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : undefined,
      });
      await confirmation.present({
        title: t(trKey('loan.checkedOutTitle')),
        description: t(trKey('loan.checkedOutDescription')),
        confirmLabel: t(trKey('loan.done')),
      });
      router.back();
    } catch {
      await confirmation.present({
        title: t(trKey('loan.actionFailedTitle')),
        description: t(trKey('loan.actionFailedDescription')),
        confirmLabel: t(trKey('loan.done')),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const updateCheckedOutAt = (value: string) => {
    setCheckedOutAt(value);
    if (quickReturnDays) setExpectedReturnAt(addLocalDays(value, quickReturnDays));
    setErrors((current) => ({ ...current, checkedOutAt: '', expectedReturnAt: '' }));
  };

  const setQuickReturn = (days: QuickReturnDays) => {
    setExpectedReturnAt(addLocalDays(checkedOutAt, days));
    setQuickReturnDays(days);
    setErrors((current) => ({ ...current, expectedReturnAt: '' }));
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
          <ScreenHeader onBack={() => router.back()} subtitle={cabinet.name} title={t(trKey('loan.checkOutKey'), { key: key.name })} />
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1 px-screen pb-screen pt-screen">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          className="min-w-0 flex-1"
          contentContainerClassName="gap-4 pb-4"
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {app.isOffline ? <Notice description={t(trKey('loan.offlineDescription'))} title={t(trKey('loan.offlineTitle'))} tone="warning" /> : null}
          <SectionCard>
            <FormField
              error={errors.borrowerName}
              label={t(trKey('loan.borrowerName'))}
              onChangeText={(value) => { setBorrowerName(value); setErrors((current) => ({ ...current, borrowerName: '' })); }}
              placeholder={t(trKey('loan.borrowerNamePlaceholder'))}
              value={borrowerName}
            />
            <FormField
              label={t(trKey('loan.borrowerContactOptional'))}
              onChangeText={setBorrowerContact}
              placeholder={t(trKey('loan.borrowerContactPlaceholder'))}
              value={borrowerContact}
            />
            <DateTimeField
              error={errors.checkedOutAt}
              label={t(trKey('loan.checkedOutAt'))}
              onChange={updateCheckedOutAt}
              value={checkedOutAt}
            />
            <DateTimeField
              emptyLabel={t(trKey('loan.noExpectedReturnOption'))}
              error={errors.expectedReturnAt}
              label={t(trKey('loan.expectedReturnAt'))}
              minimumDate={minuteAfter(checkedOutAt)}
              onChange={(value) => {
                setExpectedReturnAt(value);
                setQuickReturnDays(undefined);
                setErrors((current) => ({ ...current, expectedReturnAt: '' }));
              }}
              value={expectedReturnAt}
            />
            <View className="gap-2">
              <AppText variant="caption" tone="muted">{t(trKey('loan.quickReturnTime'))}</AppText>
              <View className="flex-row flex-wrap gap-2">
                {quickReturnOptions.map((days) => (
                  <FilterChip
                    key={days}
                    label={t(trKey('loan.quickReturnDays'), { count: days })}
                    onPress={() => setQuickReturn(days)}
                    selected={quickReturnDays === days}
                  />
              ))}
              <FilterChip
                  label={t(trKey('loan.quickNoExpectedReturn'))}
                  onPress={() => {
                    setExpectedReturnAt(undefined);
                    setQuickReturnDays(undefined);
                    setErrors((current) => ({ ...current, expectedReturnAt: '' }));
                  }}
                  selected={!expectedReturnAt}
                />
              </View>
            </View>
          </SectionCard>
        </ScrollView>
        {confirmation.dialog}
      </View>

      <SafeAreaView className="border-t border-line bg-background" edges={['bottom']}>
        <View className="mx-auto w-full max-w-content px-screen pt-3">
          <ActionButton disabled={busy || app.isOffline} icon="checkOut" label={busy ? t(trKey('loan.submitting')) : t(trKey('loan.confirmCheckout'))} onPress={() => void submit()} />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function addLocalDays(value: string, days: QuickReturnDays) {
  const base = validDate(value) ?? new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

function minuteAfter(value: string) {
  const date = validDate(value);
  if (!date) return undefined;
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return date;
}
