const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';
const pushTimeoutMs = 10_000;

export type SupportReplyPush = {
  badge: number;
  body: string;
  feedbackId: string;
  title: string;
  tokens: string[];
};

export type CabinetMemberJoinedPush = {
  cabinetId: string;
  eventId: string;
  tokens: string[];
};

export type PushDeliveryResult = {
  invalidTokens: string[];
};

export interface ExpoPushNotifier {
  sendSupportReply(input: SupportReplyPush): Promise<PushDeliveryResult>;
  sendCabinetMemberJoined(input: CabinetMemberJoinedPush): Promise<PushDeliveryResult>;
}

type ExpoPushTicket = {
  status?: unknown;
  details?: { error?: unknown };
};

export function createExpoPushNotifier(): ExpoPushNotifier {
  return {
    async sendCabinetMemberJoined(input) {
      if (!input.tokens.length) return { invalidTokens: [] };
      const invalidTokens: string[] = [];
      for (let offset = 0; offset < input.tokens.length; offset += 100) {
        const tokens = input.tokens.slice(offset, offset + 100);
        const response = await fetch(expoPushEndpoint, {
          body: JSON.stringify(tokens.map((token) => ({
            body: '有新管理员加入钥匙柜，点击查看。',
            channelId: 'cabinet-alerts',
            data: {
              cabinetId: input.cabinetId,
              eventId: input.eventId,
              type: 'cabinet.member_joined',
            },
            priority: 'high',
            title: '新增管理员',
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
