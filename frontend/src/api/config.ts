export type AppEnvironment = 'development' | 'production';

const configuredAppEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim();
const configuredApiBaseUrl =
  (configuredAppEnvironment === 'production'
    ? process.env.EXPO_PUBLIC_API_BASE_URL_PRO?.trim()
    : undefined) || process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (configuredAppEnvironment !== 'development' && configuredAppEnvironment !== 'production') {
  throw new Error('EXPO_PUBLIC_APP_ENV must be set to development or production');
}

if (!configuredApiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_API_BASE_URL_PRO in production) is required');
}

const parsedApiBaseUrl = new URL(configuredApiBaseUrl);

if (configuredAppEnvironment === 'production' && parsedApiBaseUrl.protocol !== 'https:') {
  throw new Error('The production API base URL must use HTTPS');
}

export const apiConfig = {
  appEnvironment: configuredAppEnvironment,
  baseUrl: configuredApiBaseUrl.replace(/\/+$/, ''),
} as const;
