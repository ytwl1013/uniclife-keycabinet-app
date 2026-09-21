import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExpoPushNotifier } from '../src/integrations/notifications/expo-push-notifier.js';

describe('Expo push notifier', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends banner, badge, and support deep-link data without message sound', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'ticket-ok', status: 'ok' },
        { details: { error: 'DeviceNotRegistered' }, message: 'gone', status: 'error' },
      ],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createExpoPushNotifier().sendSupportReply({
      badge: 2,
      body: '客服回复了你的反馈，点击查看。',
      feedbackId: 'feedback-test',
      title: '客服回复：测试',
      tokens: ['ExpoPushToken[active]', 'ExpoPushToken[expired]'],
    });

    expect(result.invalidTokens).toEqual(['ExpoPushToken[expired]']);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const messages = JSON.parse(String(request.body));
    expect(messages[0]).toMatchObject({
      badge: 2,
      channelId: 'support',
      data: { feedbackId: 'feedback-test', type: 'support.message' },
      priority: 'high',
      to: 'ExpoPushToken[active]',
    });
    expect(messages[0]).not.toHaveProperty('sound');
  });

  it('sends a cabinet deep link only to the selected Super Admin tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'ticket-ok', status: 'ok' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await createExpoPushNotifier().sendCabinetMemberJoined({
      cabinetId: 'cabinet-test',
      eventId: 'event-member-joined',
      tokens: ['ExpoPushToken[super-admin]'],
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const messages = JSON.parse(String(request.body));
    expect(messages).toEqual([
      expect.objectContaining({
        channelId: 'cabinet-alerts',
        data: {
          cabinetId: 'cabinet-test',
          eventId: 'event-member-joined',
          type: 'cabinet.member_joined',
        },
        priority: 'high',
        to: 'ExpoPushToken[super-admin]',
      }),
    ]);
  });
});
