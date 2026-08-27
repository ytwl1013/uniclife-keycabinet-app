import { shouldAutomaticallyPromptHomeGuide } from '@/features/home/home-guide';

describe('first-login Home guide', () => {
  const newAccount = {
    id: 'user-new',
    homeGuidePromptedAt: null,
  };

  it('prompts a new account once in the current Home mount', () => {
    expect(shouldAutomaticallyPromptHomeGuide(newAccount)).toBe(true);
    expect(shouldAutomaticallyPromptHomeGuide(newAccount, newAccount.id)).toBe(false);
  });

  it('does not prompt an account that already handled the choice', () => {
    expect(shouldAutomaticallyPromptHomeGuide({
      id: 'user-returning',
      homeGuidePromptedAt: '2026-08-24T08:00:00.000Z',
    })).toBe(false);
  });
});
