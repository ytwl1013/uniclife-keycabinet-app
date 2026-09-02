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

  it('hides the Home management entry while retaining deletion controls and cabinet settings', () => {
    const home = source('src/app/(tabs)/index.tsx');
    const layout = source('src/app/(details)/_layout.tsx');
    const management = source('src/app/(details)/cabinets/manage.tsx');
    const cabinetSettings = source(
      'src/features/cabinet-prototype/components/cabinet-sections.tsx',
    );

    expect(home).not.toContain('testID="home-cabinet-settings-button"');
    expect(home).not.toContain("router.push('/(details)/cabinets/manage' as Href)");
    expect(layout).toContain('<Stack.Screen name="cabinets/manage"');
    expect(management).toContain("from 'heroui-native/dialog'");
    expect(management).toContain('cabinet-remove-confirmation-modal');
    expect(management).toContain('cabinet-remove-confirm-button');
    expect(management).toContain('actions.disconnectCabinet');
    expect(management).toContain('actions.deleteCabinet');
    expect(management).toContain('selectors.isCabinetSuperAdmin');
    expect(cabinetSettings).toContain("cabinet.role === 'superAdmin'");
    expect(cabinetSettings).toContain('app.transferSuperAdmin');
    expect(cabinetSettings).toContain("member.role !== 'superAdmin'");
    expect(cabinetSettings).toContain('app.disconnectCabinet');
    expect(cabinetSettings).toContain('app.deleteCabinet');
    expect(cabinetSettings).toContain('cabinet.deleteCabinetSectionTitle');
    expect(cabinetSettings).toContain('cabinet.clearKeysSuperAdminRequired');
    expect(cabinetSettings).toContain('disabled={!isSuperAdmin');
  });

  it('opens available slots on check-out, keeps empty-slot registration, and moves key history below the check-out form', () => {
    const slotGrid = source('src/features/cabinet-prototype/components/key-slot-grid.tsx');
    const keyDetail = source('src/app/(details)/cabinets/[cabinetId]/keys/[keyId].tsx');
    const checkout = source('src/app/(details)/cabinets/[cabinetId]/loans/[keyId].tsx');

    expect(slotGrid).toContain("slot.status === 'available'");
    expect(slotGrid).toContain("pathname: '/cabinets/[cabinetId]/loans/[keyId]'");
    expect(slotGrid).toContain("pathname: '/cabinets/[cabinetId]/keys/new'");
    expect(checkout).toContain("label={t(trKey('key.manageAction'))}");
    expect(checkout).toContain("pathname: '/cabinets/[cabinetId]/keys/[keyId]'");
    expect(checkout).toContain("<SectionTitle title={t(trKey('key.historyTitle'))}");
    expect(checkout).toContain('<PrototypeEventList');
    expect(keyDetail).not.toContain("loan.checkOutAction");
    expect(keyDetail).not.toContain('<PrototypeEventList');
    expect(keyDetail).toContain("loan.returnAction");
  });

  it('puts the borrowed summary and Add cabinet action around the unfiltered cabinet list on Home', () => {
    const home = source('src/app/(tabs)/index.tsx');
    expect(home).toContain('testID="home-account-avatar-button"');
    expect(home).toContain('avatarUri={currentUser.avatarUri}');
    expect(home).toContain('size="compact"');
    expect(home).not.toContain('testID="home-primary-scan"');
    expect(home).toContain('testID="home-borrowed-summary"');
    expect(home).toContain('className="gap-4 rounded-card border border-line bg-surface p-5 shadow-card active:opacity-75"');
    expect(home).toContain("onPress={() => router.push('/(details)/loans' as Href)}");
    expect(home).toContain('testID="home-return-borrowed-key"');
    expect(home).toContain('testID="home-add-cabinet"');
    expect(home).toContain("router.push('/(details)/scan' as Href)");
    expect(home).toContain('cabinets.map');
    expect(home).not.toContain('<SearchInput');
    expect(home).not.toContain('summaryCabinets');
    expect(home).not.toContain('viewAll');
  });

  it('refreshes Account, Home, Activity, Notifications, and every cabinet detail segment by pulling from the top', () => {
    const account = source('src/features/account/components/account-screen.tsx');
    const accountUi = source('src/features/account/components/account-ui.tsx');
    const home = source('src/app/(tabs)/index.tsx');
    const activity = source('src/app/(tabs)/activity.tsx');
    const notifications = source('src/features/notifications/components/notifications-screen.tsx');
    const cabinet = source('src/app/(details)/cabinets/[cabinetId]/index.tsx');
    const cabinetSections = source('src/features/cabinet-prototype/components/cabinet-sections.tsx');
    const keyGrid = source('src/features/cabinet-prototype/components/key-slot-grid.tsx');
    const refreshControl = source('src/components/ui/app-refresh-control.tsx');
    const refreshHook = source('src/features/app-refresh/use-app-refresh.ts');

    expect(refreshControl).toContain('<RefreshControl');
    expect(refreshHook).toContain('actions.refresh()');
    expect(account).toContain('onRefresh={onRefresh}');
    expect(accountUi).toContain('<AppRefreshControl');
    expect(home).toContain('<AppRefreshControl');
    expect(activity).toContain('<AppRefreshControl');
    expect(notifications).toContain('<AppRefreshControl');
    expect(cabinet).toContain('<CabinetKeys');
    expect(cabinet).toContain('<CabinetActivity');
    expect(cabinet).toContain('<CabinetSettings');
    expect(cabinetSections.match(/<AppRefreshControl/g)).toHaveLength(2);
    expect(keyGrid).toContain('<AppRefreshControl');
  });

  it('keeps authenticated workspace data fresh through realtime events and lifecycle recovery', () => {
    const rootLayout = source('src/app/_layout.tsx');
    const autoRefresh = source('src/features/app-refresh/app-auto-refresh.tsx');
    const refreshHook = source('src/features/app-refresh/use-app-refresh.ts');
    const provider = source('src/app-state/provider.tsx');

    expect(rootLayout).toContain('<AppAutoRefresh />');
    expect(autoRefresh).toContain("AppState.addEventListener('change'");
    expect(autoRefresh).toContain('createRealtimeWebSocket');
    expect(autoRefresh).toContain("event.type !== 'workspace.changed'");
    expect(autoRefresh).toContain('REALTIME_FALLBACK_REFRESH_INTERVAL_MS');
    expect(autoRefresh).not.toContain('ACTIVE_REFRESH_INTERVAL_MS');
    expect(autoRefresh).toContain('actions.refreshIfStale');
    expect(refreshHook).toContain('useFocusEffect');
    expect(refreshHook).toContain('actions.refreshIfStale');
    expect(provider).toContain('pendingRefreshCountRef');
    expect(provider).toContain('offlineOverrideRef');
  });

  it('provides a modal-confirmed three-step spotlight guide that enters a cabinet', () => {
    const home = source('src/app/(tabs)/index.tsx');
    const guide = source('src/features/home/components/home-spotlight-guide.tsx');
    const cabinet = source('src/app/(details)/cabinets/[cabinetId]/index.tsx');
    const slotGrid = source('src/features/cabinet-prototype/components/key-slot-grid.tsx');
    expect(home).toContain('const GUIDE_STEPS = 3');
    expect(home).toContain('testID="home-guide-button"');
    expect(home).toContain("import { Dialog } from 'heroui-native/dialog'");
    expect(home).toContain('testID="home-guide-prompt-modal"');
    expect(home).toContain("t('home.guideLater')");
    expect(home).toContain("t('home.guideStart')");
    expect(home).not.toContain('<BottomSheet');
    expect(home).toContain("params: { cabinetId: cabinet.id, guide: 'register-key' }");
    expect(home).toContain('prepareGuideStep(2)');
    expect(home).toContain("t('home.guideNoCabinetTitle')");
    expect(home).toContain("placement={guideStep === 1 ? 'top' : 'auto'}");
    expect(home).not.toContain('setTimeout');
    expect(cabinet).toContain("params.guide === 'register-key'");
    expect(cabinet).toContain('step={2}');
    expect(cabinet).toContain('rectOffsetY={insets.top}');
    expect(slotGrid).toContain('testID={spotlighted ? \'cabinet-guide-register-slot\' : undefined}');
    expect(slotGrid).not.toContain('setTimeout');
    expect(home).not.toContain('QuickAction');
    expect(home).not.toContain("t('home.quickActionsTitle')");
    expect(guide).toContain('accessibilityViewIsModal');
    expect(guide).toContain('home.guideBack');
    expect(guide).toContain('home.guideSkip');
    expect(guide).toContain("home.guideDone");
    expect(guide).toContain('Mask id="home-guide-mask"');
    expect(guide).toContain('rx={18}');
    expect(guide).toContain('useSafeAreaInsets');
    expect(guide).toContain('top: insets.top + 16');
    expect(guide).toContain('if (!visible || !rect) return null');
    expect(guide).toContain('rect.y + rectOffsetY - padding');
  });

  it('routes Home notifications and Account support into the details stack', () => {
    const home = source('src/app/(tabs)/index.tsx');
    const layout = source('src/app/(details)/_layout.tsx');
    const account = source('src/features/account/components/account-screen.tsx');
    const uiProvider = source('src/components/ui/app-ui-provider.native.tsx');
    const notifications = source('src/features/notifications/components/notifications-screen.tsx');
    const support = source('src/features/support/components/feedback-form-screen.tsx');
    const feedbackHistory = source('src/features/support/components/feedback-history-screen.tsx');
    expect(home).toContain('testID="home-notifications-button"');
    expect(home).toContain("router.push('/(details)/notifications' as Href)");
    expect(layout).toContain('<Stack.Screen name="notifications"');
    expect(layout).toContain('<Stack.Screen name="account/contact-support"');
    expect(layout).toContain('<Stack.Screen name="account/feedback-history"');
    expect(layout).toContain('<Stack.Screen name="account/profile"');
    expect(layout).toContain('<Stack.Screen name="account/security"');
    expect(layout).toContain('<Stack.Screen name="account/change-email"');
    expect(notifications).toContain("type NotificationTab = 'unread' | 'read'");
    expect(account).toContain("title={t('account.personalAccountTitle')}");
    expect(account).toContain('accountRoutes.security');
    expect(account).toContain('accountRoutes.profile');
    expect(account).toContain("title={t('account.appSettingsTitle')}");
    expect(account).toContain("title={t('account.serviceSupportTitle')}");
    expect(account).toContain('accountRoutes.contactSupport');
    expect(account).toContain('testID="support-email-modal"');
    expect(account).toContain('Clipboard.setStringAsync(supportEmail)');
    expect(account).toContain("import { useToast } from 'heroui-native/toast'");
    expect(account).toContain("label: t('account.supportEmailCopied')");
    expect(account).toContain("variant: 'success'");
    expect(account).not.toContain("setFeedback({ message: t('account.supportEmailCopied')");
    expect(uiProvider).toContain('toast: true');
    expect(account.indexOf("title={t('account.serviceSupportTitle')}")).toBeLessThan(account.indexOf("{t('account.signOut')}"));
    expect(account).not.toContain('<AccountMetric');
    expect(support).toContain("typeApplication");
    expect(support).toContain('feedbackMaxImages');
    expect(support).toContain('manipulateAsync');
    expect(support).toContain('actions.submitFeedback');
    expect(support).toContain("import { useToast } from 'heroui-native/toast'");
    expect(support).toContain("placement: 'top'");
    expect(support).toContain("variant: 'success'");
    expect(support).toContain("variant: 'danger'");
    expect(support).toContain('testID="feedback-history-button"');
    expect(support).toContain("router.push('/(details)/account/feedback-history' as Href)");
    expect(feedbackHistory).toContain('actions.listFeedbackHistory()');
    expect(feedbackHistory).toContain('historyStatusSent');
  });

  it('provides menu and calendar filters with cabinet-grouped return cards', () => {
    const borrowed = source('src/features/cabinet-prototype/components/borrowed-keys-screen.tsx');
    const filterMenu = source('src/features/cabinet-prototype/components/borrowed-keys-filter-menu.tsx');
    const checkoutKeyboardAccessory = source('src/features/cabinet-prototype/components/checkout-keyboard-accessory.tsx');
    const dateRangeCalendar = source('src/components/ui/date-range-calendar.tsx');
    const dateRangeModal = source('src/components/ui/date-range-picker-modal.tsx');
    const dateTimeField = source('src/components/ui/date-time-field.tsx');
    const prototypeUi = source('src/features/cabinet-prototype/components/prototype-ui.tsx');
    const keyDetail = source('src/app/(details)/cabinets/[cabinetId]/keys/[keyId].tsx');
    const checkout = source('src/app/(details)/cabinets/[cabinetId]/loans/[keyId].tsx');
    expect(borrowed).toContain('<SearchInput');
    expect(borrowed).toContain('onPress={() => router.back()}');
    expect(filterMenu).toContain("import { Menu } from 'heroui-native/menu'");
    expect(filterMenu).toContain('BorrowedKeysDateFilterButton');
    expect(borrowed).toContain('className="grow-0 shrink-0"');
    expect(borrowed).toContain('<DateRangePickerModal');
    expect(borrowed).toContain('locale={locale}');
    expect(dateRangeModal).toContain("import { Dialog } from 'heroui-native/dialog'");
    expect(dateRangeModal).toContain('<DateRangeCalendar');
    expect(dateRangeModal).toContain('testID="borrowed-date-range-modal"');
    expect(dateTimeField).toContain('display="spinner"');
    expect(dateTimeField).toContain('mode="date"');
    expect(dateTimeField).toContain('mode="time"');
    expect(dateTimeField).not.toContain('mode="datetime"');
    expect(dateTimeField).not.toContain('timeZoneName');
    expect(dateTimeField).toContain('testID="date-time-picker-modal"');
    expect(dateTimeField).toContain('testID="date-time-picker-date"');
    expect(dateTimeField).toContain('testID="date-time-picker-time"');
    expect(dateRangeCalendar).not.toContain('useTranslation');
    expect(borrowed).toContain('<SectionList');
    expect(borrowed).toContain('stickySectionHeadersEnabled');
    expect(borrowed).toContain('<CabinetSectionHeader');
    expect(borrowed).toContain("time === 'custom'");
    expect(borrowed).toContain('borrowed.returnAction');
    expect(borrowed).toContain("t(trKey('borrowed.borrowerLabel'))");
    expect(borrowed).toContain('<AppText variant="label" tone="foreground">{loan.borrowerName}</AppText>');
    expect(borrowed).toContain("{' / '}");
    expect(borrowed).not.toContain('borrowed.quickReturn');
    expect(borrowed).not.toContain('borrowed.cabinetAndSlot');
    expect(borrowed).toContain('borrowed.returnConfirmationDescription');
    expect(keyDetail).toContain('borrowed.returnConfirmationDescription');
    expect(keyDetail).toContain("value={key.note.trim() || t(trKey('loan.notProvided'))}");
    expect(keyDetail).toContain('{key.activeLoan ? (');
    expect(keyDetail.indexOf('{key.activeLoan ? (')).toBeLessThan(keyDetail.indexOf("t(trKey('key.saveChanges'))"));
    expect(checkout).toContain('const quickReturnOptions = [1, 3, 7] as const');
    expect(checkout).toContain('useState<string>()');
    expect(checkout).toContain("loan.keyNoteReminder");
    expect(checkout).toContain("loan.keyNoteEmptyReminder");
    expect(checkout).toContain('inputAccessoryViewID={borrowerNameKeyboardAccessoryId}');
    expect(checkout).toContain('inputAccessoryViewID={borrowerContactKeyboardAccessoryId}');
    expect(checkout).toContain('nativeIDs={[borrowerNameKeyboardAccessoryId, borrowerContactKeyboardAccessoryId]}');
    expect(checkoutKeyboardAccessory).toContain('nativeIDs.map');
    expect(checkoutKeyboardAccessory).toContain('<InputAccessoryView backgroundColor="transparent"');
    expect(checkoutKeyboardAccessory).toContain('h-8 justify-center rounded-pill bg-brand px-3 shadow-card');
    expect(checkoutKeyboardAccessory).toContain('hitSlop={6}');
    expect(checkoutKeyboardAccessory).not.toContain('<ActionButton');
    expect(checkout).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(checkout).toContain('Keyboard.dismiss()');
    expect(checkout).toContain('compact={keyboardVisible}');
    expect(prototypeUi).toContain('inputAccessoryViewID={inputAccessoryViewID}');
    expect(checkout).not.toContain('KeyboardAvoidingView');
    expect(checkout).not.toContain('timeZone={cabinet.timezone}');
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

  it('uses the native camera path for product initialization and invitation joining', () => {
    const scan = source('src/features/scan/components/scan-flow.tsx');
    expect(scan).toContain('<CameraView');
    expect(scan).toContain('onBarcodeScanned');
    expect(scan).toContain("t('scan.cabinetName')");
    expect(scan).toContain('await actions.initializeCabinet');
    expect(scan).toContain('await actions.joinCabinet');
  });

  it('places the one-time cabinet join QR in cabinet settings', () => {
    const sections = source('src/features/cabinet-prototype/components/cabinet-sections.tsx');
    expect(sections).toContain('<QRCode');
    expect(sections).toContain('app.createJoinInvitation');
    expect(sections).toContain('app.revokeJoinInvitation');
    expect(sections).toContain("t('cabinetInvite.expiresIn'");
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
