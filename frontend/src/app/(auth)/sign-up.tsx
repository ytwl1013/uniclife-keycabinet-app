import { Href, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
  AuthTextButton,
  ConsentRow,
} from '@/features/auth/components/auth-ui';
import {
  authErrorKey,
  isValidEmail,
  normalizeEmail,
  useAuthActions,
} from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

const signInRoute = '/(auth)/sign-in' as Href;
const onboardingRoute = '/onboarding' as Href;

export default function SignUpRoute() {
  const { locale, t } = useTranslation();
  const { actions } = useAuthActions();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [consentError, setConsentError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    const nextEmail = normalizeEmail(email);
    const nextDisplayNameError = displayName.trim() ? '' : t('auth.validation.adminName');
    const nextEmailError = isValidEmail(nextEmail) ? '' : t('auth.validation.email');
    const nextPasswordError = password.length >= 8 ? '' : t('auth.validation.passwordLength');
    const nextConfirmError = password === confirmPassword ? '' : t('auth.validation.passwordMismatch');
    const nextConsentError =
      acceptedTerms && acceptedPrivacy ? '' : t('auth.validation.requiredConsents');

    setDisplayNameError(nextDisplayNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setConsentError(nextConsentError);
    setRequestError('');

    if (nextDisplayNameError || nextEmailError || nextPasswordError || nextConfirmError || nextConsentError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await actions.register({
        displayName: displayName.trim(),
        email: nextEmail,
        password,
        locale,
        acceptedTerms,
        acceptedPrivacy,
      });
      router.replace(onboardingRoute);
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      description={t('auth.signUp.description')}
      footer={
        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <AppText variant="caption" tone="muted">
            {t('auth.signUp.hasAccount')}
          </AppText>
          <AuthTextButton label={t('auth.signUp.signIn')} onPress={() => router.replace(signInRoute)} />
        </View>
      }>
      <AuthField
        autoCapitalize="words"
        autoComplete="name"
        error={displayNameError}
        label={t('auth.fields.adminName')}
        onChangeText={(value) => {
          setDisplayName(value);
          setDisplayNameError('');
        }}
        placeholder={t('auth.fields.adminNamePlaceholder')}
        returnKeyType="next"
        textContentType="name"
        value={displayName}
      />

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
        autoComplete="new-password"
        error={passwordError}
        helper={t('auth.fields.passwordHelper')}
        label={t('auth.fields.password')}
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

      <View className="gap-2 rounded-card border border-line bg-surface p-3.5">
        <ConsentRow
          checked={acceptedTerms}
          label={t('auth.signUp.acceptTerms')}
          onPress={() => {
            setAcceptedTerms((value) => !value);
            setConsentError('');
          }}
        />
        <AuthTextButton
          align="start"
          label={t('legal.termsTitle')}
          onPress={() => router.push('/(auth)/terms' as Href)}
        />
        <ConsentRow
          checked={acceptedPrivacy}
          label={t('auth.signUp.acceptPrivacy')}
          onPress={() => {
            setAcceptedPrivacy((value) => !value);
            setConsentError('');
          }}
        />
        <AuthTextButton
          align="start"
          label={t('legal.privacyTitle')}
          onPress={() => router.push('/(auth)/privacy' as Href)}
        />
      </View>

      {consentError ? <AuthErrorNotice text={consentError} /> : null}
      {requestError ? <AuthErrorNotice text={requestError} /> : null}

      <AuthPrimaryButton
        busy={isSubmitting}
        busyLabel={t('auth.signUp.creating')}
        label={t('auth.signUp.submit')}
        onPress={() => void submit()}
      />
    </AuthScreen>
  );
}
