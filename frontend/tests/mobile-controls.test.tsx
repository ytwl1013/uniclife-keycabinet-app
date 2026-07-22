import { fireEvent, render } from '@testing-library/react-native';

import { ChoiceChip, ConfirmationPanel } from '../src/features/account/components/account-ui';

describe('mobile selection and confirmations', () => {
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
