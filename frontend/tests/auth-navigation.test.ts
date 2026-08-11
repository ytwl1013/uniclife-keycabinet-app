import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

describe('authentication navigation', () => {
  it('sends returning users directly to sign in after signing out', () => {
    const account = source('src/features/account/components/account-screen.tsx');
    const onboarding = source('src/app/onboarding.tsx');
    const tabs = source('src/app/(tabs)/_layout.tsx');

    expect(account).toContain("router.replace('/(auth)/sign-in')");
    expect(account).not.toContain("router.replace('/(auth)/welcome')");
    expect(onboarding).toContain("const signInRoute = '/(auth)/sign-in' as Href");
    expect(tabs).toContain('return <Redirect href="/(auth)/sign-in" />');
  });

  it('sends anonymous users directly to sign in without a welcome route', () => {
    const entry = source('src/app/index.tsx');
    const authLayout = source('src/app/(auth)/_layout.tsx');

    expect(entry).toContain('<Redirect href="/(auth)/sign-in" />');
    expect(authLayout).toContain("initialRouteName: 'sign-in'");
    expect(authLayout).not.toContain('name="welcome"');
    expect(existsSync(resolve(__dirname, '../src/app/(auth)/welcome.tsx'))).toBe(false);
  });

  it('preserves back navigation through preview and workspace setup', () => {
    const signIn = source('src/app/(auth)/sign-in.tsx');
    const onboarding = source('src/app/onboarding.tsx');
    const scan = source('src/features/scan/components/scan-flow.tsx');

    expect(signIn).toContain("params: { preview: '1' }");
    expect(signIn).toContain('router.push({');
    expect(onboarding).toContain("router.push({ pathname: '/(details)/scan'");
    expect(onboarding).toContain('void signOut(true)');
    expect(onboarding).toContain('router.back()');
    expect(scan).toContain("<ScreenHeader onBack={() => router.back()} title={t('scan.title')} />");
  });
});
