import { Href, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
  AuthTextButton,
} from '@/features/auth/components/auth-ui';
import {
  authErrorKey,
  getResetChallenge,
  rememberResetToken,
  useAuthActions,
} from '@/features/auth/use-auth-actions';
import { useTranslation } from '@/i18n';
import { localPasswordResetEnabled } from '@/mocks';

const forgotPasswordRoute = '/(auth)/forgot-password' as Href;
const signInRoute = '/(auth)/sign-in' as Href;

function maskEmail(email: string) {
  const [name = '', domain = ''] = email.split('@');
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${name.length > 2 ? '***' : '*'}@${domain}`;
}

export default function VerifyResetRoute() {
  const { t } = useTranslation();
  const { actions } = useAuthActions();
  const params = useLocalSearchParams<{ challengeId?: string }>();
  const challengeId = typeof params.challengeId === 'string' ? params.challengeId : '';
  const challenge = challengeId ? getResetChallenge(challengeId) : undefined;
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!localPasswordResetEnabled) return <Redirect href={signInRoute} />;

  async function fillLocalCode() {
    if (!challenge) return;
    setRequestError('');
    try {
      const preview = await actions.getPasswordResetPreview(challenge.challengeId);
      setCode(preview.code);
      setCodeError('');
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    }
  }

  async function submit() {
    const normalizedCode = code.replace(/\s+/g, '');
    const nextCodeError = normalizedCode ? '' : t('auth.validation.codeRequired');
    setCodeError(nextCodeError);
    setRequestError('');

    if (nextCodeError || !challenge) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await actions.verifyReset(challenge.challengeId, normalizedCode);
      rememberResetToken(challenge.challengeId, result.resetToken);
      router.replace({
        pathname: '/(auth)/reset-password',
        params: { challengeId: challenge.challengeId },
      } as unknown as Href);
    } catch (error) {
      setRequestError(t(authErrorKey(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      description={
        challenge
          ? t('auth.verifyReset.description', { email: maskEmail(challenge.email) })
          : t('auth.verifyReset.missingDescription')
      }
      footer={
        <AuthTextButton
          label={t('auth.verifyReset.requestAnother')}
          onPress={() => router.replace(forgotPasswordRoute)}
        />
      }>
      {challenge ? (
        <>
          <AuthField
            autoCapitalize="none"
            autoComplete="one-time-code"
            error={codeError}
            keyboardType="number-pad"
            label={t('auth.fields.verificationCode')}
            maxLength={8}
            onChangeText={(value) => {
              setCode(value);
              setCodeError('');
            }}
            onSubmitEditing={() => void submit()}
            placeholder={t('auth.fields.verificationCodePlaceholder')}
            returnKeyType="done"
            textContentType="oneTimeCode"
            value={code}
          />
          {localPasswordResetEnabled ? (
            <AuthTextButton
              label={t('auth.verifyReset.useLocalCode')}
              onPress={() => void fillLocalCode()}
            />
          ) : null}
          {requestError ? <AuthErrorNotice text={requestError} /> : null}
          <AuthPrimaryButton
            busy={isSubmitting}
            busyLabel={t('auth.verifyReset.verifying')}
            label={t('auth.verifyReset.submit')}
            onPress={() => void submit()}
          />
        </>
      ) : (
        <>
          <AuthErrorNotice text={t('auth.errors.expiredCode')} />
          <AuthPrimaryButton
            busyLabel={t('auth.common.working')}
            label={t('auth.verifyReset.restart')}
            onPress={() => router.replace(forgotPasswordRoute)}
          />
        </>
      )}
    </AuthScreen>
  );
}
