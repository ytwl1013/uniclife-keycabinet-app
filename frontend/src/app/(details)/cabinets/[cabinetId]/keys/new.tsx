import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { usePrototypeDialog } from '@/features/cabinet-prototype/components/prototype-dialog';
import { ActionButton, FormField, Notice, ScreenHeader, SectionCard, StatePanel } from '@/features/cabinet-prototype/components/prototype-ui';
import { usePrototypeApp } from '@/features/cabinet-prototype/use-prototype-app';
import { TranslationKey, useTranslation } from '@/i18n';

const trKey = (key: string) => key as TranslationKey;

export default function AddKeyRoute() {
  const params = useLocalSearchParams<{ cabinetId: string; slotId: string; slotNumber?: string }>();
  const cabinetId = first(params.cabinetId);
  const slotId = first(params.slotId);
  const { t } = useTranslation();
  const app = usePrototypeApp();
  const cabinet = app.cabinets.find((candidate) => candidate.id === cabinetId);
  const slot = app.slots.find((candidate) => candidate.id === slotId && candidate.cabinetId === cabinetId);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const confirmation = usePrototypeDialog();

  const submit = async () => {
    if (!name.trim()) {
      setNameError(t(trKey('key.nameRequired')));
      return;
    }
    if (!slot || slot.keyId) return;
    setBusy(true);
    try {
      await app.addKey({ cabinetId, slotId, name: name.trim(), note: note.trim() });
      await confirmation.present({
        title: t(trKey('key.addedTitle')),
        description: t(trKey('key.addedDescription')),
        confirmLabel: t(trKey('key.done')),
      });
      router.back();
    } catch {
      await confirmation.present({
        title: t(trKey('key.actionFailedTitle')),
        description: t(trKey('key.actionFailedDescription')),
        confirmLabel: t(trKey('key.done')),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!cabinet || !slot || slot.keyId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ScreenHeader onBack={() => router.back()} title={t(trKey('key.addKey'))} />
          <StatePanel description={t(trKey('key.slotUnavailableDescription'))} icon="key" title={t(trKey('key.slotUnavailableTitle'))} />
          {confirmation.dialog}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <View className="border-b border-line bg-background">
          <View className="mx-auto w-full max-w-content px-screen py-3">
            <ScreenHeader onBack={() => router.back()} subtitle={cabinet.name} title={t(trKey('key.addToSlot'), { number: slot.number })} />
          </View>
        </View>

        <ScrollView
          automaticallyAdjustKeyboardInsets
          className="min-w-0 flex-1"
          contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {app.isOffline ? <Notice description={t(trKey('key.offlineDescription'))} title={t(trKey('key.offlineTitle'))} tone="warning" /> : null}
          <SectionCard>
            <AppText variant="title" tone="foreground">{t(trKey('key.detailsTitle'))}</AppText>
            <AppText variant="body" tone="muted">{t(trKey('key.addDescription'))}</AppText>
            <FormField
              error={nameError}
              label={t(trKey('key.nameLabel'))}
              onChangeText={(value) => { setName(value); setNameError(undefined); }}
              placeholder={t(trKey('key.namePlaceholder'))}
              value={name}
            />
            <FormField label={t(trKey('key.noteLabel'))} multiline onChangeText={setNote} placeholder={t(trKey('key.notePlaceholder'))} value={note} />
          </SectionCard>
          <Notice description={t(trKey('key.auditNoticeDescription'))} title={t(trKey('key.auditNoticeTitle'))} />
          {confirmation.dialog}
        </ScrollView>

        <SafeAreaView className="border-t border-line bg-background" edges={['bottom']}>
          <View className="mx-auto w-full max-w-content px-screen py-3">
            <ActionButton disabled={busy || app.isOffline} icon="key" label={busy ? t(trKey('key.saving')) : t(trKey('key.addAction'))} onPress={() => void submit()} />
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
