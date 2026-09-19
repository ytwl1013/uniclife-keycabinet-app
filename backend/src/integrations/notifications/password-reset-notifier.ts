import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../../common/config/env.js';

export type PasswordResetNotification = {
  userId: string;
  email: string;
  displayName: string;
  code: string;
  expiresAt: string;
};

export type PasswordResetNotifier = {
  send(notification: PasswordResetNotification): Promise<void>;
};

export class SmtpPasswordResetNotifier implements PasswordResetNotifier {
  constructor(private readonly options: {
    transport: Pick<Transporter, 'sendMail'>;
    from: { address: string; name: string };
  }) {}

  async send(notification: PasswordResetNotification): Promise<void> {
    await this.options.transport.sendMail({
      from: this.options.from,
      to: notification.email,
      envelope: { from: this.options.from.address, to: notification.email },
      subject: 'Uniclife Key Cabinet — Password reset code',
      text: [
        'Your password reset code is:',
        notification.code,
        '',
        `Expires at: ${notification.expiresAt}`,
        'If you did not request this reset, ignore this email.',
      ].join('\n'),
    });
  }
}

export function createSmtpPasswordResetNotifier(): PasswordResetNotifier | undefined {
  if (!env.MAIL_SERVER || !env.MAIL_USERNAME || !env.MAIL_PASSWORD) return undefined;
  const timeout = env.MAIL_TIMEOUT * 1000;
  return new SmtpPasswordResetNotifier({
    from: { address: env.MAIL_USERNAME, name: env.MAIL_SENDER_NAME },
    transport: nodemailer.createTransport({
      host: env.MAIL_SERVER,
      port: env.MAIL_PORT,
      secure: env.MAIL_USE_SSL,
      requireTLS: env.MAIL_USE_TLS,
      auth: { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD },
      connectionTimeout: timeout,
      greetingTimeout: timeout,
      socketTimeout: timeout,
    }),
  });
}
