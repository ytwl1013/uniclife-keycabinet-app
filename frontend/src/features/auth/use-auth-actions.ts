import { useApp } from '@/app-state';
import { ApiError } from '@/api/client';
import { TranslationKey } from '@/i18n';

export type AuthCredentials = {
  email: string;
  password: string;
};

export type RegistrationInput = AuthCredentials & {
  displayName: string;
  locale: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

type ResetFlow = {
  challengeId: string;
  email: string;
  resetToken?: string;
};

const transientResetFlows = new Map<string, ResetFlow>();

export function rememberResetChallenge(flow: Omit<ResetFlow, 'resetToken'>) {
  transientResetFlows.set(flow.challengeId, flow);
}

export function getResetChallenge(challengeId: string) {
  return transientResetFlows.get(challengeId);
}

export function rememberResetToken(challengeId: string, resetToken: string) {
  const flow = transientResetFlows.get(challengeId);
  if (flow) {
    transientResetFlows.set(challengeId, { ...flow, resetToken });
  }
}

export function clearResetChallenge(challengeId: string) {
  transientResetFlows.delete(challengeId);
}

export function useAuthActions() {
  const { actions, currentUser, state } = useApp();

  return {
    currentUser,
    hydrated: state.hydrated,
    actions: {
      signIn: (input: AuthCredentials) => actions.signIn(input),
      register: (input: RegistrationInput) => {
        if (!input.acceptedTerms || !input.acceptedPrivacy) {
          throw new ApiError(400, 'INVALID_INPUT', '请先同意服务条款和隐私政策');
        }
        return actions.register({
          ...input,
          displayName: input.displayName.trim(),
          locale: input.locale as Parameters<typeof actions.register>[0]['locale'],
          acceptedTerms: true,
          acceptedPrivacy: true,
        });
      },
      signOut: () => actions.signOut(),
      requestPasswordReset: (email: string) => actions.requestPasswordReset({ email }),
      getPasswordResetPreview: (challengeId: string) =>
        actions.getPasswordResetPreview({ challengeId }),
      verifyReset: (challengeId: string, code: string) => actions.verifyReset({ challengeId, code }),
      resetPassword: (resetToken: string, newPassword: string) =>
        actions.resetPassword({ resetToken, newPassword }),
    },
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function authErrorKey(error: unknown): TranslationKey {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const keys: Record<string, string> = {
    NETWORK_OFFLINE: 'auth.errors.offline',
    OFFLINE: 'auth.errors.offline',
    SESSION_EXPIRED: 'auth.errors.sessionExpired',
    SESSION_REQUIRED: 'auth.errors.sessionExpired',
    UNAUTHORIZED: 'auth.errors.invalidCredentials',
    INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
    PASSWORD_RESET_REQUIRED: 'auth.errors.passwordResetRequired',
    EMAIL_ALREADY_EXISTS: 'auth.errors.emailExists',
    EMAIL_ALREADY_REGISTERED: 'auth.errors.emailExists',
    EMAIL_EXISTS: 'auth.errors.emailExists',
    RESET_CODE_INVALID: 'auth.errors.invalidCode',
    RESET_CHALLENGE_EXPIRED: 'auth.errors.expiredCode',
    RESET_CHALLENGE_INVALID: 'auth.errors.expiredCode',
    RESET_TOKEN_EXPIRED: 'auth.errors.expiredCode',
    RATE_LIMITED: 'auth.errors.rateLimited',
    VERSION_CONFLICT: 'auth.errors.conflict',
    CONFLICT: 'auth.errors.conflict',
  };

  return (keys[code] ?? 'auth.errors.generic') as TranslationKey;
}
