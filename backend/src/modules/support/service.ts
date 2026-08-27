import type { FeedbackRecord, FeedbackRequest } from '@uniclife/shared';
import { desc, eq } from 'drizzle-orm';

import type { AuthenticatedUser } from '../../common/auth/session.js';
import { toIsoDate } from '../../common/domain/dates.js';
import { createEntityId } from '../../common/security/ids.js';
import type { AppDatabase, DbExecutor } from '../../db/client.js';
import { feedbackRecords } from '../../db/schema.js';
import type { FeedbackNotifier } from '../../integrations/notifications/feedback-notifier.js';

type FeedbackRecordRow = typeof feedbackRecords.$inferSelect;

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

export async function createFeedbackRecord(
  executor: DbExecutor,
  input: {
    feedback: FeedbackRequest;
    submissionId: string;
    submittedAt: string;
    user: AuthenticatedUser;
  },
): Promise<FeedbackRecord> {
  const [created] = await executor
    .insert(feedbackRecords)
    .values({
      content: input.feedback.content,
      id: input.submissionId,
      imageCount: input.feedback.images.length,
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
  return toFeedbackRecord(created);
}

export async function markFeedbackDelivered(
  executor: DbExecutor,
  submissionId: string,
  deliveredAt: string,
): Promise<void> {
  await executor
    .update(feedbackRecords)
    .set({ deliveredAt, failureCode: null, status: 'sent', updatedAt: deliveredAt })
    .where(eq(feedbackRecords.id, submissionId));
}

export async function markFeedbackFailed(
  executor: DbExecutor,
  submissionId: string,
  failureCode: string,
): Promise<void> {
  await executor
    .update(feedbackRecords)
    .set({
      failureCode,
      status: 'failed',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(feedbackRecords.id, submissionId));
}

export async function listFeedbackRecords(
  database: AppDatabase,
  userId: string,
  limit: number,
): Promise<FeedbackRecord[]> {
  const rows = await database
    .select()
    .from(feedbackRecords)
    .where(eq(feedbackRecords.userId, userId))
    .orderBy(desc(feedbackRecords.submittedAt))
    .limit(limit);
  return rows.map(toFeedbackRecord);
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
