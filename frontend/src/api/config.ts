export type AppEnvironment = 'dev' | 'pro';

const configuredAppEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim();

if (configuredAppEnvironment !== 'dev' && configuredAppEnvironment !== 'pro') {
  throw new Error('EXPO_PUBLIC_APP_ENV must be set to dev or pro');
}

const configuredApiBaseUrl = (configuredAppEnvironment === 'pro'
  ? process.env.EXPO_PUBLIC_API_BASE_URL_PRO
  : process.env.EXPO_PUBLIC_API_BASE_URL_DEV)?.trim();

if (!configuredApiBaseUrl) {
  throw new Error(`EXPO_PUBLIC_API_BASE_URL_${configuredAppEnvironment.toUpperCase()} is required`);
}

const parsedApiBaseUrl = new URL(configuredApiBaseUrl);

if (configuredAppEnvironment === 'pro' && parsedApiBaseUrl.protocol !== 'https:') {
  throw new Error('The production API base URL must use HTTPS');
}

export const apiConfig = {
  appEnvironment: configuredAppEnvironment,
  baseUrl: configuredApiBaseUrl.replace(/\/+$/, ''),
} as const;
