import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { ActionButton, FormField, Notice, ScreenHeader, SectionCard, SectionTitle, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { maskContact, usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;

export default function KeyDetailRoute() {
  const params = useLocalSearchParams<{ cabinetId: string; keyId: string }>();
  const cabinetId = first(params.cabinetId);
  const keyId = first(params.keyId);
  const { locale, t } = useTranslation();
  const app = usePrototypeApp();
  const cabinet = app.cabinets.find((candidate) => candidate.id === cabinetId);
  const key = app.keys.find((candidate) => candidate.id === keyId && candidate.cabinetId === cabinetId);
  const keyDraftSource = JSON.stringify([key?.id, key?.name, key?.note]);
  const [draftSource, setDraftSource] = useState(keyDraftSource);
  const [name, setName] = useState(key?.name ?? '');
  const [note, setNote] = useState(key?.note ?? '');
  const [busy, setBusy] = useState(false);
  const confirmation = usePrototypeDialog();

  if (draftSource !== keyDraftSource) {
    setDraftSource(keyDraftSource);
    setName(key?.name ?? '');
    setNote(key?.note ?? '');
  }

  if (!cabinet || !key) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}>
          <ScreenHeader onBack={() => router.back()} title={t(trKey('key.notFoundTitle'))} />
          <StatePanel description={t(trKey('key.notFoundDescription'))} icon="key" title={t(trKey('key.notFoundTitle'))} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const statusTone = key.status === 'available' ? 'green' : key.status === 'overdue' ? 'red' : 'orange';
  const offlineWriteAllowed = app.offlineWritableCabinetIds.includes(cabinetId);
  const dirty = name.trim() !== key.name || note.trim() !== key.note;

  const update = async () => {
    if (!name.trim()) {
      Alert.alert(t(trKey('key.nameRequiredTitle')), t(trKey('key.nameRequired')));
      return;
    }
    setBusy(true);
    try {
      await app.updateKey({ keyId: key.id, name: name.trim(), note: note.trim() });
      Alert.alert(t(trKey('key.updatedTitle')), t(trKey('key.updatedDescription')));
    } catch {
      Alert.alert(t(trKey('key.actionFailedTitle')), t(trKey('key.actionFailedDescription')));
    } finally {
      setBusy(false);
    }
  };

  const returnKey = async () => {
    const loan = key.activeLoan;
    if (!loan) return;
    const returnedAt = new Date().toISOString();
    const confirmed = await confirmation.present({
      title: t(trKey('loan.returnTitle')),
      description: t(trKey('borrowed.returnConfirmationDescription'), {
        key: key.name,
        cabinet: cabinet.name,
        borrower: loan.borrowerName,
        checkedOutAt: formatDate(locale, loan.checkedOutAt),
        returnedAt: formatDate(locale, returnedAt),
      }),
      confirmLabel: t(trKey('loan.confirmReturn')),
      cancelLabel: t(trKey('loan.cancel')),
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await app.returnKey({ cabinetId, keyId: key.id, returnedAt });
      await confirmation.present({
        title: t(trKey('loan.returnedTitle')),
        description: t(trKey('loan.returnedDescription')),
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

  const deleteKey = async () => {
    if (key.activeLoan) {
      await confirmation.present({
        title: t(trKey('key.deleteBlockedTitle')),
        description: t(trKey('key.deleteBlockedDescription')),
        confirmLabel: t(trKey('loan.done')),
        tone: 'danger',
      });
      return;
    }
    const confirmed = await confirmation.present({
      title: t(trKey('key.deleteTitle')),
      description: t(trKey('key.deleteDescription'), { key: key.name }),
      confirmLabel: t(trKey('key.deleteConfirm')),
      cancelLabel: t(trKey('loan.cancel')),
      tone: 'danger',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await app.deleteKey({ keyId: key.id });
      await confirmation.present({
        title: t(trKey('key.deletedTitle')),
        description: t(trKey('key.deletedDescription')),
        confirmLabel: t(trKey('loan.done')),
      });
      router.back();
    } catch {
      await confirmation.present({
        title: t(trKey('key.actionFailedTitle')),
        description: t(trKey('key.actionFailedDescription')),
        confirmLabel: t(trKey('loan.done')),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const primaryAction = key.status === 'available' ? null : (
    <ActionButton disabled={busy || (app.isOffline && !offlineWriteAllowed)} icon="return" label={t(trKey('loan.returnAction'))} onPress={() => void returnKey()} />
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
          <ScreenHeader
            action={<Pill tone={statusTone}>{t(trKey(`key.status.${key.status}`))}</Pill>}
            onBack={() => router.back()}
            subtitle={t(trKey('key.slotNumber'), { number: key.slotNumber })}
            title={key.name}
          />
        </View>
      </View>

      <View className="mx-auto min-w-0 w-full max-w-content flex-1 px-screen pb-screen pt-screen">
        <ScrollView className="min-w-0 flex-1" contentContainerClassName="gap-4 pb-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {app.isOffline ? <Notice description={offlineWriteAllowed ? t('common.offlineSingleUser') : t('common.offlineSharedReadOnly')} title={t(trKey('key.offlineTitle'))} tone="warning" /> : null}
          {key.activeLoan ? (
            <SectionCard>
              <SectionTitle title={t(trKey('loan.activeDetailTitle'))} />
              <DetailRow label={t(trKey('loan.borrowerName'))} value={key.activeLoan.borrowerName} />
              <DetailRow label={t(trKey('loan.borrowerContact'))} value={maskContact(key.activeLoan.borrowerContact) || t(trKey('loan.notProvided'))} />
              <DetailRow label={t(trKey('loan.checkedOutAt'))} value={formatDate(locale, key.activeLoan.checkedOutAt)} />
              <DetailRow
                label={t(trKey('loan.expectedReturnAt'))}
                value={key.activeLoan.expectedReturnAt ? formatDate(locale, key.activeLoan.expectedReturnAt) : t(trKey('loan.noExpectedReturn'))}
              />
            </SectionCard>
          ) : null}

          <SectionCard>
            <SectionTitle title={t(trKey('key.detailsTitle'))} />
            {key.activeLoan ? (
              <>
                <DetailRow label={t(trKey('key.nameLabel'))} value={key.name} />
                <DetailRow label={t(trKey('key.noteLabel'))} value={key.note.trim() || t(trKey('loan.notProvided'))} />
              </>
            ) : (
              <>
                <FormField label={t(trKey('key.nameLabel'))} onChangeText={setName} placeholder={t(trKey('key.namePlaceholder'))} value={name} />
                <FormField label={t(trKey('key.noteLabel'))} multiline onChangeText={setNote} placeholder={t(trKey('key.notePlaceholder'))} value={note} />
                <ActionButton disabled={!dirty || busy || (app.isOffline && !offlineWriteAllowed)} icon="settings" label={busy ? t(trKey('key.saving')) : t(trKey('key.saveChanges'))} onPress={() => void update()} tone="neutral" />
                <ActionButton
                  disabled={busy || (app.isOffline && !offlineWriteAllowed)}
                  icon="error"
                  label={t(trKey('key.deleteAction'))}
                  onPress={() => void deleteKey()}
                  tone="danger"
                />
              </>
            )}
          </SectionCard>
        </ScrollView>
        {confirmation.dialog}
      </View>

      {primaryAction ? (
        <View className="border-t border-line bg-background">
          <View className="mx-auto w-full max-w-content px-screen py-3">{primaryAction}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-line pb-3">
      <AppText className="flex-1" variant="body" tone="muted">{label}</AppText>
      <AppText className="max-w-[62%] text-right" selectable variant="label" tone="foreground">{value}</AppText>
    </View>
  );
}

function formatDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
