import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DateTimeField } from '@/components/ui/date-time-field';
import { isExpectedReturnAfter } from '@/components/ui/date-time';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { ActionButton, FormField, Notice, ScreenHeader, SectionCard, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;

export default function CheckOutKeyRoute() {
  const params = useLocalSearchParams<{ cabinetId: string; keyId: string }>();
  const cabinetId = first(params.cabinetId);
  const keyId = first(params.keyId);
  const { t } = useTranslation();
  const app = usePrototypeApp();
  const cabinet = app.cabinets.find((candidate) => candidate.id === cabinetId);
  const key = app.keys.find((candidate) => candidate.id === keyId && candidate.cabinetId === cabinetId);
  const defaults = useMemo(() => {
    const start = new Date(app.now);
    const due = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), due: due.toISOString() };
  }, [app.now]);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [checkedOutAt, setCheckedOutAt] = useState(defaults.start);
  const [expectedReturnAt, setExpectedReturnAt] = useState(defaults.due);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const confirmation = usePrototypeDialog();

  if (!cabinet || !key || key.status !== 'available') {
    return (
      <AppScreen>
        <ScreenHeader onBack={() => router.back()} title={t(trKey('loan.checkOutTitle'))} />
        <StatePanel description={t(trKey('loan.unavailableDescription'))} icon="key" title={t(trKey('loan.unavailableTitle'))} />
        {confirmation.dialog}
      </AppScreen>
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    const checkedOut = new Date(checkedOutAt);
    const due = new Date(expectedReturnAt);
    if (!borrowerName.trim()) next.borrowerName = t(trKey('loan.borrowerRequired'));
    if (Number.isNaN(checkedOut.getTime())) next.checkedOutAt = t(trKey('loan.invalidDate'));
    if (Number.isNaN(due.getTime())) next.expectedReturnAt = t(trKey('loan.invalidDate'));
    if (!next.checkedOutAt && !next.expectedReturnAt && !isExpectedReturnAfter(checkedOutAt, expectedReturnAt)) next.expectedReturnAt = t(trKey('loan.dueAfterCheckout'));
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
        expectedReturnAt: new Date(expectedReturnAt).toISOString(),
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

  return (
    <AppScreen contentClassName="gap-4 pb-screen" keyboardAware scroll={false}>
      <ScreenHeader onBack={() => router.back()} subtitle={cabinet.name} title={t(trKey('loan.checkOutKey'), { key: key.name })} />
      <ScrollView contentContainerClassName="gap-4 pb-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
            onChange={(value) => { setCheckedOutAt(value); setErrors((current) => ({ ...current, checkedOutAt: '' })); }}
            timeZone={cabinet.timezone}
            value={checkedOutAt}
          />
          <DateTimeField
            error={errors.expectedReturnAt}
            label={t(trKey('loan.expectedReturnAt'))}
            onChange={(value) => { setExpectedReturnAt(value); setErrors((current) => ({ ...current, expectedReturnAt: '' })); }}
            timeZone={cabinet.timezone}
            value={expectedReturnAt}
          />
        </SectionCard>
      </ScrollView>
      <ActionButton disabled={busy || app.isOffline} icon="checkOut" label={busy ? t(trKey('loan.submitting')) : t(trKey('loan.confirmCheckout'))} onPress={() => void submit()} />
      {confirmation.dialog}
    </AppScreen>
  );
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
