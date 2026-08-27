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

export const noopPasswordResetNotifier: PasswordResetNotifier = {
  async send(): Promise<void> {
    // Production must replace this adapter with an email provider.
  },
};
