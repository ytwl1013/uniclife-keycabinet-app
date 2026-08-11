import { Href, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
  AuthSecondaryButton,
  AuthTextButton,
} from '@/features/auth/components/auth-ui';
import {
  authErrorKey,
  isValidEmail,
  normalizeEmail,
  useAuthActions,
} from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';
import { localPasswordResetEnabled, useMockApp } from '@/mocks';

const signUpRoute = '/(auth)/sign-up' as Href;
const forgotPasswordRoute = '/(auth)/forgot-password' as Href;
const onboardingRoute = '/onboarding' as Href;

export default function SignInRoute() {
  const { t } = useTranslation();
  const { actions } = useAuthActions();
  const { actions: workspaceActions, state } = useMockApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const demoOwner = state.users.find((user) =>
    state.memberships.some((membership) => membership.userId === user.id && membership.role === 'admin'),
  );

  async function submit() {
    const nextEmail = normalizeEmail(email);
    const nextEmailError = isValidEmail(nextEmail) ? '' : t('auth.validation.email');
    const nextPasswordError = password ? '' : t('auth.validation.passwordRequired');

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setRequestError('');

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await actions.signIn({ email: nextEmail, password });
      router.replace(onboardingRoute);
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      description={t('auth.signIn.description')}
      footer={
        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <AppText variant="caption" tone="muted">
            {t('auth.signIn.noAccount')}
          </AppText>
          <AuthTextButton label={t('auth.signIn.createAccount')} onPress={() => router.push(signUpRoute)} />
        </View>
      }>
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
        placeholder={t('auth.fields.emailPlaceholder')}
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />

      <AuthField
        autoCapitalize="none"
        autoComplete="current-password"
        error={passwordError}
        label={t('auth.fields.password')}
        onChangeText={(value) => {
          setPassword(value);
          setPasswordError('');
        }}
        onSubmitEditing={() => void submit()}
        placeholder={t('auth.fields.passwordPlaceholder')}
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
      />

      {localPasswordResetEnabled ? (
        <AuthTextButton
          align="end"
          label={t('auth.signIn.forgotPassword')}
          onPress={() => router.push(forgotPasswordRoute)}
        />
      ) : null}

      {requestError ? <AuthErrorNotice text={requestError} /> : null}

      <AuthPrimaryButton
        busy={isSubmitting}
        busyLabel={t('auth.signIn.signingIn')}
        label={t('auth.signIn.submit')}
        onPress={() => void submit()}
      />

      {demoOwner ? (
        <AuthSecondaryButton
          icon="cabinet"
          label={t('auth.signIn.useDemo')}
          onPress={() => {
            setIsSubmitting(true);
            void workspaceActions.switchAccount({ userId: demoOwner.id })
              .then(() => router.replace(onboardingRoute))
              .catch((error) => setRequestError(t(authErrorKey(error))))
              .finally(() => setIsSubmitting(false));
          }}
        />
      ) : null}
    </AuthScreen>
  );
}
