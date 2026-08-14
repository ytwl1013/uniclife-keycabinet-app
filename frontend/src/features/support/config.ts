const configuredSupportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();

export const supportEmail = configuredSupportEmail || 'support@example.com';
