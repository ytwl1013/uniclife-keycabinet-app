import type { FeedbackImage, FeedbackType } from '@uniclife/shared';
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';

import { env } from '../../common/config/env.js';

export type FeedbackNotification = {
  submissionId: string;
  submittedAt: string;
  salutation: string;
  type: FeedbackType;
  title: string;
  content: string;
  images: FeedbackImage[];
  user: {
    id: string;
    displayName: string;
    email: string;
  };
};

export interface FeedbackNotifier {
  send(notification: FeedbackNotification): Promise<void>;
}

type SmtpFeedbackNotifierOptions = {
  envelopeFrom: string;
  from: { address: string; name: string };
  to: string;
  transport: Transporter;
};

const feedbackTypeLabels: Record<FeedbackType, string> = {
  application: '应用问题',
  product: '产品问题',
};

function singleLine(value: string, fallback: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim() || fallback;
}

export function buildFeedbackMail(
  notification: FeedbackNotification,
  options: Pick<SmtpFeedbackNotifierOptions, 'envelopeFrom' | 'from' | 'to'>,
): SendMailOptions {
  const typeLabel = feedbackTypeLabels[notification.type];
  const title = singleLine(notification.title, '未填写标题');
  const salutation = notification.salutation || '未填写';
  const lines = [
    '收到新的钥匙柜应用反馈。',
    '',
    `反馈编号：${notification.submissionId}`,
    `提交时间：${notification.submittedAt}`,
    `反馈类型：${typeLabel}`,
    `标题：${title}`,
    `称呼：${salutation}`,
    '',
    '用户信息',
    `用户 ID：${notification.user.id}`,
    `用户名：${notification.user.displayName}`,
    `登录邮箱：${notification.user.email}`,
    '',
    '反馈内容',
    notification.content,
    '',
    `图片数量：${notification.images.length}`,
  ];

  return {
    attachments: notification.images.map((image, index) => ({
      content: Buffer.from(image.data, 'base64'),
      contentType: image.mimeType,
      filename: singleLine(image.fileName, `feedback-${index + 1}.jpg`),
    })),
    envelope: {
      from: options.envelopeFrom,
      to: options.to,
    },
    from: options.from,
    replyTo: notification.user.email,
    subject: `[反馈问题][${typeLabel}][${notification.submissionId}] ${title}`,
    text: lines.join('\n'),
    to: options.to,
  };
}

export class SmtpFeedbackNotifier implements FeedbackNotifier {
  constructor(private readonly options: SmtpFeedbackNotifierOptions) {}

  async send(notification: FeedbackNotification): Promise<void> {
    await this.options.transport.sendMail(buildFeedbackMail(notification, this.options));
  }
}

export function createSmtpFeedbackNotifier(): FeedbackNotifier | undefined {
  if (!env.MAIL_SERVER || !env.MAIL_USERNAME || !env.MAIL_PASSWORD) {
    return undefined;
  }

  const timeout = env.MAIL_TIMEOUT * 1000;
  const transport = nodemailer.createTransport({
    auth: {
      pass: env.MAIL_PASSWORD,
      user: env.MAIL_USERNAME,
    },
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    host: env.MAIL_SERVER,
    port: env.MAIL_PORT,
    requireTLS: env.MAIL_USE_TLS,
    secure: env.MAIL_USE_SSL,
    socketTimeout: timeout,
  });
  const recipient = env.MAIL_FEEDBACK_TO ?? env.MAIL_USERNAME;

  return new SmtpFeedbackNotifier({
    envelopeFrom: env.MAIL_USERNAME,
    from: {
      address: env.MAIL_USERNAME,
      name: env.MAIL_SENDER_NAME,
    },
    to: recipient,
    transport,
  });
}
