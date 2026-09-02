import { fireEvent, render } from '@testing-library/react-native';

import { AuthPrimaryButton, ConsentRow } from '../src/features/auth/components/auth-ui';

describe('authentication UI controls', () => {
  it('submits through the accessible primary action', async () => {
    const onPress = jest.fn();

    const { getByRole } = await render(
      <AuthPrimaryButton
        busyLabel="Signing in"
        label="Sign in"
        onPress={onPress}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Sign in' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes consent as an unchecked checkbox and toggles it on press', async () => {
    const onPress = jest.fn();

    const { getByRole } = await render(
      <ConsentRow
        checked={false}
        label="Receive optional product updates"
        onPress={onPress}
      />,
    );

    const checkbox = getByRole('checkbox', {
      name: 'Receive optional product updates',
    });
    expect(checkbox.props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(checkbox);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
