import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createInitialMockState } from '../src/mocks/seed';
import { createMockAppService } from '../src/mocks/service';
import { createMemoryStorage } from '../src/mocks/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function anonymousService() {
  return createMockAppService({
    storage: createMemoryStorage(),
    latencyMs: 0,
    initialState: createInitialMockState({ hydrated: true, now: '2026-07-21T08:15:00.000Z' }),
    now: () => new Date('2026-07-21T08:15:00.000Z'),
    resetCodeFactory: () => '583920',
    developerToolsEnabled: true,
  });
}

describe('authentication and consent workflow', () => {
  it('requires and persists the administrator name without deriving it from email', async () => {
    const app = anonymousService();
    await expect(app.actions.register({
      email: 'email.alias@example.com', password: 'SecureDemo123!', displayName: ' ', locale: 'zh-CN', acceptedTerms: true, acceptedPrivacy: true,
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    const user = await app.actions.register({
      email: 'email.alias@example.com', password: 'SecureDemo123!', displayName: '林悦', locale: 'zh-CN', acceptedTerms: true, acceptedPrivacy: true,
    });
    expect(user.displayName).toBe('林悦');
    expect(user.displayName).not.toBe('email alias');
  });

  it('records only required legal consents and exposes no marketing action', async () => {
    const app = anonymousService();
    const user = await app.actions.register({
      email: 'new.admin@example.com', password: 'SecureDemo123!', displayName: 'New Admin', locale: 'en-GB', acceptedTerms: true, acceptedPrivacy: true,
    });
    expect(app.getState().consents.filter((consent) => consent.userId === user.id).map((consent) => consent.kind).sort()).toEqual(['privacy', 'terms']);
    expect('setMarketingConsent' in app.actions).toBe(false);
  });

  it('requires terms and privacy consent', async () => {
    const app = anonymousService();
    await expect(app.actions.register({
      email: 'missing.consent@example.com', password: 'SecureDemo123!', displayName: 'Missing Consent', locale: 'en-US', acceptedTerms: true, acceptedPrivacy: false,
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('allows any Admin account to be deleted without ownership transfer', async () => {
    const app = anonymousService();
    await app.actions.switchAccount({ userId: 'user-owner' });
    await expect(app.actions.deleteAccount()).resolves.toBeUndefined();
    expect(app.getState().users.find((user) => user.id === 'user-owner')).toMatchObject({ status: 'disabled', displayName: 'Deleted account' });
    expect(app.getState().memberships.filter((membership) => membership.userId === 'user-owner').every((membership) => !membership.active)).toBe(true);
  });

  it('updates the signed-in user profile and login email through validated actions', async () => {
    const app = anonymousService();
    await app.actions.switchAccount({ userId: 'user-owner' });

    await app.actions.updateProfile({
      displayName: 'Alex Chen',
      avatarUri: 'file:///profile-photo.jpg',
    });
    await app.actions.updateEmail({ email: 'alex.chen@example.com' });

    expect(app.getState().users.find((user) => user.id === 'user-owner')).toMatchObject({
      avatarUri: 'file:///profile-photo.jpg',
      displayName: 'Alex Chen',
      email: 'alex.chen@example.com',
    });
    await expect(app.actions.updateEmail({ email: 'sophie.keller@example.com' })).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
    });
  });

  it('removes marketing controls from registration and account source', () => {
    const signUp = readFileSync(resolve(__dirname, '../src/app/(auth)/sign-up.tsx'), 'utf8');
    const account = readFileSync(resolve(__dirname, '../src/features/account/components/account-screen.tsx'), 'utf8');
    expect(signUp).not.toContain('marketingOptIn');
    expect(account).not.toContain('marketingConsent');
    expect(account).not.toContain('setMarketingConsent');
  });

  it('keeps the transient verification challenge for password reset', async () => {
    const app = anonymousService();
    const challenge = await app.actions.requestPasswordReset({ email: 'alex.morgan@example.com' });
    expect(await app.actions.getPasswordResetPreview(challenge)).toEqual({ code: '583920' });
    const verification = await app.actions.verifyReset({ challengeId: challenge.challengeId, code: '583920' });
    await app.actions.resetPassword({ resetToken: verification.resetToken, newPassword: 'ChangedDemo123!' });
    await app.actions.signIn({ email: 'alex.morgan@example.com', password: 'ChangedDemo123!' });
    expect(app.getState().sessionStatus).toBe('authenticated');
  });
});
