import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { AuthErrorNotice, AuthSecondaryButton } from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';
import { useMockApp } from '@/mocks';

import {
  AccountLoading,
  AccountPage,
  ConfirmationPanel,
  FeedbackBanner,
} from './account-ui';

export function DeleteAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useMockApp();
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ownedCabinets = useMemo(() => {
    if (!currentUser) return [];
    return state.memberships
      .filter(
        (membership) =>
          membership.active &&
          membership.userId === currentUser.id &&
          membership.role === 'owner',
      )
      .map((membership) => {
        const cabinet = state.cabinets.find((candidate) => candidate.id === membership.cabinetId);
        const otherMembers = state.memberships.filter(
          (candidate) =>
            candidate.active &&
            candidate.cabinetId === membership.cabinetId &&
            candidate.userId !== currentUser.id,
        );
        return { cabinet, membership, otherMembers };
      });
  }, [currentUser, state.cabinets, state.memberships]);

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('account.deleteAccount')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const blockedCabinets = ownedCabinets.filter(({ otherMembers }) => otherMembers.length > 0);
  const soleCabinets = ownedCabinets.filter(({ otherMembers }) => otherMembers.length === 0);
  const blocked = blockedCabinets.length > 0;

  const deleteAccount = async () => {
    setBusy(true);
    setError('');
    try {
      await actions.deleteAccount({
        expectedVersion: state.version,
        releaseSoleCabinets: soleCabinets.length > 0,
        requestId: `delete-account-${currentUser.id}-${state.version}`,
      });
      router.replace('/(auth)/welcome');
    } catch (caught) {
      setError(t(authErrorKey(caught)));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.deleteDescription')}
      onBack={() => router.back()}
      title={t('account.deleteAccount')}>
      {error ? <AuthErrorNotice text={error} /> : null}

      {blocked ? (
        <View className="gap-4">
          <FeedbackBanner message={t('account.deleteBlockedDescription')} tone="danger" />
          <View className="gap-3 rounded-card border border-line bg-surface p-card shadow-card">
            {blockedCabinets.map(({ cabinet, membership }) => (
              <View
                className="flex-row items-center gap-3 rounded-control bg-background px-controlX py-3"
                key={membership.id}>
                <View className="h-9 w-9 items-center justify-center rounded-pill bg-danger-soft">
                  <AppIcon name="cabinet" size={19} tone="danger" />
                </View>
                <View className="flex-1 gap-0.5">
                  <AppText variant="label" tone="foreground">
                    {cabinet?.name ?? membership.cabinetId}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t('account.roleHint')}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="gap-4">
          <View className="gap-4 rounded-card border border-line bg-surface p-card shadow-card">
            <View className="h-12 w-12 items-center justify-center rounded-pill bg-danger-soft">
              <AppIcon name="person" size={24} tone="danger" />
            </View>
            <AppText tone="content">{t('account.deleteDescription')}</AppText>

            {soleCabinets.length > 0 ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: releaseConfirmed }}
                className={`flex-row items-start gap-3 rounded-control border p-card active:opacity-70 ${
                  releaseConfirmed ? 'border-brand bg-brand-soft' : 'border-line bg-background'
                }`}
                onPress={() => setReleaseConfirmed((value) => !value)}>
                <View
                  className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
                    releaseConfirmed ? 'border-brand bg-brand' : 'border-muted bg-surface'
                  }`}>
                  {releaseConfirmed ? <View className="h-2 w-2 rounded-sm bg-on-brand" /> : null}
                </View>
                <View className="flex-1 gap-2">
                  <AppText variant="label" tone="foreground">
                    {t('account.releaseSoleCabinets')}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t('account.releaseSoleCabinetsDescription')}
                  </AppText>
                  {soleCabinets.map(({ cabinet, membership }) => (
                    <AppText key={membership.id} variant="caption" tone="content">
                      {cabinet?.name ?? membership.cabinetId}
                    </AppText>
                  ))}
                </View>
              </Pressable>
            ) : null}
          </View>

          {confirming ? (
            <ConfirmationPanel
              cancelLabel={t('common.cancel')}
              confirmLabel={busy ? t('auth.common.working') : t('account.deleteConfirm')}
              description={t('account.deleteDescription')}
              destructive
              disabled={busy || (soleCabinets.length > 0 && !releaseConfirmed)}
              onCancel={() => setConfirming(false)}
              onConfirm={() => void deleteAccount()}
              title={t('account.deleteTitle')}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: !state.online || (soleCabinets.length > 0 && !releaseConfirmed),
              }}
              className={`min-h-12 items-center justify-center rounded-control bg-danger px-5 py-3 active:opacity-75 ${
                !state.online || (soleCabinets.length > 0 && !releaseConfirmed)
                  ? 'opacity-45'
                  : ''
              }`}
              disabled={!state.online || (soleCabinets.length > 0 && !releaseConfirmed)}
              onPress={() => setConfirming(true)}>
              <AppText variant="label" tone="onBrand">
                {t('account.deleteConfirm')}
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}
      <FeedbackBanner message={t('legal.draftNotice')} tone="warning" />
    </AccountPage>
  );
}
