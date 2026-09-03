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

  it('removes authentication routes from the stack after sign in and disables the tab-root back gesture', () => {
    const rootLayout = source('src/app/_layout.tsx');

    expect(rootLayout).toContain("const authenticated = state.sessionStatus === 'authenticated'");
    expect(rootLayout).toContain('<Stack.Protected guard={!authenticated}>');
    expect(rootLayout).toContain('<Stack.Protected guard={authenticated}>');
    expect(rootLayout).toContain('name="(tabs)" options={{ gestureEnabled: false');
  });

  it('sends anonymous users directly to sign in without a welcome route', () => {
    const entry = source('src/app/index.tsx');
    const authLayout = source('src/app/(auth)/_layout.tsx');

    expect(entry).toContain('<Redirect href="/(auth)/sign-in" />');
    expect(authLayout).toContain("initialRouteName: 'sign-in'");
    expect(authLayout).not.toContain('name="welcome"');
    expect(existsSync(resolve(__dirname, '../src/app/(auth)/welcome.tsx'))).toBe(false);
  });

  it('sends returning users home while keeping workspace setup after registration', () => {
    const signIn = source('src/app/(auth)/sign-in.tsx');
    const signUp = source('src/app/(auth)/sign-up.tsx');
    const onboarding = source('src/app/onboarding.tsx');
    const scan = source('src/features/scan/components/scan-flow.tsx');

    expect(signIn).toContain('await actions.signIn({ email: nextEmail, password })');
    expect(signIn).toContain("const homeRoute = '/(tabs)' as Href");
    expect(signIn).toContain('router.replace(homeRoute)');
    expect(signIn).not.toContain('onboardingRoute');
    expect(signUp).toContain('router.replace(onboardingRoute)');
    expect(signIn).not.toContain('useDemo');
    expect(signIn).not.toContain("params: { preview: '1' }");
    expect(onboarding).toContain("router.push({ pathname: '/(details)/scan'");
    expect(onboarding).toContain('void signOut(true)');
    expect(onboarding).toContain('router.back()');
    expect(scan).toContain("<ScreenHeader onBack={() => router.back()} title={t('scan.title')} />");
  });

  it('opens cabinet import help from workspace setup and provides a return action', () => {
    const onboarding = source('src/app/onboarding.tsx');
    const guideRoute = source('src/app/(details)/workspace-import-guide.tsx');
    const guideScreen = source('src/features/auth/components/workspace-import-guide-screen.tsx');
    const detailsLayout = source('src/app/(details)/_layout.tsx');

    expect(onboarding).toContain("const importGuideRoute = '/(details)/workspace-import-guide' as Href");
    expect(onboarding).toContain("accessibilityLabel: t('onboarding.importGuide.openAction')");
    expect(onboarding).toContain("icon: 'guide'");
    expect(onboarding).toContain("label: t('onboarding.importGuide.openAction')");
    expect(guideRoute).toContain('<WorkspaceImportGuideScreen />');
    expect(guideScreen).toContain('onBack={() => router.back()}');
    expect(guideScreen).toContain("require('@/assets/images/cabinet-settings-invite-guide.png')");
    expect(detailsLayout).toContain('<Stack.Screen name="workspace-import-guide" />');
  });
});
