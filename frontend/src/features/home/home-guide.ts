import type { CurrentUserAccount } from '@uniclife/shared';

type HomeGuideAccount = Pick<CurrentUserAccount, 'homeGuidePromptedAt' | 'id'>;

export function shouldAutomaticallyPromptHomeGuide(
  currentUser: HomeGuideAccount | null,
  handledUserId?: string,
): boolean {
  return Boolean(
    currentUser &&
    currentUser.homeGuidePromptedAt === null &&
    handledUserId !== currentUser.id,
  );
}
