import { Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AuthErrorNotice,
  AuthPrimaryButton,
  AuthTextButton,
  OnboardingChoice,
  StandaloneAuthScreen,
} from '@/features/auth/components/auth-ui';
import { authErrorKey, useAuthActions } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

const signInRoute = '/(auth)/sign-in' as Href;
const homeRoute = '/(tabs)' as Href;
const importGuideRoute = '/(details)/workspace-import-guide' as Href;

export default function OnboardingRoute() {
  const { t } = useTranslation();
  const { actions, currentUser, hydrated } = useAuthActions();
  const params = useLocalSearchParams<{ preview?: string | string[] }>();
  const [requestError, setRequestError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const rawPreview = Array.isArray(params.preview) ? params.preview[0] : params.preview;
  const isPreview = rawPreview === '1';

  function openScanner(mode: 'initialize' | 'join') {
    router.push({ pathname: '/(details)/scan', params: { mode } } as unknown as Href);
  }

  async function signOut(returnToPrevious = false) {
    setRequestError('');
    setIsSigningOut(true);
    try {
      await actions.signOut();
      if (returnToPrevious) {
        router.back();
      } else {
        router.replace(signInRoute);
      }
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!hydrated) {
    return (
      <StandaloneAuthScreen
        description={t('onboarding.loadingDescription')}
        title={t('onboarding.loadingTitle')}>
        <View className="gap-3">
          <View className="h-20 rounded-card bg-brand-soft" />
          <View className="h-20 rounded-card bg-brand-soft opacity-70" />
          <View className="h-20 rounded-card bg-brand-soft opacity-40" />
        </View>
      </StandaloneAuthScreen>
    );
  }

  if (!currentUser) {
    return (
      <StandaloneAuthScreen
        description={t('onboarding.sessionRequiredDescription')}
        title={t('onboarding.sessionRequiredTitle')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthPrimaryButton
          busyLabel={t('auth.common.working')}
          label={t('onboarding.goToSignIn')}
          onPress={() => router.replace(signInRoute)}
        />
      </StandaloneAuthScreen>
    );
  }

  return (
    <StandaloneAuthScreen
      backLabel={isPreview ? t('auth.common.back') : undefined}
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
      headerAction={{
        accessibilityLabel: t('onboarding.importGuide.openAction'),
        icon: 'guide',
        label: t('onboarding.importGuide.openAction'),
        onPress: () => router.push(importGuideRoute),
      }}
      onBack={
        isPreview
          ? () => {
              if (!isSigningOut) {
                void signOut(true);
              }
            }
          : undefined
      }
      title={t('onboarding.title')}>
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
        <AuthTextButton label={t('onboarding.laterTitle')} onPress={() => router.replace(homeRoute)} />
      </View>
      {requestError ? <AuthErrorNotice text={requestError} /> : null}
    </StandaloneAuthScreen>
  );
}
