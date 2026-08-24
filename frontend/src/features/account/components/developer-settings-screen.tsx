import { useRouter } from 'expo-router';
import { useState } from 'react';

import { apiConfig } from '@/api/config';
import { useApp } from '@/app-state';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

import {
  AccountLoading,
  AccountPage,
  AccountSection,
  FeedbackBanner,
  SettingsAction,
} from './account-ui';

export function DeveloperSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'success' | 'danger';
  } | null>(null);

  if (!state.hydrated) return <AccountLoading label={t('common.loading')} />;

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.back()}
        title={t('account.developerSettings')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const updateNetwork = async () => {
    setPending(true);
    setFeedback(null);
    try {
      await actions.setOnline({ online: !state.online });
      setFeedback({ message: t('account.actionComplete'), tone: 'success' });
    } catch (error) {
      setFeedback({ message: t(authErrorKey(error)), tone: 'danger' });
    } finally {
      setPending(false);
    }
  };

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.developerDescription')}
      onBack={() => router.back()}
      title={t('account.developerSettings')}>
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}
      <AccountSection icon="settings" title={t('account.developerTools')}>
        <SettingsAction
          detail={apiConfig.baseUrl}
          disabled={pending}
          icon="notification"
          label={state.online ? t('account.goOffline') : t('account.goOnline')}
          onPress={() => void updateNetwork()}
          selected={state.online}
        />
      </AccountSection>
    </AccountPage>
  );
}
