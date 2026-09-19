import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildServer } from '../src/app/server.js';
import { sql } from '../src/db/client.js';
import type { PasswordResetNotification } from '../src/integrations/notifications/password-reset-notifier.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('password reset with a controlled mail sink', () => {
  it('delivers a usable code, revokes old sessions, and audits failed delivery', async () => {
    const send = vi.fn<(notification: PasswordResetNotification) => Promise<void>>().mockResolvedValue(undefined);
    const app = await buildServer({ passwordResetNotifier: { send } });
    try {
      const email = `reset-${randomUUID()}@example.com`;
      const registration = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: {
        email, password: randomUUID(), displayName: 'Reset test', locale: 'en-US', acceptedTerms: true, acceptedPrivacy: true,
      } });
      expect(registration.statusCode).toBe(201);
      const identity = registration.json().data;
      const requested = await app.inject({ method: 'POST', url: '/api/v1/auth/password-resets', payload: { email } });
      expect(requested.statusCode).toBe(202);
      expect(send).toHaveBeenCalledTimes(1);
      const notification = send.mock.calls[0]![0];
      expect(notification.email).toBe(email);
      expect(notification.userId).toBe(identity.user.id);
      expect(requested.body).not.toContain(notification.code);
      const verified = await app.inject({ method: 'POST', url: '/api/v1/auth/password-resets/verify', payload: {
        challengeId: requested.json().data.challengeId, code: notification.code,
      } });
      expect(verified.statusCode).toBe(200);
      const newPassword = randomUUID();
      const reset = await app.inject({ method: 'POST', url: '/api/v1/auth/password-resets/complete', payload: {
        resetToken: verified.json().data.resetToken, newPassword,
      } });
      expect(reset.statusCode).toBe(200);
      const oldSession = await app.inject({ url: '/api/v1/auth/session', headers: { authorization: `Bearer ${identity.session.token}` } });
      expect(oldSession.statusCode).toBe(401);
      const signedIn = await app.inject({ method: 'POST', url: '/api/v1/auth/sign-in', payload: { email, password: newPassword } });
      expect(signedIn.statusCode).toBe(200);

      send.mockRejectedValueOnce(new Error('Controlled SMTP failure'));
      const failed = await app.inject({ method: 'POST', url: '/api/v1/auth/password-resets', payload: { email } });
      expect(failed.statusCode).toBe(503);
      expect(failed.json().code).toBe('PASSWORD_RESET_DELIVERY_FAILED');
      const challenges = await sql!`select consumed_at from password_reset_challenges where user_id=${identity.user.id}`;
      expect(challenges).toHaveLength(2);
      expect(challenges.every(challenge => challenge.consumed_at !== null)).toBe(true);
      const failures = await sql!`select reason_code from audit_logs where actor_id=${identity.user.id} and action='auth.password_reset_notification' and result='failure'`;
      expect(failures.map(row => row.reason_code)).toEqual(['NOTIFICATION_FAILED']);
    } finally {
      await app.close();
    }
  });
});
