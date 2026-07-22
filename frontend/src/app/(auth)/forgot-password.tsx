import { Href, Redirect, router } from 'expo-router';
import { useState } from 'react';

import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
  AuthTextButton,
} from '@/features/auth/components/auth-ui';
import {
  authErrorKey,
  isValidEmail,
  normalizeEmail,
  rememberResetChallenge,
  useAuthActions,
} from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';
import { localPasswordResetEnabled } from '@/mocks';

const signInRoute = '/(auth)/sign-in' as Href;

export default function ForgotPasswordRoute() {
  const { t } = useTranslation();
  const { actions } = useAuthActions();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!localPasswordResetEnabled) return <Redirect href={signInRoute} />;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(signInRoute);
  }

  async function submit() {
    const nextEmail = normalizeEmail(email);
    const nextEmailError = isValidEmail(nextEmail) ? '' : t('auth.validation.email');

    setEmailError(nextEmailError);
    setRequestError('');
    if (nextEmailError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const challenge = await actions.requestPasswordReset(nextEmail);
      rememberResetChallenge({
        challengeId: challenge.challengeId,
        email: nextEmail,
      });
      router.push({
        pathname: '/(auth)/verify-reset',
        params: { challengeId: challenge.challengeId },
      } as unknown as Href);
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      backLabel={t('auth.common.back')}
      description={t('auth.forgotPassword.description')}
      footer={
        <AuthTextButton label={t('auth.forgotPassword.backToSignIn')} onPress={() => router.replace(signInRoute)} />
      }
      onBack={goBack}
      title={t('auth.forgotPassword.title')}>
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        keyboardType="email-address"
        label={t('auth.fields.email')}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError('');
        }}
        onSubmitEditing={() => void submit()}
        placeholder={t('auth.fields.emailPlaceholder')}
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />

      {requestError ? <AuthErrorNotice text={requestError} /> : null}

      <AuthPrimaryButton
        busy={isSubmitting}
        busyLabel={t('auth.forgotPassword.sending')}
        label={t('auth.forgotPassword.submit')}
        onPress={() => void submit()}
      />
    </AuthScreen>
  );
}
