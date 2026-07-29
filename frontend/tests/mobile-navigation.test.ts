import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

describe('mobile navigation architecture', () => {
  it('keeps tab roots inside the tab navigator and moves detail routes outside it', () => {
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/cabinets/index.tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/account/index.tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(details)/cabinets/[cabinetId]/index.tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(details)/cabinets/[cabinetId]/keys/[keyId].tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(details)/account/developer-settings.tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/cabinets/[cabinetId]/index.tsx'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/account/developer-settings.tsx'))).toBe(false);
  });

  it('keeps the tab bar limited to tab roots without a reserved top padding', () => {
    const tabs = source('src/app/(tabs)/_layout.tsx');
    const tokens = JSON.parse(source('design-tokens.json')) as {
      navigation: Record<string, number>;
    };

    expect(tabs).toContain('tabBarHideOnKeyboard: true');
    expect(tabs).not.toContain('usePathname');
    expect(tabs).not.toContain('focusedForm');
    expect(tabs).not.toContain('paddingTop:');
    expect(tokens.navigation.tabBarHeight).toBe(55);
    expect(tokens.navigation.tabBarPaddingTop).toBeUndefined();
  });

  it('hides the account stack header and uses platform-specific bottom sheets', () => {
    const accountStack = source('src/app/(tabs)/account/_layout.tsx');
    const sharedBottomSheet = source('src/components/ui/bottom-sheet.tsx');
    const androidBottomSheet = source('src/components/ui/bottom-sheet.android.tsx');
    const iosBottomSheet = source('src/components/ui/bottom-sheet.ios.tsx');
    const nativeBottomSheet = source('src/components/ui/bottom-sheet-native.tsx');
    const overlayBottomSheet = source('src/components/ui/bottom-sheet-overlay.tsx');

    expect(accountStack).toContain('<Stack.Screen name="index" options={{ headerShown: false }} />');
    expect(sharedBottomSheet).toContain("from './bottom-sheet-overlay'");
    expect(androidBottomSheet).toContain("from './bottom-sheet-native'");
    expect(iosBottomSheet).toContain("from './bottom-sheet-native'");
    expect(nativeBottomSheet).toContain("from 'heroui-native/bottom-sheet'");
    expect(nativeBottomSheet).toContain('<HeroBottomSheet');
    expect(nativeBottomSheet).toContain('<HeroBottomSheet.Overlay');
    expect(nativeBottomSheet).toContain('<HeroBottomSheet.Content');
    expect(nativeBottomSheet).toContain('<BottomSheetScrollView');
    expect(nativeBottomSheet).toContain("const NATIVE_SHEET_SNAP_POINTS = ['55%', '82%']");
    expect(nativeBottomSheet).toContain('snapPoints={NATIVE_SHEET_SNAP_POINTS}');
    expect(nativeBottomSheet).toContain('enableDynamicSizing={false}');
    expect(nativeBottomSheet).toContain('contentContainerProps={{ style: { flex: 1, padding: 0 } }}');
    expect(nativeBottomSheet).toContain('fillAvailable');
    expect(nativeBottomSheet).toContain('contentContainerStyle={{ flexGrow: 1 }}');
    expect(nativeBottomSheet).toContain('nestedScrollEnabled');
    expect(nativeBottomSheet).toContain('style={{ flex: 1 }}');
    expect(overlayBottomSheet).toContain('animationType="none"');
    expect(overlayBottomSheet).toContain('FadeIn.duration');
    expect(overlayBottomSheet).toContain('SlideInDown.duration');
    expect(overlayBottomSheet).not.toContain('animationType="slide"');
    expect(sharedBottomSheet).not.toContain('@expo/ui');
    expect(nativeBottomSheet).not.toContain('@expo/ui');
  });

  it('keeps one HeroUI provider at the native root and controlled bottom sheets below it', () => {
    const rootLayout = source('src/app/_layout.tsx');
    const nativeProvider = source('src/components/ui/app-ui-provider.native.tsx');
    const nativeBottomSheet = source('src/components/ui/bottom-sheet-native.tsx');

    expect(rootLayout).toContain('<AppUiProvider>');
    expect(nativeProvider).toContain('<GestureHandlerRootView');
    expect(nativeProvider).not.toContain('NATIVE ROOT OK');
    expect(nativeProvider).not.toContain('[boot]');
    expect(nativeProvider).toContain("from 'heroui-native/provider'");
    expect(nativeProvider).toContain('<HeroUINativeProvider');
    expect(nativeProvider).toContain('toast: false');
    expect(nativeBottomSheet).not.toContain("from 'heroui-native/provider'");
    expect(nativeBottomSheet).not.toContain('<HeroUINativeProvider');
    expect(nativeBottomSheet).toContain('isOpen={visible}');
    expect(nativeBottomSheet).not.toContain('if (!visible)');
  });

  it('keeps account actions tappable, routes details through the sibling stack, and removes tab header dividers', () => {
    const account = source('src/features/account/components/account-screen.tsx');
    const accountUi = source('src/features/account/components/account-ui.tsx');
    const tabHeaders = [
      source('src/app/(tabs)/index.tsx'),
      source('src/app/(tabs)/cabinets/index.tsx'),
      source('src/app/(tabs)/activity.tsx'),
      source('src/features/scan/components/scan-flow.tsx'),
    ];

    expect(account).toContain("privacy: '/(details)/account/privacy' as Href");
    expect(account).toContain("changePassword: '/(details)/account/change-password' as Href");
    expect(account).toContain('headerShown={false}');
    expect(accountUi).toContain('hitSlop={4}');
    expect(accountUi).toContain('className="mx-auto w-full max-w-content gap-6 px-screen"');
    expect(accountUi).not.toContain('className="border-b border-line bg-background"');
    tabHeaders.forEach((header) => {
      expect(header).not.toContain('className="border-b border-line bg-background"');
    });
  });

  it('keeps page-owned fixed headers and footers outside body scrolling', () => {
    const addKey = source('src/app/(details)/cabinets/[cabinetId]/keys/new.tsx');
    const cabinet = source('src/app/(details)/cabinets/[cabinetId]/index.tsx');
    const headerPosition = addKey.indexOf('className="border-b border-line bg-background"');
    const bodyPosition = addKey.indexOf('<ScrollView', headerPosition);
    const footerPosition = addKey.indexOf("edges={['bottom']}", bodyPosition);

    expect(headerPosition).toBeGreaterThan(0);
    expect(bodyPosition).toBeGreaterThan(headerPosition);
    expect(footerPosition).toBeGreaterThan(bodyPosition);
    expect(cabinet.indexOf('<SwipeSegmentPager')).toBeGreaterThan(
      cabinet.indexOf('className="border-b border-line bg-background"'),
    );
    expect(existsSync(resolve(__dirname, '../src/components/app-scaffold.tsx'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../src/components/app-screen.tsx'))).toBe(false);
  });

  it('supports horizontal chips and click/swipe synchronized cabinet pages', () => {
    const chips = source('src/components/ui/scrollable-chip-row.tsx');
    const pager = source('src/components/ui/swipe-segment-pager.tsx');
    const webPager = source('src/components/ui/swipe-segment-pager.web.tsx');
    const cabinet = source('src/app/(details)/cabinets/[cabinetId]/index.tsx');

    expect(chips).toContain('horizontal');
    expect(chips).toContain('scrollTo');
    expect(chips).toContain("width: '100%'");
    expect(pager).toContain('react-native-pager-view');
    expect(pager).toContain('onPageSelected');
    expect(pager).toContain('setPage');
    expect(webPager).toContain('onScroll={syncSelectedPage}');
    expect(webPager).toContain('programmaticTargetRef');
    expect(cabinet).toContain('<SwipeSegmentPager');
  });

  it('keeps segmented and filter controls at least 44px tall', () => {
    const controls = source('src/features/cabinet-prototype/components/prototype-ui.tsx');

    expect(controls).toContain('min-h-11 min-w-[78px]');
    expect(controls).toContain('min-h-11 items-center justify-center rounded-pill');
    expect(controls).not.toContain('min-h-10 items-center justify-center rounded-pill');
  });

  it('virtualizes the high-volume mobile lists', () => {
    const files = [
      'src/app/(tabs)/cabinets/index.tsx',
      'src/app/(tabs)/activity.tsx',
      'src/features/cabinet-prototype/components/key-slot-grid.tsx',
      'src/features/cabinet-prototype/components/cabinet-sections.tsx',
    ];

    files.forEach((file) => expect(source(file)).toContain('FlatList'));
  });

  it('uses the native camera path, resilient scanner fallback and real QR rendering', () => {
    const scan = source('src/features/scan/components/scan-flow.tsx');
    const developer = source('src/features/account/components/developer-settings-screen.tsx');

    expect(scan).toContain('<CameraView');
    expect(scan).toContain('onBarcodeScanned');
    expect(scan).toContain('onMountError');
    expect(scan).toContain('permission.canAskAgain');
    expect(scan).toContain('Linking.openSettings');
    expect(scan).toContain('CameraView.isModernBarcodeScannerAvailable');
    expect(scan).toContain('CameraView.launchScanner');
    expect(scan).toContain('setTimeout(resetScanner, 1800)');
    expect(developer).toContain("react-native-qrcode-svg");
    expect(developer).toContain('<QRCode');
  });

  it('preserves scan history when opening a cabinet and returns home after binding', () => {
    const scan = source('src/features/scan/components/scan-flow.tsx');

    expect(scan).toContain("router.push({\n        pathname: '/cabinets/[cabinetId]'");
    expect(scan).toContain("router.replace('/(tabs)');");
    expect(scan).not.toContain('openCabinet(result.cabinet.id)');
    expect(scan).not.toContain("router.replace({\n        pathname: '/cabinets/[cabinetId]'");
  });

  it('keeps DOM download APIs inside the web adapter', () => {
    const sharedExports = source('src/mocks/exports.ts');
    const webDelivery = source('src/mocks/export-delivery.web.ts');

    expect(sharedExports).not.toContain('document.createElement');
    expect(sharedExports).not.toContain('new Blob');
    expect(webDelivery).toContain('document.createElement');
    expect(webDelivery).toContain('new Blob');
  });
});
