import type { FeedbackRequest } from '@uniclife/shared';

import type { AuthenticatedUser } from '../../common/auth/session.js';
import { createEntityId } from '../../common/security/ids.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';

export async function submitFeedback(input: {
  feedback: FeedbackRequest;
  notifier: FeedbackNotifier;
  submissionId?: string;
  submittedAt?: string;
  user: AuthenticatedUser;
}): Promise<{ submissionId: string; submittedAt: string }> {
  const submissionId = input.submissionId ?? createEntityId('feedback');
  const submittedAt = input.submittedAt ?? new Date().toISOString();

  await input.notifier.send({
    ...input.feedback,
    submissionId,
    submittedAt,
    user: {
      displayName: input.user.displayName,
      email: input.user.email,
      id: input.user.id,
    },
  });

  return { submissionId, submittedAt };
}
