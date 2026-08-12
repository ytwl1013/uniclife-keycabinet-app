import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppText } from '@/components/ui/app-text';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import {
  localeLabels,
  LocalePreference,
  supportedLocales,
  useTranslation,
} from '@/i18n';
import { developerToolsEnabled, useMockApp } from '@/mocks';

import {
  AccountLoading,
  AccountPage,
  AccountSection,
  ChoiceChip,
  ConfirmationPanel,
  FeedbackBanner,
  SettingsAction,
} from './account-ui';

type PendingAction = 'language' | 'sign-out' | null;

const accountRoutes = {
  changePassword: '/(details)/account/change-password' as Href,
  contactSupport: '/(details)/account/contact-support' as Href,
  data: '/(details)/account/data' as Href,
  delete: '/(details)/account/delete' as Href,
  developer: '/(details)/account/developer-settings' as Href,
  privacy: '/(details)/account/privacy' as Href,
  terms: '/(details)/account/terms' as Href,
};

export function AccountScreen() {
  const router = useRouter();
  const { locale, preference, setLocalePreference, t } = useTranslation();
  const { actions, currentUser, state } = useMockApp();
  const [pending, setPending] = useState<PendingAction>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        description={t('auth.errors.sessionExpired')}
        headerShown={false}
        title={t('account.title')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton icon="person" label={t('auth.welcome.signIn')} onPress={() => router.replace('/(auth)/sign-in')} />
      </AccountPage>
    );
  }

  const initials = currentUser.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');

  const fail = (caught: unknown) => setFeedback({ message: t(authErrorKey(caught)), tone: 'danger' });

  const updateLanguage = async (next: LocalePreference) => {
    setPending('language');
    setFeedback(null);
    try {
      await setLocalePreference(next);
      setLanguageOpen(false);
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const signOut = async () => {
    setPending('sign-out');
    setFeedback(null);
    try {
      await actions.signOut();
      router.replace('/(auth)/sign-in');
    } catch (caught) {
      fail(caught);
      setConfirmSignOut(false);
    } finally {
      setPending(null);
    }
  };

  return (
    <AccountPage description={t('account.subtitle')} headerShown={false} title={t('account.title')}>
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <View className="items-center gap-5 pb-2 pt-3">
        <View className="h-28 w-28 items-center justify-center rounded-pill bg-brand">
          <AppText variant="display" tone="onBrand">
            {initials}
          </AppText>
        </View>
        <View className="w-full items-center gap-1 px-4">
          <View className="max-w-full flex-row items-start justify-center gap-2">
            <AppText className="min-w-0 shrink text-center" numberOfLines={1} variant="pageTitle" tone="foreground">
              {currentUser.displayName}
            </AppText>
            <View className="mt-0.5 rounded-pill bg-accent-soft px-2.5 py-1">
              <AppText variant="caption" tone="accent">{t('cabinet.role.admin')}</AppText>
            </View>
          </View>
          <AppText className="text-center" numberOfLines={1} variant="caption" tone="muted">
            {currentUser.email}
          </AppText>
        </View>
      </View>

      <AccountSection icon="person" title={t('account.personalAccountTitle')}>
        <SettingsAction
          icon="settings"
          label={t('account.changePassword')}
          onPress={() => router.push(accountRoutes.changePassword)}
        />
        <SettingsAction icon="person" label={t('account.signOut')} onPress={() => setConfirmSignOut(true)} />
        <SettingsAction
          icon="error"
          label={t('account.deleteAccount')}
          onPress={() => router.push(accountRoutes.delete)}
          tone="danger"
        />
        {confirmSignOut ? (
          <ConfirmationPanel
            cancelLabel={t('common.cancel')}
            confirmLabel={pending === 'sign-out' ? t('auth.common.working') : t('account.signOut')}
            description={currentUser.email}
            disabled={pending === 'sign-out'}
            onCancel={() => setConfirmSignOut(false)}
            onConfirm={() => void signOut()}
            title={t('account.signOut')}
          />
        ) : null}
      </AccountSection>

      <AccountSection icon="settings" title={t('account.appSettingsTitle')}>
        <SettingsAction
          detail={localeLabels[locale]}
          icon="settings"
          label={t('account.languageTitle')}
          onPress={() => setLanguageOpen(true)}
        />
        {developerToolsEnabled ? (
          <SettingsAction
            icon="settings"
            label={t('account.developerSettings')}
            onPress={() => router.push(accountRoutes.developer)}
          />
        ) : null}
      </AccountSection>

      <AccountSection icon="support" title={t('account.serviceSupportTitle')}>
        <SettingsAction
          detail={t('account.contactSupportDescription')}
          icon="support"
          label={t('account.contactSupport')}
          onPress={() => router.push(accountRoutes.contactSupport)}
        />
        <SettingsAction
          icon="shield"
          label={t('account.privacyPolicy')}
          onPress={() => router.push(accountRoutes.privacy)}
        />
        <SettingsAction
          icon="audit"
          label={t('account.terms')}
          onPress={() => router.push(accountRoutes.terms)}
        />
        <SettingsAction
          icon="notification"
          label={t('account.dataUse')}
          onPress={() => router.push(accountRoutes.data)}
        />
      </AccountSection>

      <BottomSheet
        closeLabel={t('common.done')}
        onClose={() => setLanguageOpen(false)}
        title={t('account.languageTitle')}
        visible={languageOpen}>
        <View accessibilityRole="radiogroup" className="gap-2">
          <ChoiceChip
            label={t('account.systemLanguage')}
            onPress={() => void updateLanguage('system')}
            selected={preference === 'system'}
          />
          {supportedLocales.map((supportedLocale) => (
            <ChoiceChip
              key={supportedLocale}
              label={localeLabels[supportedLocale]}
              onPress={() => void updateLanguage(supportedLocale)}
              selected={preference === supportedLocale}
            />
          ))}
        </View>
        {pending === 'language' ? (
          <AppText variant="caption" tone="muted">
            {t('common.loading')}
          </AppText>
        ) : null}
      </BottomSheet>
    </AccountPage>
  );
}
