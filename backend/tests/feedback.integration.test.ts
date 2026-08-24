import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

databaseTest('feedback history API', () => {
  it('stores delivery state and isolates history by authenticated user', async () => {
    const app = await buildServer({
      feedbackNotifier: {
        send: async (notification) => {
          if (notification.title === 'Failed feedback') {
            throw new Error('TEST_DELIVERY_FAILURE');
          }
        },
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
    expect(historyAfterFailure.json().data.items[0]).toMatchObject({
      status: 'failed',
      title: 'Failed feedback',
    });

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
