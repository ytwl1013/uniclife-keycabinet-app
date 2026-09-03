import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('frontend environment selection', () => {
  const frontendRoot = resolve(__dirname, '..');

  it('makes every local Expo entrypoint select dev or pro explicitly', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(frontendRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts).toMatchObject({
      start: 'EXPO_PUBLIC_APP_ENV=dev expo start --clear',
      'start:pro': 'EXPO_PUBLIC_APP_ENV=pro expo start --clear',
      android: 'EXPO_PUBLIC_APP_ENV=dev expo start --clear --android',
      'android:pro': 'EXPO_PUBLIC_APP_ENV=pro expo start --clear --android',
      ios: 'EXPO_PUBLIC_APP_ENV=dev expo start --clear --ios',
      'ios:pro': 'EXPO_PUBLIC_APP_ENV=pro expo start --clear --ios',
      web: 'EXPO_PUBLIC_APP_ENV=dev expo start --clear --web',
      'web:pro': 'EXPO_PUBLIC_APP_ENV=pro expo start --clear --web',
    });
  });

  it('keeps the local env template free of an environment selector', () => {
    const envExample = readFileSync(resolve(frontendRoot, '.env.example'), 'utf8');

    expect(envExample).not.toMatch(/^EXPO_PUBLIC_APP_ENV=/m);
    expect(envExample).toContain('EXPO_PUBLIC_API_BASE_URL_DEV=');
    expect(envExample).toContain('EXPO_PUBLIC_API_BASE_URL_PRO=');
  });
});
