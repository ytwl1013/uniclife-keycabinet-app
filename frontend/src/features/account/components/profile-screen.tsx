import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useApp } from '@/app-state';
import { AppText } from '@/components/ui/app-text';
import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/features/auth/components/auth-ui';
import { authErrorKey } from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';

import { AccountLoading, AccountPage, FeedbackBanner, UserAvatar } from './account-ui';

export function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUser?.avatarUri);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('account.personalProfile')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const choosePhoto = async () => {
    setError('');
    setSuccess(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('account.photoPermissionDenied'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      setError(t('auth.errors.generic'));
    }
  };

  const saveProfile = async () => {
    const name = displayName.trim();
    if (!name) {
      setError(t('auth.validation.adminName'));
      return;
    }
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await actions.updateProfile({
        avatarUri: avatarUri ?? null,
        displayName: name,
        expectedVersion: state.version,
        requestId: `update-profile-${currentUser.id}-${state.version}`,
      });
      setDisplayName(name);
      setSuccess(true);
    } catch (caught) {
      setError(t(authErrorKey(caught)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPage
      backLabel={t('auth.common.back')}
      description={t('account.profileDescription')}
      onBack={() => router.back()}
      title={t('account.personalProfile')}>
      {success ? <FeedbackBanner message={t('account.profileUpdated')} tone="success" /> : null}
      {error ? <AuthErrorNotice text={error} /> : null}

      <View className="items-center gap-3 rounded-card border border-line bg-surface p-card shadow-card">
        <UserAvatar
          accessibilityLabel={t('account.avatarAccessibilityLabel', { name: displayName || currentUser.displayName })}
          avatarUri={avatarUri}
          displayName={displayName || currentUser.displayName}
        />
        <Pressable
          accessibilityRole="button"
          className="min-h-11 items-center justify-center rounded-control bg-brand-soft px-5 py-2 active:opacity-70"
          onPress={() => void choosePhoto()}>
          <AppText variant="label" tone="brand">
            {t('account.changePhoto')}
          </AppText>
        </Pressable>
        {avatarUri ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-11 items-center justify-center rounded-control px-4 py-2 active:opacity-60"
            onPress={() => {
              setAvatarUri(undefined);
              setError('');
              setSuccess(false);
            }}>
            <AppText variant="label" tone="danger">
              {t('account.removePhoto')}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View className="gap-5 rounded-card border border-line bg-surface p-card shadow-card">
        <AuthField
          autoCapitalize="words"
          autoComplete="name"
          label={t('account.displayName')}
          onChangeText={(value) => {
            setDisplayName(value);
            setError('');
            setSuccess(false);
          }}
          onSubmitEditing={() => void saveProfile()}
          placeholder={t('auth.fields.adminNamePlaceholder')}
          returnKeyType="done"
          textContentType="name"
          value={displayName}
        />
        <AuthPrimaryButton
          busy={busy}
          busyLabel={t('account.savingProfile')}
          disabled={!state.online}
          label={t('common.save')}
          onPress={() => void saveProfile()}
        />
      </View>

      {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}
    </AccountPage>
  );
}
