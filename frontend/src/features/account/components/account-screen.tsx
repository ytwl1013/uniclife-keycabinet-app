import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
  ToggleRow,
} from './account-ui';

type PendingAction = 'language' | 'marketing' | 'sign-out' | null;

const accountRoutes = {
  changePassword: '/account/change-password' as Href,
  data: '/account/data' as Href,
  delete: '/account/delete' as Href,
  developer: '/account/developer-settings' as Href,
  privacy: '/account/privacy' as Href,
  terms: '/account/terms' as Href,
};

export function AccountScreen() {
  const router = useRouter();
  const { locale, preference, setLocalePreference, t } = useTranslation();
  const { actions, currentUser, selectors, state } = useMockApp();
  const [pending, setPending] = useState<PendingAction>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const marketingConsent = useMemo(() => {
    if (!currentUser) return false;
    return [...state.consents]
      .reverse()
      .find((record) => record.userId === currentUser.id && record.kind === 'marketing')
      ?.granted ?? false;
  }, [currentUser, state.consents]);

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage description={t('auth.errors.sessionExpired')} title={t('account.title')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton icon="person" label={t('auth.welcome.signIn')} onPress={() => router.replace('/(auth)/sign-in')} />
      </AccountPage>
    );
  }

  const memberships = selectors.cabinetsForCurrentUser();
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

  const updateMarketing = async (granted: boolean) => {
    setPending('marketing');
    setFeedback(null);
    try {
      await actions.setMarketingConsent({
        expectedVersion: state.version,
        granted,
        requestId: `marketing-${currentUser.id}-${state.version}-${granted}`,
      });
      setFeedback({ message: t('account.actionComplete'), tone: 'success' });
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
      router.replace('/(auth)/welcome');
    } catch (caught) {
      fail(caught);
      setConfirmSignOut(false);
    } finally {
      setPending(null);
    }
  };

  return (
    <AccountPage description={t('account.subtitle')} title={t('account.title')}>
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <AccountSection icon="person" title={t('account.profileTitle')}>
        <View className="flex-row items-center gap-4 rounded-control bg-background p-card">
          <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand">
            <AppText variant="title" tone="onBrand">{initials}</AppText>
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <AppText numberOfLines={1} variant="title" tone="foreground">{currentUser.displayName}</AppText>
            <AppText numberOfLines={1} variant="caption" tone="muted">{currentUser.email}</AppText>
            <AppText variant="caption" tone="brand">
              {t('account.cabinetAccess', { count: memberships.length })}
            </AppText>
          </View>
        </View>
      </AccountSection>

      <AccountSection icon="settings" title={t('account.preferencesTitle')}>
        <SettingsAction
          detail={localeLabels[locale]}
          icon="settings"
          label={t('account.languageTitle')}
          onPress={() => setLanguageOpen(true)}
        />
        <ToggleRow
          description={t('account.marketingShortDescription')}
          disabled={!state.online || pending === 'marketing'}
          label={t('account.marketingOptIn')}
          onChange={(next) => void updateMarketing(next)}
          value={marketingConsent}
          valueLabel={marketingConsent ? t('account.marketingOn') : t('account.marketingOff')}
        />
      </AccountSection>

      <AccountSection icon="shield" title={t('account.privacyTitle')}>
        <SettingsAction icon="shield" label={t('account.privacyPolicy')} onPress={() => router.push(accountRoutes.privacy)} />
        <SettingsAction icon="audit" label={t('account.terms')} onPress={() => router.push(accountRoutes.terms)} />
        <SettingsAction icon="notification" label={t('account.dataUse')} onPress={() => router.push(accountRoutes.data)} />
      </AccountSection>

      <AccountSection icon="settings" title={t('account.securityTitle')}>
        <SettingsAction icon="settings" label={t('account.changePassword')} onPress={() => router.push(accountRoutes.changePassword)} />
        <SettingsAction icon="person" label={t('account.signOut')} onPress={() => setConfirmSignOut(true)} />
        <SettingsAction icon="error" label={t('account.deleteAccount')} onPress={() => router.push(accountRoutes.delete)} tone="danger" />
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

      {developerToolsEnabled ? (
        <AccountSection icon="settings" title={t('account.appSettingsTitle')}>
          <SettingsAction icon="settings" label={t('account.developerSettings')} onPress={() => router.push(accountRoutes.developer)} />
        </AccountSection>
      ) : null}

      <BottomSheet
        closeLabel={t('common.done')}
        onClose={() => setLanguageOpen(false)}
        title={t('account.languageTitle')}
        visible={languageOpen}>
        <View accessibilityRole="radiogroup" className="gap-2">
          <ChoiceChip label={t('account.systemLanguage')} onPress={() => void updateLanguage('system')} selected={preference === 'system'} />
          {supportedLocales.map((supportedLocale) => (
            <ChoiceChip
              key={supportedLocale}
              label={localeLabels[supportedLocale]}
              onPress={() => void updateLanguage(supportedLocale)}
              selected={preference === supportedLocale}
            />
          ))}
        </View>
        {pending === 'language' ? <AppText variant="caption" tone="muted">{t('common.loading')}</AppText> : null}
      </BottomSheet>
    </AccountPage>
  );
}
