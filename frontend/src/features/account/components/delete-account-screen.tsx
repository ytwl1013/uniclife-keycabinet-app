import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useApp } from '@/app-state';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

import { AccountLoading, AccountPage, ConfirmationPanel, FeedbackBanner } from './account-ui';

export function DeleteAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!state.hydrated) return <AccountLoading label={t('common.loading')} />;

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('account.deleteAccount')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton icon="person" label={t('auth.welcome.signIn')} onPress={() => router.replace('/(auth)/sign-in')} />
      </AccountPage>
    );
  }

  const deleteAccount = async () => {
    setBusy(true);
    setError('');
    try {
      await actions.deleteAccount({
        expectedVersion: state.version,
        requestId: `delete-account-${currentUser.id}-${state.version}`,
      });
      router.replace('/(auth)/sign-in');
    } catch (caught) {
      setError(t(authErrorKey(caught)));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.deleteDescription')}
      onBack={() => router.back()}
      title={t('account.deleteAccount')}>
      {error ? <AuthErrorNotice text={error} /> : null}
      <View className="gap-4 rounded-card border border-line bg-surface p-card shadow-card">
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-danger-soft">
          <AppIcon name="person" size={24} tone="danger" />
        </View>
        <AppText tone="content">{t('account.deleteDescription')}</AppText>
        <FeedbackBanner message={t('account.deleteAdminMemberships')} tone="warning" />
      </View>

      {confirming ? (
        <ConfirmationPanel
          cancelLabel={t('common.cancel')}
          confirmLabel={busy ? t('auth.common.working') : t('account.deleteConfirm')}
          description={t('account.deleteDescription')}
          destructive
          disabled={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void deleteAccount()}
          title={t('account.deleteTitle')}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !state.online }}
          className={`min-h-12 items-center justify-center rounded-control bg-danger px-5 py-3 active:opacity-75 ${!state.online ? 'opacity-45' : ''}`}
          disabled={!state.online}
          onPress={() => setConfirming(true)}>
          <AppText variant="label" tone="onBrand">{t('account.deleteConfirm')}</AppText>
        </Pressable>
      )}

      {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}
    </AccountPage>
  );
}
