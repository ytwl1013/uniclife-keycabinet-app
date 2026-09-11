import { act, fireEvent, render } from '@testing-library/react-native';

import SignUpRoute from '../src/app/(auth)/sign-up';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));
jest.mock('@/i18n', () => ({
  useTranslation: () => ({ locale: 'en-US', t: (key: string) => key }),
}));
jest.mock('@/features/auth/use-auth-actions', () => ({
  useAuthActions: () => ({ actions: { register: jest.fn() } }),
}));

it('opens legal details independently of consent and preserves entered registration fields', async () => {
  const screen = await render(<SignUpRoute />);
  await act(async () => {
    await fireEvent.changeText(screen.getByPlaceholderText('auth.fields.emailPlaceholder'), 'new@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'legal.privacyTitle' }));
  });
  expect(mockPush).toHaveBeenLastCalledWith('/(auth)/privacy');
  expect(screen.getByRole('checkbox', { name: 'auth.signUp.acceptPrivacy' }).props.accessibilityState.checked).toBe(false);
  expect(screen.getByPlaceholderText('auth.fields.emailPlaceholder').props.value).toBe('new@example.com');
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: 'legal.termsTitle' }));
  });
  expect(mockPush).toHaveBeenLastCalledWith('/(auth)/terms');
  expect(screen.getByRole('checkbox', { name: 'auth.signUp.acceptTerms' }).props.accessibilityState.checked).toBe(false);
});
