import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { bottomTabIconTestIds, BottomTabIcon } from '../src/components/ui/bottom-tab-icon';
import {
  ChoiceChip,
  ConfirmationPanel,
  SettingsAction,
} from '../src/features/account/components/account-ui';
import { allowSampleQrPreview } from '../src/mocks/developer-tools';

describe('mobile selection and confirmations', () => {
  it('blocks sample QR deep links when developer tools are disabled', () => {
    expect(allowSampleQrPreview(true, false)).toBe(false);
    expect(allowSampleQrPreview(true, true)).toBe(true);
    expect(allowSampleQrPreview(false, true)).toBe(false);
  });

  it('exposes filter or language choices as an accessible radio control', async () => {
    const onSelect = jest.fn();
    const { getByRole } = await render(
      <ChoiceChip label="Deutsch" onPress={onSelect} selected={false} />,
    );

    fireEvent.press(getByRole('radio', { name: 'Deutsch' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit destructive confirmation', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByRole } = await render(
      <ConfirmationPanel
        cancelLabel="Cancel"
        confirmLabel="Clear keys"
        description="This action keeps an audit record."
        destructive
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Clear all keys?"
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Clear keys' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('makes the complete account settings row pressable', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <SettingsAction icon="shield" label="Privacy policy" onPress={onPress} />,
    );

    fireEvent.press(getByRole('button', { name: 'Privacy policy' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses one scroll container inside a fixed-height language sheet', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/features/account/components/account-screen.tsx'),
      'utf8',
    );

    expect(source).toContain('size="large"');
    expect(source).not.toContain('<ScrollView');
    expect(source).toContain('accessibilityRole="radiogroup"');
  });

  it('uses icon-only tabs with translated accessibility names', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/app/(tabs)/_layout.tsx'),
      'utf8',
    );
    const globalStyles = readFileSync(resolve(__dirname, '../global.css'), 'utf8');

    expect(source).toContain('tabBarShowLabel: false');
    expect(source).toContain('tabBarAccessibilityLabel: t(route.titleKey)');
    expect(source).toContain("icon: 'home'");
    expect(source).toContain("icon: 'history'");
    expect(source).toContain("icon: 'accountCircle'");
    expect(source).not.toContain("screen: 'cabinets'");
    expect(source).not.toContain("screen: 'scan'");
    expect(source).not.toContain('tabBarLabelStyle');
    expect(globalStyles).toContain("[role='tab']:focus-visible");
    expect(globalStyles).toContain('outline: 2px solid var(--brand)');
  });

  it('gives selected tabs a distinct icon surface without rendering a label', async () => {
    const { getByTestId, queryByText } = await render(
      <BottomTabIcon focused name="cabinetGrid" />,
    );
    const style = StyleSheet.flatten(
      getByTestId(bottomTabIconTestIds.regular, { includeHiddenElements: true }).props.style,
    );

    expect(style.backgroundColor).toBe('#EEF4FF');
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(queryByText(/cabinet/i)).toBeNull();
  });

  it('keeps primary icon rendering available without using it as a tab', async () => {
    const { getByTestId } = await render(
      <BottomTabIcon focused name="scan" primary />,
    );
    const haloStyle = StyleSheet.flatten(
      getByTestId(bottomTabIconTestIds.primaryHalo, { includeHiddenElements: true }).props.style,
    );
    const coreStyle = StyleSheet.flatten(
      getByTestId(bottomTabIconTestIds.primaryCore, { includeHiddenElements: true }).props.style,
    );

    expect(haloStyle.backgroundColor).toBe('#EEF4FF');
    expect(coreStyle.width).toBe(50);
    expect(coreStyle.height).toBe(50);
  });
});
