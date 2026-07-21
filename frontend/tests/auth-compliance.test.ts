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
    initialState: createInitialMockState({ hydrated: true }),
  });
}

describe('authentication and consent workflow', () => {
  it('registers without email verification while keeping marketing consent separate and off', async () => {
    const app = anonymousService();
    const user = await app.actions.register({
      email: 'new.owner@example.com',
      password: 'SecureDemo123!',
      displayName: 'New Owner',
      locale: 'en-GB',
      acceptedTerms: true,
      acceptedPrivacy: true,
      marketingOptIn: false,
    });

    expect(app.getState().sessionStatus).toBe('authenticated');
    expect(app.getState().consents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: user.id, kind: 'terms', granted: true }),
        expect.objectContaining({ userId: user.id, kind: 'privacy', granted: true }),
        expect.objectContaining({ userId: user.id, kind: 'marketing', granted: false }),
      ]),
    );
  });

  it('requires explicit terms and privacy consent but never requires marketing consent', async () => {
    const app = anonymousService();
    await expect(app.actions.register({
      email: 'missing.consent@example.com',
      password: 'SecureDemo123!',
      displayName: 'Missing Consent',
      locale: 'en-US',
      acceptedTerms: true,
      acceptedPrivacy: false,
      marketingOptIn: false,
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('uses a transient verification challenge only for password reset', async () => {
    const app = anonymousService();
    const challenge = await app.actions.requestPasswordReset({ email: 'alex.morgan@example.com' });
    const verification = await app.actions.verifyReset({
      challengeId: challenge.challengeId,
      code: challenge.demoCode,
    });
    await expect(
      app.actions.verifyReset({
        challengeId: challenge.challengeId,
        code: challenge.demoCode,
      }),
    ).rejects.toMatchObject({ code: 'RESET_CHALLENGE_INVALID' });
    await app.actions.resetPassword({ resetToken: verification.resetToken, newPassword: 'ChangedDemo123!' });
    await app.actions.signIn({ email: 'alex.morgan@example.com', password: 'ChangedDemo123!' });
    expect(app.getState().sessionStatus).toBe('authenticated');
  });

  it('never accepts an arbitrary password when no in-memory credential exists', async () => {
    const app = anonymousService();

    await expect(
      app.actions.signIn({
        email: 'alex.morgan@example.com',
        password: 'AnyPassword123!',
      }),
    ).rejects.toMatchObject({ code: 'PASSWORD_RESET_REQUIRED' });
  });

  it('commits a void write once and replays the same request idempotently', async () => {
    const app = anonymousService();
    await app.actions.switchAccount({ userId: 'user-owner' });
    const version = app.getState().version;
    const input = {
      expectedVersion: version,
      granted: true,
      requestId: 'marketing-consent-void-result',
    };

    await expect(app.actions.setMarketingConsent(input)).resolves.toBeUndefined();
    const committedVersion = app.getState().version;
    const consentCount = app.getState().consents.length;

    await expect(app.actions.setMarketingConsent(input)).resolves.toBeUndefined();
    expect(app.getState().version).toBe(committedVersion);
    expect(app.getState().consents).toHaveLength(consentCount);
  });

  it('blocks account deletion while ownership still needs transfer', async () => {
    const app = anonymousService();
    await app.actions.switchAccount({ userId: 'user-owner' });
    await expect(app.actions.deleteAccount()).rejects.toMatchObject({ code: 'OWNER_TRANSFER_REQUIRED' });
  });

  it('anonymizes a deleted account, clears consent, audits membership removal, and frees the email', async () => {
    const app = anonymousService();
    await app.actions.switchAccount({ userId: 'user-admin' });

    await app.actions.deleteAccount({ requestId: 'delete-demo-admin' });

    const deleted = app.getState().users.find((user) => user.id === 'user-admin');
    expect(deleted).toMatchObject({
      displayName: 'Deleted account',
      status: 'disabled',
    });
    expect(deleted?.email).not.toBe('sophie.keller@example.com');
    expect(app.getState().consents.some((consent) => consent.userId === 'user-admin')).toBe(false);
    expect(
      app.getState().memberships.find((membership) => membership.id === 'membership-hq-admin'),
    ).toMatchObject({ active: false, removedAt: app.getState().now });
    expect(
      app.getState().events.some(
        (event) =>
          event.actorId === 'user-admin' &&
          event.type === 'member_removed' &&
          event.summaryData.reason === 'account_deleted',
      ),
    ).toBe(true);

    const replacement = await app.actions.register({
      email: 'sophie.keller@example.com',
      password: 'Replacement123!',
      displayName: 'Replacement Admin',
      locale: 'de-DE',
      acceptedTerms: true,
      acceptedPrivacy: true,
      marketingOptIn: false,
    });
    expect(replacement.id).not.toBe('user-admin');
    expect(replacement.email).toBe('sophie.keller@example.com');
  });
});
