import type {
  FeedbackConversationStatus,
  FeedbackMessage,
  FeedbackMessageSender,
  FeedbackRecord,
  FeedbackRequest,
  FeedbackThread,
  FeedbackThreadSummary,
} from '@uniclife/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from 'drizzle-orm';

import type { AuthenticatedUser } from '../../common/auth/session.js';
import { toIsoDate } from '../../common/domain/dates.js';
import { createEntityId } from '../../common/security/ids.js';
import type { AppDatabase, DbExecutor } from '../../db/client.js';
import { feedbackMessages, feedbackRecords } from '../../db/schema.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';

type FeedbackRecordRow = typeof feedbackRecords.$inferSelect;
type FeedbackMessageRow = typeof feedbackMessages.$inferSelect;
type FeedbackAudience = 'user' | 'support';

function toFeedbackRecord(row: FeedbackRecordRow): FeedbackRecord {
  return {
    content: row.content,
    deliveredAt: row.deliveredAt ? toIsoDate(row.deliveredAt) : null,
    failureCode: row.failureCode,
    id: row.id,
    imageCount: row.imageCount,
    salutation: row.salutation,
    status: row.status,
    submittedAt: toIsoDate(row.submittedAt),
    title: row.title,
    type: row.type as FeedbackRecord['type'],
    userDisplayName: row.userDisplayName,
    userEmail: row.userEmail,
    userId: row.userId,
  };
}

function toFeedbackMessage(row: FeedbackMessageRow): FeedbackMessage {
  return {
    content: row.content,
    createdAt: toIsoDate(row.createdAt),
    failureCode: row.failureCode,
    feedbackId: row.feedbackId,
    id: row.id,
    imageCount: row.imageCount,
    readAt: row.readAt ? toIsoDate(row.readAt) : null,
    sender: row.sender,
    senderDisplayName: row.senderDisplayName,
    status: row.status,
  };
}

function unreadSender(audience: FeedbackAudience): FeedbackMessageSender {
  return audience === 'user' ? 'support' : 'user';
}

function toThreadSummary(
  row: FeedbackRecordRow,
  messageRows: FeedbackMessageRow[],
  audience: FeedbackAudience,
): FeedbackThreadSummary {
  const latest = messageRows.at(-1);
  if (!latest) throw new Error('FEEDBACK_THREAD_HAS_NO_MESSAGES');
  const supportMessages = messageRows.filter((message) => message.sender === 'support');
  const latestSupportMessage = supportMessages.at(-1);

  return {
    ...toFeedbackRecord(row),
    conversationStatus: row.conversationStatus as FeedbackConversationStatus,
    lastMessageAt: toIsoDate(row.lastMessageAt),
    lastMessagePreview: latest.content.slice(0, 240),
    lastMessageSender: latest.sender,
    latestSupportMessageAt: latestSupportMessage ? toIsoDate(latestSupportMessage.createdAt) : null,
    latestSupportMessagePreview: latestSupportMessage?.content.slice(0, 240) ?? null,
    messageCount: messageRows.length,
    supportMessageCount: supportMessages.length,
    unreadMessageCount: messageRows.filter(
      (message) => message.sender === unreadSender(audience) && !message.readAt,
    ).length,
  };
}

async function messagesForRecords(
  database: AppDatabase,
  recordIds: string[],
): Promise<Map<string, FeedbackMessageRow[]>> {
  const byRecord = new Map<string, FeedbackMessageRow[]>();
  if (!recordIds.length) return byRecord;
  const rows = await database
    .select()
    .from(feedbackMessages)
    .where(inArray(feedbackMessages.feedbackId, recordIds))
    .orderBy(asc(feedbackMessages.createdAt), asc(feedbackMessages.id));
  for (const row of rows) {
    const current = byRecord.get(row.feedbackId) ?? [];
    current.push(row);
    byRecord.set(row.feedbackId, current);
  }
  return byRecord;
}

export async function createFeedbackRecord(
  database: AppDatabase,
  input: {
    feedback: FeedbackRequest;
    initialMessageId: string;
    submissionId: string;
    submittedAt: string;
    user: AuthenticatedUser;
  },
): Promise<FeedbackRecord> {
  return database.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(feedbackRecords)
      .values({
        content: input.feedback.content,
        id: input.submissionId,
        imageCount: input.feedback.images.length,
        lastMessageAt: input.submittedAt,
        salutation: input.feedback.salutation,
        status: 'sending',
        submittedAt: input.submittedAt,
        title: input.feedback.title,
        type: input.feedback.type,
        userDisplayName: input.user.displayName,
        userEmail: input.user.email,
        userId: input.user.id,
      })
      .returning();
    if (!created) throw new Error('FEEDBACK_RECORD_CREATE_FAILED');
    await transaction.insert(feedbackMessages).values({
      content: input.feedback.content,
      createdAt: input.submittedAt,
      feedbackId: input.submissionId,
      id: input.initialMessageId,
      imageCount: input.feedback.images.length,
      sender: 'user',
      senderDisplayName: input.user.displayName,
      senderUserId: input.user.id,
      status: 'sending',
    });
    return toFeedbackRecord(created);
  });
}

export async function markFeedbackDelivered(
  executor: DbExecutor,
  submissionId: string,
  messageId: string,
  deliveredAt: string,
): Promise<void> {
  await executor.update(feedbackRecords)
    .set({ deliveredAt, failureCode: null, status: 'sent', updatedAt: deliveredAt })
    .where(eq(feedbackRecords.id, submissionId));
  await markFeedbackMessageDelivered(executor, messageId);
}

export async function markFeedbackFailed(
  executor: DbExecutor,
  submissionId: string,
  messageId: string,
  failureCode: string,
): Promise<void> {
  const failedAt = new Date().toISOString();
  await executor.update(feedbackRecords)
    .set({ failureCode, status: 'failed', updatedAt: failedAt })
    .where(eq(feedbackRecords.id, submissionId));
  await markFeedbackMessageFailed(executor, messageId, failureCode);
}

export async function markFeedbackMessageDelivered(
  executor: DbExecutor,
  messageId: string,
): Promise<void> {
  await executor.update(feedbackMessages)
    .set({ failureCode: null, status: 'sent' })
    .where(eq(feedbackMessages.id, messageId));
}

export async function markFeedbackMessageFailed(
  executor: DbExecutor,
  messageId: string,
  failureCode: string,
): Promise<void> {
  await executor.update(feedbackMessages)
    .set({ failureCode, status: 'failed' })
    .where(eq(feedbackMessages.id, messageId));
}

export async function listFeedbackThreads(
  database: AppDatabase,
  input: {
    audience: FeedbackAudience;
    limit: number;
    offset?: number;
    query?: string;
    status?: 'all' | FeedbackConversationStatus;
    userId?: string;
  },
): Promise<{ items: FeedbackThreadSummary[]; total: number }> {
  const filters: SQL[] = [];
  if (input.userId) filters.push(eq(feedbackRecords.userId, input.userId));
  if (input.status && input.status !== 'all') {
    filters.push(eq(feedbackRecords.conversationStatus, input.status));
  }
  if (input.query) {
    const pattern = `%${input.query}%`;
    filters.push(or(
      ilike(feedbackRecords.id, pattern),
      ilike(feedbackRecords.title, pattern),
      ilike(feedbackRecords.content, pattern),
      ilike(feedbackRecords.userDisplayName, pattern),
      ilike(feedbackRecords.userEmail, pattern),
    )!);
  }
  const where = filters.length ? and(...filters) : undefined;
  const [totalRow] = await database.select({ value: count() }).from(feedbackRecords).where(where);
  const rows = await database
    .select()
    .from(feedbackRecords)
    .where(where)
    .orderBy(desc(feedbackRecords.lastMessageAt), desc(feedbackRecords.id))
    .limit(input.limit)
    .offset(input.offset ?? 0);
  const messageRows = await messagesForRecords(database, rows.map((row) => row.id));
  return {
    items: rows.map((row) => toThreadSummary(row, messageRows.get(row.id) ?? [], input.audience)),
    total: totalRow?.value ?? 0,
  };
}

export async function listFeedbackRecords(
  database: AppDatabase,
  userId: string,
  limit: number,
): Promise<FeedbackThreadSummary[]> {
  return (await listFeedbackThreads(database, { audience: 'user', limit, userId })).items;
}

export async function getFeedbackThread(
  database: AppDatabase,
  input: { audience: FeedbackAudience; feedbackId: string; userId?: string },
): Promise<FeedbackThread | null> {
  const filters: SQL[] = [eq(feedbackRecords.id, input.feedbackId)];
  if (input.userId) filters.push(eq(feedbackRecords.userId, input.userId));
  const [row] = await database
    .select()
    .from(feedbackRecords)
    .where(and(...filters))
    .limit(1);
  if (!row) return null;
  const messageRows = (await messagesForRecords(database, [row.id])).get(row.id) ?? [];
  return {
    ...toThreadSummary(row, messageRows, input.audience),
    messages: messageRows.map(toFeedbackMessage),
  };
}

export async function createFeedbackReply(
  database: AppDatabase,
  input: {
    content: string;
    feedbackId: string;
    messageId?: string;
    sender: FeedbackMessageSender;
    senderDisplayName: string;
    senderUserId?: string;
    userId?: string;
  },
): Promise<FeedbackMessage> {
  const messageId = input.messageId ?? createEntityId('feedback-message');
  const createdAt = new Date().toISOString();
  const conversationStatus: FeedbackConversationStatus = input.sender === 'support'
    ? 'waiting_for_user'
    : 'waiting_for_support';

  return database.transaction(async (transaction) => {
    const filters: SQL[] = [eq(feedbackRecords.id, input.feedbackId)];
    if (input.userId) filters.push(eq(feedbackRecords.userId, input.userId));
    const [updated] = await transaction
      .update(feedbackRecords)
      .set({ conversationStatus, lastMessageAt: createdAt, updatedAt: createdAt })
      .where(and(...filters))
      .returning({ id: feedbackRecords.id });
    if (!updated) throw new Error('FEEDBACK_NOT_FOUND');

    const [message] = await transaction.insert(feedbackMessages).values({
      content: input.content,
      createdAt,
      feedbackId: input.feedbackId,
      id: messageId,
      imageCount: 0,
      sender: input.sender,
      senderDisplayName: input.senderDisplayName,
      senderUserId: input.sender === 'user' ? input.senderUserId : null,
      status: 'sending',
    }).returning();
    if (!message) throw new Error('FEEDBACK_MESSAGE_CREATE_FAILED');
    return toFeedbackMessage(message);
  });
}

export async function markFeedbackMessagesRead(
  database: AppDatabase,
  input: { audience: FeedbackAudience; feedbackId: string; userId?: string },
): Promise<number> {
  if (input.userId) {
    const [record] = await database.select({ id: feedbackRecords.id })
      .from(feedbackRecords)
      .where(and(eq(feedbackRecords.id, input.feedbackId), eq(feedbackRecords.userId, input.userId)))
      .limit(1);
    if (!record) return -1;
  }
  const rows = await database.update(feedbackMessages)
    .set({ readAt: new Date().toISOString() })
    .where(and(
      eq(feedbackMessages.feedbackId, input.feedbackId),
      eq(feedbackMessages.sender, unreadSender(input.audience)),
      isNull(feedbackMessages.readAt),
    ))
    .returning({ id: feedbackMessages.id });
  return rows.length;
}

export async function countUnreadSupportMessages(
  database: AppDatabase,
  userId: string,
): Promise<number> {
  const [result] = await database
    .select({ value: count() })
    .from(feedbackMessages)
    .innerJoin(feedbackRecords, eq(feedbackMessages.feedbackId, feedbackRecords.id))
    .where(and(
      eq(feedbackRecords.userId, userId),
      eq(feedbackMessages.sender, 'support'),
      isNull(feedbackMessages.readAt),
    ));
  return result?.value ?? 0;
}

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
