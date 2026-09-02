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

export function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        title={t('account.changePassword')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const validate = () => {
    if (!currentPassword) return t('auth.validation.passwordRequired');
    if (currentPassword.length < 8 || newPassword.length < 8) {
      return t('auth.validation.passwordLength');
    }
    if (newPassword !== confirmPassword) return t('auth.validation.passwordMismatch');
    return '';
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await actions.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
      description={t('auth.resetPassword.description')}
      onBack={() => router.back()}
      title={t('account.changePassword')}>
      {success ? (
        <FeedbackBanner message={t('auth.resetPassword.successDescription')} tone="success" />
      ) : null}
      {error ? <AuthErrorNotice text={error} /> : null}

      <View className="gap-5 rounded-card border border-line bg-surface p-card shadow-card">
        <AuthField
          autoCapitalize="none"
          label={t('account.currentPassword')}
          onChangeText={(value) => {
            setCurrentPassword(value);
            setError('');
            setSuccess(false);
          }}
          placeholder={t('auth.fields.passwordPlaceholder')}
          secureTextEntry
          textContentType="password"
          value={currentPassword}
        />
        <AuthField
          autoCapitalize="none"
          helper={t('auth.fields.passwordHelper')}
          label={t('auth.fields.newPassword')}
          onChangeText={(value) => {
            setNewPassword(value);
            setError('');
            setSuccess(false);
          }}
          placeholder={t('auth.fields.newPasswordPlaceholder')}
          secureTextEntry
          textContentType="newPassword"
          value={newPassword}
        />
        <AuthField
          autoCapitalize="none"
          label={t('auth.fields.confirmPassword')}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setError('');
            setSuccess(false);
          }}
          onSubmitEditing={() => void submit()}
          placeholder={t('auth.fields.confirmPasswordPlaceholder')}
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
        <AuthPrimaryButton
          busy={busy}
          busyLabel={t('auth.resetPassword.saving')}
          disabled={!state.online}
          label={t('account.changePassword')}
          onPress={() => void submit()}
        />
      </View>

      {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}
    </AccountPage>
  );
}
