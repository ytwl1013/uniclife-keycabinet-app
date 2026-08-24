import type { FeedbackRequest } from '@uniclife/shared';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../src/common/auth/session.js';
import {
  buildFeedbackMail,
  type FeedbackNotification,
  type FeedbackNotifier,
} from '../src/integrations/notifications/feedback-notifier.js';
import { submitFeedback } from '../src/modules/support/service.js';

const user: AuthenticatedUser = {
  avatarUri: null,
  createdAt: '2026-08-20T08:00:00.000Z',
  displayName: 'Alex Example',
  email: 'alex@example.com',
  homeGuidePromptedAt: null,
  id: 'user-alex',
  lastLoginAt: '2026-08-24T08:00:00.000Z',
  locale: 'en-US',
  loginCount: 2,
  passwordHash: 'not-exposed',
  sessionId: 'session-alex',
  status: 'active',
};

const feedback: FeedbackRequest = {
  content: 'Return failed after confirmation.',
  images: [
    {
      data: 'aGVsbG8=',
      fileName: 'screen.jpg',
      mimeType: 'image/jpeg',
    },
  ],
  salutation: 'Alex',
  title: 'Return failure',
  type: 'application',
};

describe('feedback delivery', () => {
  it('adds server-owned user identity and a searchable submission id', async () => {
    const send = vi.fn<FeedbackNotifier['send']>().mockResolvedValue(undefined);

    const result = await submitFeedback({
      feedback,
      notifier: { send },
      submittedAt: '2026-08-24T09:30:00.000Z',
      user,
    });

    expect(result.submissionId).toMatch(/^feedback-/);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      content: feedback.content,
      submissionId: result.submissionId,
      submittedAt: result.submittedAt,
      user: {
        displayName: user.displayName,
        email: user.email,
        id: user.id,
      },
    }));
  });

  it('builds a self-contained replyable email with attachments', () => {
    const notification: FeedbackNotification = {
      ...feedback,
      submissionId: 'feedback-test',
      submittedAt: '2026-08-24T09:30:00.000Z',
      user: {
        displayName: user.displayName,
        email: user.email,
        id: user.id,
      },
    };
    const mail = buildFeedbackMail(notification, {
      envelopeFrom: 'feedback@example.com',
      from: { address: 'feedback@example.com', name: 'keycabinet_app' },
      to: 'feedback@example.com',
    });

    expect(mail.to).toBe('feedback@example.com');
    expect(mail.from).toEqual({ address: 'feedback@example.com', name: 'keycabinet_app' });
    expect(mail.envelope).toEqual({
      from: 'feedback@example.com',
      to: 'feedback@example.com',
    });
    expect(mail.replyTo).toBe(user.email);
    expect(mail.subject).toContain('[feedback-test]');
    expect(mail.text).toContain(`用户 ID：${user.id}`);
    expect(mail.text).toContain(`登录邮箱：${user.email}`);
    expect(mail.attachments).toHaveLength(1);
  });
});
