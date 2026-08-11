import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = (relativePath: string) => resolve(__dirname, '..', relativePath);
const source = (relativePath: string) => readFileSync(path(relativePath), 'utf8');

describe('simplified mobile navigation architecture', () => {
  it('keeps exactly Home, Activity, and Account in the tab bar', () => {
    const tabs = source('src/app/(tabs)/_layout.tsx');
    expect(tabs).toContain("screen: 'index'");
    expect(tabs).toContain("screen: 'activity'");
    expect(tabs).toContain("screen: 'account'");
    expect(tabs).not.toContain("screen: 'cabinets'");
    expect(tabs).not.toContain("screen: 'scan'");
    expect(existsSync(path('src/app/(tabs)/cabinets/index.tsx'))).toBe(false);
    expect(existsSync(path('src/app/(tabs)/scan.tsx'))).toBe(false);
  });

  it('keeps scan and cabinet/key details in the sibling details stack', () => {
    const layout = source('src/app/(details)/_layout.tsx');
    expect(existsSync(path('src/app/(details)/scan.tsx'))).toBe(true);
    expect(existsSync(path('src/app/(details)/cabinets/[cabinetId]/index.tsx'))).toBe(true);
    expect(existsSync(path('src/app/(details)/cabinets/[cabinetId]/keys/[keyId].tsx'))).toBe(true);
    expect(layout).toContain('<Stack.Screen name="scan"');
  });

  it('puts full searchable cabinet list and the prominent scanner on Home', () => {
    const home = source('src/app/(tabs)/index.tsx');
    expect(home).toContain('testID="home-primary-scan"');
    expect(home).toContain("router.push('/(details)/scan' as Href)");
    expect(home).toContain('filteredCabinets.map');
    expect(home).toContain('<SearchInput');
    expect(home).not.toContain('summaryCabinets');
    expect(home).not.toContain('viewAll');
  });

  it('provides a repeatable five-step rounded spotlight guide covering core key flows', () => {
    const home = source('src/app/(tabs)/index.tsx');
    const guide = source('src/features/home/components/home-spotlight-guide.tsx');
    expect(home).toContain('const GUIDE_STEPS = 5');
    expect(home).toContain('containerRef={sectionRefs[3]}');
    expect(home).toContain('label={t(\'home.userGuide\')}');
    expect(guide).toContain('accessibilityViewIsModal');
    expect(guide).toContain('home.guideBack');
    expect(guide).toContain('home.guideSkip');
    expect(guide).toContain("home.guideDone");
    expect(guide).toContain('Mask id="home-guide-mask"');
    expect(guide).toContain('rx={18}');
  });

  it('keeps activity read-only and removes download implementations', () => {
    const activity = source('src/app/(tabs)/activity.tsx');
    const sections = source('src/features/cabinet-prototype/components/cabinet-sections.tsx');
    expect(activity).not.toContain('exportCabinetLog');
    expect(activity).not.toContain('undoEvent');
    expect(activity).not.toContain('onUndo');
    expect(sections).not.toContain('exportCabinetLog');
    expect(sections).not.toContain('undoEvent');
    expect(existsSync(path('src/mocks/exports.ts'))).toBe(false);
    expect(existsSync(path('src/mocks/export-delivery.web.ts'))).toBe(false);
  });

  it('uses the native camera path and editable cabinet name confirmation', () => {
    const scan = source('src/features/scan/components/scan-flow.tsx');
    expect(scan).toContain('<CameraView');
    expect(scan).toContain('onBarcodeScanned');
    expect(scan).toContain("t('scan.cabinetName')");
    expect(scan).toContain('name: expectedOwner ? cabinetName.trim() : undefined');
  });

  it('opens cabinet details on Keys with only Keys, Activity, and Settings', () => {
    const cabinet = source('src/app/(details)/cabinets/[cabinetId]/index.tsx');
    const controls = source('src/features/cabinet-prototype/components/prototype-ui.tsx');
    expect(cabinet).toContain("useState<CabinetSegment>('keys')");
    expect(cabinet).toContain("value: 'keys'");
    expect(cabinet).toContain("value: 'activity'");
    expect(cabinet).toContain("value: 'settings'");
    expect(cabinet).not.toContain("value: 'overview'");
    expect(controls).toContain('min-w-0 flex-1 items-center');
    expect(controls).not.toContain('testID="cabinet-segment-scroll"');
  });
});
