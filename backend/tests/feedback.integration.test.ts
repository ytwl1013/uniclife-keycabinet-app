import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';
import type { FeedbackSupportReplyNotification } from '../src/integrations/notifications/feedback-notifier.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('feedback history API', () => {
  it('stores delivery state and isolates history by authenticated user', async () => {
    const supportReplies: FeedbackSupportReplyNotification[] = [];
    const app = await buildServer({
      feedbackNotifier: {
        send: async (notification) => {
          if (notification.title === 'Failed feedback') {
            throw new Error('TEST_DELIVERY_FAILURE');
          }
        },
        sendSupportReply: async (notification) => {
          supportReplies.push(notification);
        },
        sendUserReply: async () => undefined,
      },
    });

    const register = async (label: string) => {
      const email = `feedback-${label}-${Date.now()}@example.com`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          acceptedPrivacy: true,
          acceptedTerms: true,
          displayName: `Feedback ${label}`,
          email,
          locale: 'en-US',
          password: 'password-123',
        },
      });
      expect(response.statusCode).toBe(201);
      return {
        authorization: { authorization: `Bearer ${response.json().data.session.token}` },
        email,
      };
    };

    const first = await register('first');
    const submitResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/support/feedback',
      headers: first.authorization,
      payload: {
        content: 'Feedback history integration test.',
        images: [],
        salutation: 'First',
        title: 'Integration feedback',
        type: 'application',
      },
    });
    expect(submitResponse.statusCode).toBe(201);

    const firstHistory = await app.inject({
      method: 'GET',
      url: '/api/v1/support/feedback',
      headers: first.authorization,
    });
    expect(firstHistory.statusCode).toBe(200);
    expect(firstHistory.json().data.items[0]).toMatchObject({
      id: submitResponse.json().data.submissionId,
      status: 'sent',
      title: 'Integration feedback',
      userEmail: first.email,
    });
    expect(firstHistory.json().data.items[0]).not.toHaveProperty('images');

    const feedbackId = submitResponse.json().data.submissionId as string;
    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/support/feedback/${feedbackId}`,
      headers: first.authorization,
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().data).toMatchObject({
      id: feedbackId,
      conversationStatus: 'waiting_for_support',
      messageCount: 1,
      supportMessageCount: 0,
    });

    const replyResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/support/feedback/${feedbackId}/messages`,
      headers: first.authorization,
      payload: { content: 'Here is an additional reproduction step.' },
    });
    expect(replyResponse.statusCode).toBe(201);
    expect(replyResponse.json().data.thread).toMatchObject({
      id: feedbackId,
      conversationStatus: 'waiting_for_support',
      messageCount: 2,
    });

    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken) {
      const adminReply = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/feedback/${feedbackId}/messages`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { content: 'Please restart the cabinet and send the status shown in Settings.' },
      });
      expect(adminReply.statusCode).toBe(201);
      expect(adminReply.json().data.thread).toMatchObject({
        conversationStatus: 'waiting_for_user',
        messageCount: 3,
        supportMessageCount: 1,
      });
      expect(supportReplies).toHaveLength(1);
      expect(supportReplies[0]).toMatchObject({ feedbackId, user: { email: first.email } });

      const userHistoryWithReply = await app.inject({
        method: 'GET',
        url: '/api/v1/support/feedback',
        headers: first.authorization,
      });
      expect(userHistoryWithReply.json().data.items[0]).toMatchObject({
        id: feedbackId,
        unreadMessageCount: 1,
        latestSupportMessagePreview: 'Please restart the cabinet and send the status shown in Settings.',
      });

      const readResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/support/feedback/${feedbackId}/read`,
        headers: first.authorization,
      });
      expect(readResponse.statusCode).toBe(200);
      expect(readResponse.json().data.markedReadCount).toBe(1);
    }

    const failedResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/support/feedback',
      headers: first.authorization,
      payload: {
        content: 'This delivery should fail.',
        images: [],
        title: 'Failed feedback',
        type: 'product',
      },
    });
    expect(failedResponse.statusCode).toBe(502);

    const historyAfterFailure = await app.inject({
      method: 'GET',
      url: '/api/v1/support/feedback',
      headers: first.authorization,
    });
    expect(historyAfterFailure.json().data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'failed',
          title: 'Failed feedback',
        }),
      ]),
    );

    const second = await register('second');
    const secondHistory = await app.inject({
      method: 'GET',
      url: '/api/v1/support/feedback',
      headers: second.authorization,
    });
    expect(secondHistory.statusCode).toBe(200);
    expect(secondHistory.json().data.items).toEqual([]);

    await app.close();
  });
});
