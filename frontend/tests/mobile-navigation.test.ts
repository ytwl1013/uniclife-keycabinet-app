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

  it('keeps scan, borrowed keys, and cabinet/key details in the sibling details stack', () => {
    const layout = source('src/app/(details)/_layout.tsx');
    expect(existsSync(path('src/app/(details)/scan.tsx'))).toBe(true);
    expect(existsSync(path('src/app/(details)/loans/index.tsx'))).toBe(true);
    expect(existsSync(path('src/app/(details)/cabinets/[cabinetId]/index.tsx'))).toBe(true);
    expect(existsSync(path('src/app/(details)/cabinets/[cabinetId]/keys/[keyId].tsx'))).toBe(true);
    expect(layout).toContain('<Stack.Screen name="scan"');
    expect(layout).toContain('<Stack.Screen name="loans/index"');
  });

  it('puts the borrowed summary and Add cabinet action around the unfiltered cabinet list on Home', () => {
    const home = source('src/app/(tabs)/index.tsx');
    expect(home).not.toContain('testID="home-primary-scan"');
    expect(home).toContain('testID="home-borrowed-summary"');
    expect(home).toContain('testID="home-return-borrowed-key"');
    expect(home).toContain('testID="home-add-cabinet"');
    expect(home).toContain("router.push('/(details)/scan' as Href)");
    expect(home).toContain('cabinets.map');
    expect(home).not.toContain('<SearchInput');
    expect(home).not.toContain('summaryCabinets');
    expect(home).not.toContain('viewAll');
  });

  it('provides a confirmed two-step spotlight guide from the Home header', () => {
    const home = source('src/app/(tabs)/index.tsx');
    const guide = source('src/features/home/components/home-spotlight-guide.tsx');
    expect(home).toContain('const GUIDE_STEPS = 2');
    expect(home).toContain('testID="home-guide-button"');
    expect(home).toContain("title={t('home.guidePromptTitle')}");
    expect(home).toContain("t('home.guideLater')");
    expect(home).toContain("t('home.guideStart')");
    expect(home).not.toContain('QuickAction');
    expect(home).not.toContain("t('home.quickActionsTitle')");
    expect(guide).toContain('accessibilityViewIsModal');
    expect(guide).toContain('home.guideBack');
    expect(guide).toContain('home.guideSkip');
    expect(guide).toContain("home.guideDone");
    expect(guide).toContain('Mask id="home-guide-mask"');
    expect(guide).toContain('rx={18}');
  });

  it('routes Home notifications and Account support into the details stack', () => {
    const home = source('src/app/(tabs)/index.tsx');
    const layout = source('src/app/(details)/_layout.tsx');
    const account = source('src/features/account/components/account-screen.tsx');
    const notifications = source('src/features/notifications/components/notifications-screen.tsx');
    const support = source('src/features/support/components/support-chat-screen.tsx');
    expect(home).toContain('testID="home-notifications-button"');
    expect(home).toContain("router.push('/(details)/notifications' as Href)");
    expect(layout).toContain('<Stack.Screen name="notifications"');
    expect(layout).toContain('<Stack.Screen name="account/contact-support"');
    expect(notifications).toContain("type NotificationTab = 'unread' | 'read'");
    expect(account).toContain("title={t('account.personalAccountTitle')}");
    expect(account).toContain("title={t('account.appSettingsTitle')}");
    expect(account).toContain("title={t('account.serviceSupportTitle')}");
    expect(account).toContain('accountRoutes.contactSupport');
    expect(account).not.toContain('<AccountMetric');
    expect(support).toContain('<TextInput');
    expect(support).toContain('sender === \'user\'');
  });

  it('provides menu and calendar filters with cabinet-grouped return cards', () => {
    const borrowed = source('src/features/cabinet-prototype/components/borrowed-keys-screen.tsx');
    const filterMenu = source('src/features/cabinet-prototype/components/borrowed-keys-filter-menu.tsx');
    const dateRangeCalendar = source('src/components/ui/date-range-calendar.tsx');
    const keyDetail = source('src/app/(details)/cabinets/[cabinetId]/keys/[keyId].tsx');
    expect(borrowed).toContain('<SearchInput');
    expect(borrowed).toContain('onPress={() => router.back()}');
    expect(filterMenu).toContain("import { Menu } from 'heroui-native/menu'");
    expect(borrowed).toContain('className="grow-0 shrink-0"');
    expect(borrowed).toContain('<DateRangeCalendar');
    expect(borrowed).toContain('locale={locale}');
    expect(dateRangeCalendar).not.toContain('useTranslation');
    expect(borrowed).toContain('<SectionList');
    expect(borrowed).toContain('stickySectionHeadersEnabled');
    expect(borrowed).toContain('<CabinetSectionHeader');
    expect(borrowed).toContain("time === 'custom'");
    expect(borrowed).toContain('borrowed.returnAction');
    expect(borrowed).not.toContain('borrowed.quickReturn');
    expect(borrowed).not.toContain('borrowed.cabinetAndSlot');
    expect(borrowed).toContain('borrowed.returnConfirmationDescription');
    expect(keyDetail).toContain('borrowed.returnConfirmationDescription');
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
