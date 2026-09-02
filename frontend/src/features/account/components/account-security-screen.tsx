import { Href, useRouter } from 'expo-router';

import { useApp } from '@/app-state';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { useTranslation } from '@/i18n';

import { AccountLoading, AccountPage, AccountSection, SettingsAction } from './account-ui';

const securityRoutes = {
  changeEmail: '/(details)/account/change-email' as Href,
  changePassword: '/(details)/account/change-password' as Href,
  deleteAccount: '/(details)/account/delete' as Href,
};

export function AccountSecurityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentUser, state } = useApp();

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('account.accountSecurity')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.accountSecurityDescription')}
      onBack={() => router.back()}
      title={t('account.accountSecurity')}>
      <AccountSection icon="shield" title={t('account.securityTitle')}>
        <SettingsAction
          detail={currentUser.email}
          icon="send"
          label={t('account.changeEmail')}
          onPress={() => router.push(securityRoutes.changeEmail)}
        />
        <SettingsAction
          icon="shield"
          label={t('account.changePassword')}
          onPress={() => router.push(securityRoutes.changePassword)}
        />
        <SettingsAction
          icon="error"
          label={t('account.deleteAccount')}
          onPress={() => router.push(securityRoutes.deleteAccount)}
          tone="danger"
        />
      </AccountSection>
    </AccountPage>
  );
}
