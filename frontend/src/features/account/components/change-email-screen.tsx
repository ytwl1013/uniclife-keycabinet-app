import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useApp } from '@/app-state';
import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

import { AccountLoading, AccountPage, FeedbackBanner } from './account-ui';

export function ChangeEmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('account.changeEmail')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(t('auth.validation.email'));
      return;
    }
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await actions.updateEmail({
        email: normalizedEmail,
        expectedVersion: state.version,
        requestId: `update-email-${currentUser.id}-${state.version}`,
      });
      setEmail(normalizedEmail);
      setSuccess(true);
    } catch (caught) {
      setError(t(authErrorKey(caught)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.changeEmailDescription')}
      onBack={() => router.back()}
      title={t('account.changeEmail')}>
      {success ? <FeedbackBanner message={t('account.emailUpdated')} tone="success" /> : null}
      {error ? <AuthErrorNotice text={error} /> : null}

      <View className="gap-5 rounded-card border border-line bg-surface p-card shadow-card">
        <AuthField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label={t('account.loginEmail')}
          onChangeText={(value) => {
            setEmail(value);
            setError('');
            setSuccess(false);
          }}
          onSubmitEditing={() => void submit()}
          placeholder={t('auth.fields.emailPlaceholder')}
          returnKeyType="done"
          textContentType="emailAddress"
          value={email}
        />
        <AuthPrimaryButton
          busy={busy}
          busyLabel={t('auth.common.working')}
          disabled={!state.online}
          label={t('account.changeEmail')}
          onPress={() => void submit()}
        />
      </View>

      {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}
    </AccountPage>
  );
}
