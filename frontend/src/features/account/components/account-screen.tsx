import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import {
  localeLabels,
  LocalePreference,
  supportedLocales,
  useTranslation,
} from '@/i18n';
import { useMockApp } from '@/mocks';

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

type Confirmation = 'sign-out' | 'reset' | null;
type PendingAction =
  | 'language'
  | 'marketing'
  | 'network'
  | 'switch-account'
  | 'advance-time'
  | 'restore'
  | 'reset'
  | 'sign-out'
  | null;

const accountRoutes = {
  changePassword: '/account/change-password' as Href,
  data: '/account/data' as Href,
  delete: '/account/delete' as Href,
  privacy: '/account/privacy' as Href,
  terms: '/account/terms' as Href,
};

export function AccountScreen() {
  const router = useRouter();
  const { formatDateTime, locale, preference, setLocalePreference, t } = useTranslation();
  const { actions, currentUser, selectors, state } = useMockApp();
  const [pending, setPending] = useState<PendingAction>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [showAccounts, setShowAccounts] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    null,
  );

  const marketingConsent = useMemo(() => {
    if (!currentUser) return false;
    return [...state.consents]
      .reverse()
      .find((record) => record.userId === currentUser.id && record.kind === 'marketing')
      ?.granted ?? false;
  }, [currentUser, state.consents]);

  const activeUsers = useMemo(
    () => state.users.filter((user) => user.status === 'active'),
    [state.users],
  );

  const recoverableBatch = useMemo(
    () =>
      state.clearBatches
        .filter(
          (batch) =>
            batch.status === 'restorable' &&
            Date.parse(batch.recoverableUntil) >= Date.parse(state.now),
        )
        .sort((left, right) => Date.parse(right.clearedAt) - Date.parse(left.clearedAt))[0],
    [state.clearBatches, state.now],
  );

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage description={t('auth.errors.sessionExpired')} title={t('account.title')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const memberships = selectors.cabinetsForCurrentUser();

  const fail = (caught: unknown) => {
    setFeedback({ message: t(authErrorKey(caught)), tone: 'danger' });
  };

  const updateLanguage = async (next: LocalePreference) => {
    setPending('language');
    setFeedback(null);
    try {
      await setLocalePreference(next);
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

  const updateNetwork = async () => {
    setPending('network');
    setFeedback(null);
    try {
      await actions.setOnline({ online: !state.online });
      setFeedback({ message: t('account.actionComplete'), tone: 'success' });
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const switchAccount = async (userId: string) => {
    setPending('switch-account');
    setFeedback(null);
    try {
      await actions.switchAccount({ userId });
      setShowAccounts(false);
      setFeedback({ message: t('account.actionComplete'), tone: 'success' });
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const advanceTime = async () => {
    setPending('advance-time');
    setFeedback(null);
    try {
      await actions.advanceTime({ days: 8 });
      setFeedback({ message: t('account.actionComplete'), tone: 'success' });
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const restoreLatestBatch = async () => {
    if (!recoverableBatch) {
      setFeedback({ message: t('account.noRecovery'), tone: 'danger' });
      return;
    }
    setPending('restore');
    setFeedback(null);
    try {
      await actions.restoreClearBatch({
        batchId: recoverableBatch.id,
        expectedVersion: state.version,
        requestId: `restore-${recoverableBatch.id}-${state.version}`,
      });
      setFeedback({ message: t('account.recoverySuccess'), tone: 'success' });
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  };

  const resetData = async () => {
    setPending('reset');
    setFeedback(null);
    try {
      await actions.resetData();
      setConfirmation(null);
      setShowAccounts(false);
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
      setConfirmation(null);
    } finally {
      setPending(null);
    }
  };

  const initials = currentUser.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');

  return (
    <AccountPage
      description={t('account.subtitle')}
      title={t('account.title')}
      trailing={
        <View
          accessibilityLabel={state.online ? t('common.online') : t('common.offline')}
          className={`h-11 w-11 items-center justify-center rounded-pill ${
            state.online ? 'bg-success-soft' : 'bg-danger-soft'
          }`}>
          <View className={`h-3 w-3 rounded-pill ${state.online ? 'bg-success' : 'bg-danger'}`} />
        </View>
      }>
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <AccountSection icon="person" title={t('account.profileTitle')}>
        <View className="flex-row items-center gap-4 rounded-control bg-background p-card">
          <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand">
            <AppText variant="title" tone="onBrand">
              {initials}
            </AppText>
          </View>
          <View className="flex-1 gap-1">
            <AppText variant="title" tone="foreground">
              {currentUser.displayName}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('account.signedInAs', { email: currentUser.email })}
            </AppText>
            <AppText variant="caption" tone="brand">
              {t('common.cabinetMeta', {
                overdue: memberships.reduce(
                  (total, cabinet) => total + selectors.cabinetMetrics(cabinet.id).overdue,
                  0,
                ),
                slots: memberships.reduce(
                  (total, cabinet) => total + selectors.cabinetMetrics(cabinet.id).capacity,
                  0,
                ),
                status: state.online ? t('common.online') : t('common.offline'),
              })}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="muted">
          {t('account.roleHint')}
        </AppText>
      </AccountSection>

      <AccountSection
        description={t('account.languageDescription')}
        icon="settings"
        title={t('account.languageTitle')}>
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
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
        <AppText accessibilityLiveRegion="polite" variant="caption" tone="muted">
          {localeLabels[locale]}
          {pending === 'language' ? ` · ${t('common.loading')}` : ''}
        </AppText>
      </AccountSection>

      <AccountSection
        description={t('account.marketingDescription')}
        icon="notification"
        title={t('account.marketingTitle')}>
        <ToggleRow
          description={t('account.marketingDescription')}
          disabled={!state.online || pending === 'marketing'}
          label={t('account.marketingOptIn')}
          onChange={(next) => void updateMarketing(next)}
          value={marketingConsent}
          valueLabel={marketingConsent ? t('account.marketingOn') : t('account.marketingOff')}
        />
        {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}
      </AccountSection>

      <AccountSection icon="shield" title={t('account.privacyTitle')}>
        <FeedbackBanner message={t('account.legalDraft')} tone="warning" />
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

      <AccountSection icon="settings" title={t('account.securityTitle')}>
        <SettingsAction
          icon="settings"
          label={t('account.changePassword')}
          onPress={() => router.push(accountRoutes.changePassword)}
        />
        <SettingsAction
          icon="person"
          label={t('account.signOut')}
          onPress={() => setConfirmation('sign-out')}
        />
        <SettingsAction
          icon="error"
          label={t('account.deleteAccount')}
          onPress={() => router.push(accountRoutes.delete)}
          tone="danger"
        />
        {confirmation === 'sign-out' ? (
          <ConfirmationPanel
            cancelLabel={t('common.cancel')}
            confirmLabel={pending === 'sign-out' ? t('auth.common.working') : t('account.signOut')}
            description={t('account.signedInAs', { email: currentUser.email })}
            disabled={pending === 'sign-out'}
            onCancel={() => setConfirmation(null)}
            onConfirm={() => void signOut()}
            title={t('account.signOut')}
          />
        ) : null}
      </AccountSection>

      <AccountSection
        description={t('account.demoDescription')}
        icon="settings"
        title={t('account.demoTitle')}>
        <SettingsAction
          detail={state.online ? t('common.online') : t('common.offline')}
          disabled={pending === 'network'}
          icon="notification"
          label={state.online ? t('account.goOffline') : t('account.goOnline')}
          onPress={() => void updateNetwork()}
          selected={state.online}
        />

        <SettingsAction
          detail={t('account.signedInAs', { email: currentUser.email })}
          disabled={pending === 'switch-account'}
          icon="team"
          label={t('account.switchAccount')}
          onPress={() => setShowAccounts((value) => !value)}
          selected={showAccounts}
        />

        {showAccounts ? (
          <View className="gap-2 rounded-control border border-line bg-background p-2">
            {activeUsers.map((user) => {
              const selected = user.id === currentUser.id;
              return (
                <Pressable
                  accessibilityLabel={`${t('account.switchAccount')}: ${user.displayName}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: selected, selected }}
                  className={`flex-row items-center gap-3 rounded-control px-controlX py-3 active:opacity-70 ${
                    selected ? 'bg-brand-soft' : 'bg-surface'
                  }`}
                  disabled={selected || pending === 'switch-account'}
                  key={user.id}
                  onPress={() => void switchAccount(user.id)}>
                  <View className={`h-9 w-9 items-center justify-center rounded-pill ${selected ? 'bg-brand' : 'bg-brand-soft'}`}>
                    <AppIcon name="person" size={19} tone={selected ? 'onBrand' : 'brand'} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <AppText variant="label" tone="foreground">
                      {user.displayName}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {user.email}
                    </AppText>
                  </View>
                  {selected ? <AppIcon name="shield" size={18} tone="brand" /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <SettingsAction
          detail={`${t('account.simulatedTime')}: ${formatDateTime(state.now)}`}
          disabled={pending === 'advance-time'}
          icon="calendar"
          label={t('account.advanceTime')}
          onPress={() => void advanceTime()}
        />

        <SettingsAction
          detail={
            recoverableBatch
              ? formatDateTime(recoverableBatch.recoverableUntil)
              : t('account.noRecovery')
          }
          disabled={!recoverableBatch || !state.online || pending === 'restore'}
          icon="return"
          label={t('account.restoreClear')}
          onPress={() => void restoreLatestBatch()}
        />

        <SettingsAction
          icon="error"
          label={t('account.resetData')}
          onPress={() => setConfirmation('reset')}
          tone="danger"
        />

        {confirmation === 'reset' ? (
          <ConfirmationPanel
            cancelLabel={t('common.cancel')}
            confirmLabel={pending === 'reset' ? t('auth.common.working') : t('common.confirm')}
            description={t('account.resetConfirmDescription')}
            destructive
            disabled={pending === 'reset'}
            onCancel={() => setConfirmation(null)}
            onConfirm={() => void resetData()}
            title={t('account.resetConfirmTitle')}
          />
        ) : null}

        <FeedbackBanner message={t('common.demoDataOnly')} />
      </AccountSection>
    </AccountPage>
  );
}
