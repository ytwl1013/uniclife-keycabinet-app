const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';
const pushTimeoutMs = 10_000;

export type SupportReplyPush = {
  badge: number;
  body: string;
  feedbackId: string;
  title: string;
  tokens: string[];
};

export type PushDeliveryResult = {
  invalidTokens: string[];
};

export interface ExpoPushNotifier {
  sendSupportReply(input: SupportReplyPush): Promise<PushDeliveryResult>;
}

type ExpoPushTicket = {
  status?: unknown;
  details?: { error?: unknown };
};

export function createExpoPushNotifier(): ExpoPushNotifier {
  return {
    async sendSupportReply(input) {
      if (!input.tokens.length) return { invalidTokens: [] };
      const invalidTokens: string[] = [];
      for (let offset = 0; offset < input.tokens.length; offset += 100) {
        const tokens = input.tokens.slice(offset, offset + 100);
        const response = await fetch(expoPushEndpoint, {
          body: JSON.stringify(tokens.map((token) => ({
            badge: input.badge,
            body: input.body,
            channelId: 'support',
            data: { feedbackId: input.feedbackId, type: 'support.message' },
            priority: 'high',
            title: input.title,
            to: token,
          }))),
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          method: 'POST',
          signal: AbortSignal.timeout(pushTimeoutMs),
        });
        if (!response.ok) throw new Error(`EXPO_PUSH_HTTP_${response.status}`);
        const payload = await response.json() as { data?: ExpoPushTicket[] };
        const tickets = Array.isArray(payload.data) ? payload.data : [];
        tokens.forEach((token, index) => {
          const ticket = tickets[index];
          if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(token);
          }
        });
      }
      return { invalidTokens };
    },
  };
}
