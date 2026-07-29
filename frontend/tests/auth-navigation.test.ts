import { readFileSync } from 'node:fs';
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

  it('keeps the welcome page as the anonymous app entry', () => {
    const entry = source('src/app/index.tsx');

    expect(entry).toContain('<Redirect href="/(auth)/welcome" />');
  });
});
