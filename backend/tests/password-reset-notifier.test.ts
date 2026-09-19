import { describe, expect, it, vi } from 'vitest';
import { buildServer } from '../src/app/server.js';
import { SmtpPasswordResetNotifier } from '../src/integrations/notifications/password-reset-notifier.js';

describe('password reset email', () => {
  it('sends the code only to the account email and propagates transport failures', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const notifier = new SmtpPasswordResetNotifier({ transport: { sendMail }, from: { address: 'sender@example.com', name: 'Test' } });
    const notification = { userId: 'test-user', email: 'recipient@example.com', displayName: 'Test', code: '123456', expiresAt: '2026-09-19T12:00:00Z' };
    await notifier.send(notification);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: notification.email, envelope: { from: 'sender@example.com', to: notification.email }, text: expect.stringContaining(notification.code),
    }));
    sendMail.mockRejectedValueOnce(new Error('SMTP failed'));
    await expect(notifier.send(notification)).rejects.toThrow('SMTP failed');
  });

  it('does not claim to send a code when email and development preview are unconfigured', async () => {
    const app = await buildServer();
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/password-resets', payload: { email: 'reset-test@example.com' } });
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe('PASSWORD_RESET_UNAVAILABLE');
    await app.close();
  });
});
