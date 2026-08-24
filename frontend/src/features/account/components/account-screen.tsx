import * as Clipboard from 'expo-clipboard';
import { Href, useRouter } from 'expo-router';
import { Dialog } from 'heroui-native/dialog';
import { useToast } from 'heroui-native/toast';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useApp } from '@/app-state';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { developerToolsEnabled } from '@/config/developer';
import { useAppRefresh } from '@/features/app-refresh/use-app-refresh';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { supportEmail } from '@/features/support/config';
import {
  localeLabels,
  LocalePreference,
  supportedLocales,
  useTranslation,
} from '@/i18n';

import {
  AccountLoading,
  AccountPage,
  AccountSection,
  ChoiceChip,
  ConfirmationPanel,
  FeedbackBanner,
  SettingsAction,
  UserAvatar,
} from './account-ui';

type PendingAction = 'language' | 'sign-out' | null;

const accountRoutes = {
  contactSupport: '/(details)/account/contact-support' as Href,
  data: '/(details)/account/data' as Href,
  developer: '/(details)/account/developer-settings' as Href,
  profile: '/(details)/account/profile' as Href,
  privacy: '/(details)/account/privacy' as Href,
  security: '/(details)/account/security' as Href,
  terms: '/(details)/account/terms' as Href,
};

export function AccountScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale, preference, setLocalePreference, t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const { onRefresh, refreshing } = useAppRefresh();
  const [pending, setPending] = useState<PendingAction>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [emailContactOpen, setEmailContactOpen] = useState(false);
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

  const fail = (caught: unknown) => setFeedback({ message: t(authErrorKey(caught)), tone: 'danger' });

  const copySupportEmail = async () => {
    setFeedback(null);
    try {
      await Clipboard.setStringAsync(supportEmail);
      setEmailContactOpen(false);
      toast.show({
        duration: 3000,
        id: 'support-email-copy',
        label: t('account.supportEmailCopied'),
        placement: 'bottom',
        variant: 'success',
      });
    } catch {
      setEmailContactOpen(false);
      toast.show({
        duration: 3000,
        id: 'support-email-copy-error',
        label: t('account.supportEmailCopyFailed'),
        placement: 'bottom',
        variant: 'danger',
      });
    }
  };

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
    <AccountPage
      description={t('account.subtitle')}
      headerShown={false}
      onRefresh={onRefresh}
      refreshing={refreshing}
      title={t('account.title')}>
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <View className="items-center gap-5 pb-2 pt-3">
        <UserAvatar
          accessibilityLabel={t('account.avatarAccessibilityLabel', { name: currentUser.displayName })}
          avatarUri={currentUser.avatarUri}
          displayName={currentUser.displayName}
        />
        <View className="w-full items-center gap-1 px-4">
          <View className="max-w-full flex-col items-start justify-center gap-2">
            <View className="rounded-pill bg-accent-soft px-2.5 py-1">
              <AppText variant="caption" tone="accent">{t('cabinet.role.admin')}</AppText>
            </View>
            <AppText className="min-w-0 shrink text-center" numberOfLines={1} variant="pageTitle" tone="foreground">
              {currentUser.displayName}
            </AppText>
          </View>
          <AppText className="text-center" numberOfLines={1} variant="caption" tone="muted">
            {currentUser.email}
          </AppText>
        </View>
      </View>

      <AccountSection icon="person" title={t('account.personalAccountTitle')}>
        <SettingsAction
          detail={t('account.accountSecurityDescription')}
          icon="shield"
          label={t('account.accountSecurity')}
          onPress={() => router.push(accountRoutes.security)}
        />
        <SettingsAction
          detail={t('account.personalProfileDescription')}
          icon="person"
          label={t('account.personalProfile')}
          onPress={() => router.push(accountRoutes.profile)}
        />
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
          detail={supportEmail}
          icon="send"
          label={t('account.emailContact')}
          onPress={() => setEmailContactOpen(true)}
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

      <View className="gap-3 pt-2">
        <Pressable
          accessibilityRole="button"
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-control border border-line bg-surface px-5 py-3 active:bg-brand-soft active:opacity-70"
          onPress={() => setConfirmSignOut(true)}>
          <AppIcon name="checkOut" size={20} tone="danger" />
          <AppText variant="label" tone="danger">
            {t('account.signOut')}
          </AppText>
        </Pressable>
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
      </View>

      <BottomSheet
        closeLabel={t('common.done')}
        onClose={() => setLanguageOpen(false)}
        size="large"
        title={t('account.languageTitle')}
        visible={languageOpen}>
        <View accessibilityRole="radiogroup" className="gap-2 pb-2">
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

      <Dialog isOpen={emailContactOpen} onOpenChange={setEmailContactOpen}>
        <Dialog.Portal unstable_accessibilityContainerViewIsModal>
          <Dialog.Overlay />
          <Dialog.Content className="w-full max-w-[430px] gap-4" isSwipeable={false} testID="support-email-modal">
            <Dialog.Title>{t('account.emailContact')}</Dialog.Title>
            <Dialog.Description>{supportEmail}</Dialog.Description>
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-4 active:opacity-70"
                onPress={() => setEmailContactOpen(false)}>
                <AppText variant="label" tone="foreground">
                  {t('common.cancel')}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-1 items-center justify-center rounded-control bg-brand px-4 active:opacity-75"
                onPress={() => void copySupportEmail()}>
                <AppText variant="label" tone="onBrand">
                  {t('account.copyEmail')}
                </AppText>
              </Pressable>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </AccountPage>
  );
}
