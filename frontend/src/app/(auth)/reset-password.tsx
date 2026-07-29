import { Href, Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
} from '@/features/auth/components/auth-ui';
import {
  authErrorKey,
  clearResetChallenge,
  getResetChallenge,
  useAuthActions,
} from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';
import { localPasswordResetEnabled } from '@/mocks';

const signInRoute = '/(auth)/sign-in' as Href;
const forgotPasswordRoute = '/(auth)/forgot-password' as Href;

export default function ResetPasswordRoute() {
  const { t } = useTranslation();
  const { actions } = useAuthActions();
  const params = useLocalSearchParams<{ challengeId?: string }>();
  const challengeId = typeof params.challengeId === 'string' ? params.challengeId : '';
  const challenge = challengeId ? getResetChallenge(challengeId) : undefined;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  if (!localPasswordResetEnabled) return <Redirect href={signInRoute} />;

  async function submit() {
    const nextPasswordError = password.length >= 8 ? '' : t('auth.validation.passwordLength');
    const nextConfirmError = password === confirmPassword ? '' : t('auth.validation.passwordMismatch');
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setRequestError('');

    if (nextPasswordError || nextConfirmError || !challenge?.resetToken) {
      return;
    }

    setIsSubmitting(true);
    try {
      await actions.resetPassword(challenge.resetToken, password);
      clearResetChallenge(challenge.challengeId);
      setPassword('');
      setConfirmPassword('');
      setIsComplete(true);
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <>
        <Stack.Screen options={{ title: t('auth.resetPassword.successTitle') }} />
        <AuthScreen description={t('auth.resetPassword.successDescription')}>
          <AuthPrimaryButton
            busyLabel={t('auth.common.working')}
            label={t('auth.resetPassword.backToSignIn')}
            onPress={() => router.replace(signInRoute)}
          />
        </AuthScreen>
      </>
    );
  }

  return (
    <AuthScreen
      description={t('auth.resetPassword.description')}>
      {challenge?.resetToken ? (
        <>
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            error={passwordError}
            helper={t('auth.fields.passwordHelper')}
            label={t('auth.fields.newPassword')}
            onChangeText={(value) => {
              setPassword(value);
              setPasswordError('');
            }}
            placeholder={t('auth.fields.newPasswordPlaceholder')}
            returnKeyType="next"
            secureTextEntry
            textContentType="newPassword"
            value={password}
          />
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            error={confirmError}
            label={t('auth.fields.confirmPassword')}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setConfirmError('');
            }}
            onSubmitEditing={() => void submit()}
            placeholder={t('auth.fields.confirmPasswordPlaceholder')}
            returnKeyType="done"
            secureTextEntry
            textContentType="newPassword"
            value={confirmPassword}
          />
          {requestError ? <AuthErrorNotice text={requestError} /> : null}
          <AuthPrimaryButton
            busy={isSubmitting}
            busyLabel={t('auth.resetPassword.saving')}
            label={t('auth.resetPassword.submit')}
            onPress={() => void submit()}
          />
        </>
      ) : (
        <>
          <AuthErrorNotice text={t('auth.errors.expiredCode')} />
          <AuthPrimaryButton
            busyLabel={t('auth.common.working')}
            label={t('auth.resetPassword.restart')}
            onPress={() => router.replace(forgotPasswordRoute)}
          />
        </>
      )}
    </AuthScreen>
  );
}
