import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

describe('mobile navigation architecture', () => {
  it('keeps browsing and detail routes inside their owning tabs', () => {
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/cabinets/[cabinetId]/index.tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/cabinets/[cabinetId]/keys/[keyId].tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/(tabs)/account/developer-settings.tsx'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../src/app/cabinets/[cabinetId]/index.tsx'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../src/app/account/developer-settings.tsx'))).toBe(false);
  });

  it('only hides the tab bar for focused forms and keeps keyboard hiding enabled', () => {
    const tabs = source('src/app/(tabs)/_layout.tsx');

    expect(tabs).toContain('tabBarHideOnKeyboard: true');
    expect(tabs).toContain("display: focusedForm ? 'none' : 'flex'");
    expect(tabs).toContain('/keys\\/new');
    expect(tabs).toContain('/loans\\/');
    expect(tabs).not.toContain('/keys\\/[^/]+$');
    expect(tabs).not.toContain('/developer-settings$');
  });

  it('keeps fixed headers and footers outside the body scroll view', () => {
    const scaffold = source('src/components/app-scaffold.tsx');
    const headerPosition = scaffold.indexOf('{header ?');
    const bodyPosition = scaffold.indexOf('{body}');
    const footerPosition = scaffold.indexOf('{footer ?');

    expect(headerPosition).toBeGreaterThan(0);
    expect(bodyPosition).toBeGreaterThan(headerPosition);
    expect(footerPosition).toBeGreaterThan(bodyPosition);
    expect(scaffold).toContain("edges={tabBarAware ? [] : ['bottom']}");
  });

  it('supports horizontal chips and click/swipe synchronized cabinet pages', () => {
    const chips = source('src/components/ui/scrollable-chip-row.tsx');
    const pager = source('src/components/ui/swipe-segment-pager.tsx');
    const webPager = source('src/components/ui/swipe-segment-pager.web.tsx');
    const cabinet = source('src/app/(tabs)/cabinets/[cabinetId]/index.tsx');

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

  it('keeps DOM download APIs inside the web adapter', () => {
    const sharedExports = source('src/mocks/exports.ts');
    const webDelivery = source('src/mocks/export-delivery.web.ts');

    expect(sharedExports).not.toContain('document.createElement');
    expect(sharedExports).not.toContain('new Blob');
    expect(webDelivery).toContain('document.createElement');
    expect(webDelivery).toContain('new Blob');
  });
});
