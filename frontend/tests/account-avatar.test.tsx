import { act, render } from '@testing-library/react-native';

import { UserAvatar } from '../src/features/account/components/account-ui';

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return React.createElement(View, props);
  },
}));

describe('account avatar', () => {
  it('gives a selected image an explicit size and falls back to initials on load failure', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <UserAvatar
        accessibilityLabel="Alex Morgan profile photo"
        avatarUri="file:///profile-photo.jpg"
        displayName="Alex Morgan"
      />,
    );

    const image = getByTestId('user-avatar-image');
    expect(image.props.style).toEqual({ height: 112, width: 112 });

    await act(() => image.props.onError());

    expect(queryByTestId('user-avatar-image')).toBeNull();
    expect(getByText('AM')).toBeTruthy();
  });

  it('uses a 48 pixel image for the compact Home avatar', async () => {
    const { getByTestId } = await render(
      <UserAvatar
        accessibilityLabel="Alex Morgan profile photo"
        avatarUri="file:///profile-photo.jpg"
        displayName="Alex Morgan"
        size="compact"
      />,
    );

    expect(getByTestId('user-avatar-image').props.style).toEqual({ height: 48, width: 48 });
  });
});
