import { Href, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AuthErrorNotice,
  AuthNotice,
  AuthPrimaryButton,
  AuthScreen,
  AuthTextButton,
  OnboardingChoice,
} from '@/features/auth/components/auth-ui';
import { authErrorKey, useAuthActions } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

const signInRoute = '/(auth)/sign-in' as Href;
const homeRoute = '/(tabs)' as Href;

export default function OnboardingRoute() {
  const { t } = useTranslation();
  const { actions, currentUser, hydrated } = useAuthActions();
  const [requestError, setRequestError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  function openScanner(mode: 'initialize' | 'join') {
    router.replace({ pathname: '/(tabs)/scan', params: { mode } } as Href);
  }

  async function signOut() {
    setRequestError('');
    setIsSigningOut(true);
    try {
      await actions.signOut();
      router.replace(signInRoute);
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!hydrated) {
    return (
      <AuthScreen
        description={t('onboarding.loadingDescription')}
        title={t('onboarding.loadingTitle')}>
        <View className="gap-3">
          <View className="h-20 rounded-card bg-brand-soft" />
          <View className="h-20 rounded-card bg-brand-soft opacity-70" />
          <View className="h-20 rounded-card bg-brand-soft opacity-40" />
        </View>
      </AuthScreen>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        description={t('onboarding.sessionRequiredDescription')}
        title={t('onboarding.sessionRequiredTitle')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthPrimaryButton
          busyLabel={t('auth.common.working')}
          label={t('onboarding.goToSignIn')}
          onPress={() => router.replace(signInRoute)}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      description={t('onboarding.description')}
      footer={
        <AuthTextButton
          label={isSigningOut ? t('onboarding.signingOut') : t('onboarding.signOut')}
          onPress={() => {
            if (!isSigningOut) {
              void signOut();
            }
          }}
        />
      }
      title={t('onboarding.title')}>
      <AuthNotice
        icon="person"
        text={t('onboarding.signedInAs', { email: currentUser.email })}
      />

      <View className="gap-3">
        <OnboardingChoice
          description={t('onboarding.initializeDescription')}
          emphasis
          icon="cabinet"
          onPress={() => openScanner('initialize')}
          title={t('onboarding.initializeTitle')}
        />
        <OnboardingChoice
          description={t('onboarding.joinDescription')}
          icon="scan"
          onPress={() => openScanner('join')}
          title={t('onboarding.joinTitle')}
        />
        <OnboardingChoice
          description={t('onboarding.laterDescription')}
          icon="home"
          onPress={() => router.replace(homeRoute)}
          title={t('onboarding.laterTitle')}
        />
      </View>

      <AuthNotice icon="shield" text={t('onboarding.qrSafetyNotice')} />
      {requestError ? <AuthErrorNotice text={requestError} /> : null}
    </AuthScreen>
  );
}
