import { fireEvent, render } from '@testing-library/react-native';

import { ChoiceChip, ConfirmationPanel } from '../src/features/account/components/account-ui';
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
});
