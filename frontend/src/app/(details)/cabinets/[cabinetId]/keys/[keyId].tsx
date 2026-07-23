import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { PrototypeEventList } from '@/features/cabinet-prototype/components/event-list';
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
  const [name, setName] = useState(key?.name ?? '');
  const [note, setNote] = useState(key?.note ?? '');
  const [busy, setBusy] = useState(false);
  const confirmation = usePrototypeDialog();

  useEffect(() => {
    setName(key?.name ?? '');
    setNote(key?.note ?? '');
  }, [key?.name, key?.note]);

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

  const history = app.events.filter((event) => event.keyId === key.id);
  const statusTone = key.status === 'available' ? 'green' : key.status === 'overdue' ? 'red' : 'orange';
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
    const confirmed = await confirmation.present({
      title: t(trKey('loan.returnTitle')),
      description: t(trKey('loan.returnDescription'), { key: key.name }),
      confirmLabel: t(trKey('loan.confirmReturn')),
      cancelLabel: t(trKey('loan.cancel')),
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await app.returnKey({ cabinetId, keyId: key.id, returnedAt: app.now });
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
      setBusy(false);
    }
  };

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

  const primaryAction = key.status === 'available' ? (
    <ActionButton
      disabled={busy || app.isOffline}
      icon="checkOut"
      label={t(trKey('loan.checkOutAction'))}
      onPress={() => router.push({ pathname: '/cabinets/[cabinetId]/loans/[keyId]', params: { cabinetId, keyId } } as never)}
    />
  ) : (
    <ActionButton disabled={busy || app.isOffline} icon="return" label={t(trKey('loan.returnAction'))} onPress={() => void returnKey()} />
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
          {app.isOffline ? <Notice description={t(trKey('key.offlineDescription'))} title={t(trKey('key.offlineTitle'))} tone="warning" /> : null}
          {key.activeLoan ? (
            <SectionCard>
              <SectionTitle title={t(trKey('loan.activeDetailTitle'))} />
              <DetailRow label={t(trKey('loan.borrowerName'))} value={key.activeLoan.borrowerName} />
              <DetailRow label={t(trKey('loan.borrowerContact'))} value={maskContact(key.activeLoan.borrowerContact) || t(trKey('loan.notProvided'))} />
              <DetailRow label={t(trKey('loan.checkedOutAt'))} value={formatDate(locale, key.activeLoan.checkedOutAt)} />
              <DetailRow label={t(trKey('loan.expectedReturnAt'))} value={formatDate(locale, key.activeLoan.expectedReturnAt)} />
            </SectionCard>
          ) : null}

          <SectionCard>
            <SectionTitle title={t(trKey('key.detailsTitle'))} />
            <FormField label={t(trKey('key.nameLabel'))} onChangeText={setName} placeholder={t(trKey('key.namePlaceholder'))} value={name} />
            <FormField label={t(trKey('key.noteLabel'))} multiline onChangeText={setNote} placeholder={t(trKey('key.notePlaceholder'))} value={note} />
            <ActionButton disabled={!dirty || busy || app.isOffline} icon="settings" label={busy ? t(trKey('key.saving')) : t(trKey('key.saveChanges'))} onPress={() => void update()} tone="neutral" />
          </SectionCard>

          <SectionCard>
            <SectionTitle title={t(trKey('key.historyTitle'))} />
            <PrototypeEventList currentUserId={app.currentUserId} emptyLabel={t(trKey('key.historyEmpty'))} events={history} onUndo={(event) => void undo(event.id)} />
          </SectionCard>
        </ScrollView>
        {confirmation.dialog}
      </View>

      <View className="border-t border-line bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">{primaryAction}</View>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-line pb-3">
      <AppText className="flex-1" variant="body" tone="muted">{label}</AppText>
      <AppText className="max-w-[62%] text-right" variant="label" tone="foreground">{value}</AppText>
    </View>
  );
}

function formatDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
