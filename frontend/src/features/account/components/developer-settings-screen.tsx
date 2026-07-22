import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';
import { useMockApp } from '@/mocks';

import {
  AccountLoading,
  AccountPage,
  AccountSection,
  ConfirmationPanel,
  FeedbackBanner,
  SettingsAction,
} from './account-ui';

type PendingAction = 'network' | 'switch-account' | 'advance-time' | 'restore' | 'reset' | null;

export function DeveloperSettingsScreen() {
  const router = useRouter();
  const { formatDateTime, t } = useTranslation();
  const { actions, currentUser, state } = useMockApp();
  const [pending, setPending] = useState<PendingAction>(null);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showSampleQr, setShowSampleQr] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const activeUsers = useMemo(() => state.users.filter((user) => user.status === 'active'), [state.users]);
  const recoverableBatch = useMemo(
    () => state.clearBatches
      .filter((batch) => batch.status === 'restorable' && Date.parse(batch.recoverableUntil) >= Date.parse(state.now))
      .sort((left, right) => Date.parse(right.clearedAt) - Date.parse(left.clearedAt))[0],
    [state.clearBatches, state.now],
  );
  const sampleQr = useMemo(
    () => state.qrs.find((qr) => qr.status === 'active'),
    [state.qrs],
  );

  if (!state.hydrated) return <AccountLoading label={t('common.loading')} />;

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage backLabel={t('auth.common.back')} description={t('auth.errors.sessionExpired')} onBack={() => router.back()} title={t('account.developerSettings')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton icon="person" label={t('auth.welcome.signIn')} onPress={() => router.replace('/(auth)/sign-in')} />
      </AccountPage>
    );
  }

  const fail = (caught: unknown) => setFeedback({ message: t(authErrorKey(caught)), tone: 'danger' });
  const complete = () => setFeedback({ message: t('account.actionComplete'), tone: 'success' });

  const updateNetwork = async () => {
    setPending('network');
    setFeedback(null);
    try {
      await actions.setOnline({ online: !state.online });
      complete();
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const switchAccount = async (userId: string) => {
    setPending('switch-account');
    setFeedback(null);
    try {
      await actions.switchAccount({ userId });
      setShowAccounts(false);
      complete();
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const advanceTime = async () => {
    setPending('advance-time');
    setFeedback(null);
    try {
      await actions.advanceTime({ days: 8 });
      complete();
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const restoreLatestBatch = async () => {
    if (!recoverableBatch) return;
    setPending('restore');
    setFeedback(null);
    try {
      await actions.restoreClearBatch({
        batchId: recoverableBatch.id,
        expectedVersion: state.version,
        requestId: `restore-${recoverableBatch.id}-${state.version}`,
      });
      setFeedback({ message: t('account.recoverySuccess'), tone: 'success' });
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const resetData = async () => {
    setPending('reset');
    setFeedback(null);
    try {
      await actions.resetData();
      setConfirmReset(false);
      setShowAccounts(false);
      complete();
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.developerDescription')}
      onBack={() => router.back()}
      title={t('account.developerSettings')}>
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}
      <AccountSection icon="settings" title={t('account.developerTools')}>
        <SettingsAction
          detail={state.online ? t('common.online') : t('common.offline')}
          disabled={pending === 'network'}
          icon="notification"
          label={state.online ? t('account.goOffline') : t('account.goOnline')}
          onPress={() => void updateNetwork()}
          selected={state.online}
        />
        <SettingsAction
          detail={currentUser.email}
          disabled={pending === 'switch-account'}
          icon="team"
          label={t('account.switchAccount')}
          onPress={() => setShowAccounts((value) => !value)}
          selected={showAccounts}
        />
        {showAccounts ? (
          <View className="gap-2 rounded-control bg-background p-2">
            {activeUsers.map((user) => {
              const selected = user.id === currentUser.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: selected, selected }}
                  className={`flex-row items-center gap-3 rounded-control px-3 py-3 ${selected ? 'bg-brand-soft' : 'bg-surface'} active:opacity-70`}
                  disabled={selected || pending === 'switch-account'}
                  key={user.id}
                  onPress={() => void switchAccount(user.id)}>
                  <AppIcon name="person" size={20} tone={selected ? 'brand' : 'muted'} />
                  <View className="min-w-0 flex-1">
                    <AppText numberOfLines={1} variant="label" tone="foreground">{user.displayName}</AppText>
                    <AppText numberOfLines={1} variant="caption" tone="muted">{user.email}</AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <SettingsAction
          detail={formatDateTime(state.now)}
          disabled={pending === 'advance-time'}
          icon="calendar"
          label={t('account.advanceTime')}
          onPress={() => void advanceTime()}
        />
        <SettingsAction
          detail={recoverableBatch ? formatDateTime(recoverableBatch.recoverableUntil) : t('account.noRecovery')}
          disabled={!recoverableBatch || !state.online || pending === 'restore'}
          icon="return"
          label={t('account.restoreClear')}
          onPress={() => void restoreLatestBatch()}
        />
        <SettingsAction
          detail={t('account.sampleQrDescription')}
          icon="scan"
          label={showSampleQr ? t('account.hideSampleQr') : t('account.sampleQr')}
          onPress={() => setShowSampleQr((value) => !value)}
          selected={showSampleQr}
        />
        {showSampleQr && sampleQr ? (
          <View className="items-center gap-3 rounded-control border border-line bg-background p-4">
            <View
              accessible
              accessibilityLabel={t('account.sampleQr')}
              accessibilityRole="image"
              className="rounded-control bg-white p-3">
              <QRCode backgroundColor="#FFFFFF" color="#071126" quietZone={8} size={220} value={sampleQr.code} />
            </View>
            <AppText className="text-center" selectable variant="caption" tone="muted">
              {sampleQr.code}
            </AppText>
          </View>
        ) : null}
        <SettingsAction icon="error" label={t('account.resetData')} onPress={() => setConfirmReset(true)} tone="danger" />
        {confirmReset ? (
          <ConfirmationPanel
            cancelLabel={t('common.cancel')}
            confirmLabel={pending === 'reset' ? t('auth.common.working') : t('common.confirm')}
            description={t('account.resetConfirmDescription')}
            destructive
            disabled={pending === 'reset'}
            onCancel={() => setConfirmReset(false)}
            onConfirm={() => void resetData()}
            title={t('account.resetConfirmTitle')}
          />
        ) : null}
      </AccountSection>
    </AccountPage>
  );
}
