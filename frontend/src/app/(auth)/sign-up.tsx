import { Href, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import {
  AuthErrorNotice,
  AuthField,
  AuthNotice,
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

const welcomeRoute = '/(auth)/welcome' as Href;
const signInRoute = '/(auth)/sign-in' as Href;
const onboardingRoute = '/onboarding' as Href;

export default function SignUpRoute() {
  const { locale, t } = useTranslation();
  const { actions } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [consentError, setConsentError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(welcomeRoute);
  }

  async function submit() {
    const nextEmail = normalizeEmail(email);
    const nextEmailError = isValidEmail(nextEmail) ? '' : t('auth.validation.email');
    const nextPasswordError = password.length >= 8 ? '' : t('auth.validation.passwordLength');
    const nextConfirmError = password === confirmPassword ? '' : t('auth.validation.passwordMismatch');
    const nextConsentError =
      acceptedTerms && acceptedPrivacy ? '' : t('auth.validation.requiredConsents');

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setConsentError(nextConsentError);
    setRequestError('');

    if (nextEmailError || nextPasswordError || nextConfirmError || nextConsentError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await actions.register({
        email: nextEmail,
        password,
        locale,
        acceptedTerms,
        acceptedPrivacy,
        marketingOptIn,
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
      backLabel={t('auth.common.back')}
      description={t('auth.signUp.description')}
      footer={
        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <AppText variant="caption" tone="muted">
            {t('auth.signUp.hasAccount')}
          </AppText>
          <AuthTextButton label={t('auth.signUp.signIn')} onPress={() => router.replace(signInRoute)} />
        </View>
      }
      onBack={goBack}
      title={t('auth.signUp.title')}>
      <AuthNotice icon="shield" text={t('auth.common.demoPrivacyNotice')} />

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

      <View className="gap-3 rounded-card border border-line bg-surface p-card">
        <ConsentRow
          checked={acceptedTerms}
          label={t('auth.signUp.acceptTerms')}
          onPress={() => {
            setAcceptedTerms((value) => !value);
            setConsentError('');
          }}
        />
        <ConsentRow
          checked={acceptedPrivacy}
          label={t('auth.signUp.acceptPrivacy')}
          onPress={() => {
            setAcceptedPrivacy((value) => !value);
            setConsentError('');
          }}
        />
        <ConsentRow
          checked={marketingOptIn}
          label={t('auth.signUp.marketingOptIn')}
          onPress={() => setMarketingOptIn((value) => !value)}
        />
        <AppText variant="caption" tone="muted">
          {t('auth.signUp.marketingHelper')}
        </AppText>
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
