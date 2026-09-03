import { z } from 'zod';

import { requestIdSchema, writeOptionsSchema } from './api.js';
import {
  cabinetEventTypeSchema,
  entityIdSchema,
  isoDateSchema,
  loanStatusSchema,
  supportedLocaleSchema,
} from './domain.js';

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const passwordSchema = z.string().min(8).max(128);
const displayNameSchema = z.string().trim().min(1).max(128);
const cabinetNameSchema = z.string().trim().min(1).max(128);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  locale: supportedLocaleSchema,
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
});

export const signInRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetVerifySchema = z.object({
  challengeId: entityIdSchema,
  code: z.string().regex(/^\d{6}$/),
});
export const passwordResetCompleteSchema = z.object({
  resetToken: z.string().min(32).max(256),
  newPassword: passwordSchema,
});

export const updateProfileRequestSchema = writeOptionsSchema.extend({
  displayName: displayNameSchema,
  avatarUri: z.string().trim().min(1).max(2048).nullable().optional(),
});
export const updateEmailRequestSchema = writeOptionsSchema.extend({ email: emailSchema });
export const changePasswordRequestSchema = writeOptionsSchema.extend({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});
export const markHomeGuidePromptedRequestSchema = writeOptionsSchema.extend({
  prompted: z.literal(true),
});

export const pushPlatformSchema = z.enum(['ios', 'android']);
export const expoPushTokenSchema = z.string().trim().max(255).regex(
  /^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/,
);
export const pushTokenRequestSchema = z.object({
  platform: pushPlatformSchema,
  token: expoPushTokenSchema,
});

export const feedbackTypeSchema = z.enum(['product', 'application']);
export const feedbackMaxImages = 5;
export const feedbackImageMaxBase64Length = 2_000_000;
export const feedbackImageSchema = z.object({
  data: z
    .string()
    .min(4)
    .max(feedbackImageMaxBase64Length)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
    .refine((value) => value.length % 4 === 0, 'Invalid Base64 length'),
  fileName: z.string().trim().min(1).max(128),
  mimeType: z.literal('image/jpeg'),
});
export const feedbackRequestSchema = z.object({
  salutation: z.string().trim().max(128).default(''),
  type: feedbackTypeSchema.default('application'),
  title: z.string().trim().max(200).default(''),
  content: z.string().trim().min(1).max(5000),
  images: z.array(feedbackImageSchema).max(feedbackMaxImages).default([]),
});
export const feedbackDeliveryStatusSchema = z.enum(['sending', 'sent', 'failed']);
export const feedbackRecordSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  userDisplayName: displayNameSchema,
  userEmail: emailSchema,
  salutation: z.string().max(128),
  type: feedbackTypeSchema,
  title: z.string().max(200),
  content: z.string().min(1).max(5000),
  imageCount: z.number().int().min(0).max(feedbackMaxImages),
  status: feedbackDeliveryStatusSchema,
  failureCode: z.string().min(1).max(128).nullable(),
  submittedAt: isoDateSchema,
  deliveredAt: isoDateSchema.nullable(),
});
export const feedbackConversationStatusSchema = z.enum([
  'waiting_for_support',
  'waiting_for_user',
  'resolved',
]);
export const feedbackMessageSenderSchema = z.enum(['user', 'support']);
export const feedbackMessageSchema = z.object({
  id: entityIdSchema,
  feedbackId: entityIdSchema,
  sender: feedbackMessageSenderSchema,
  senderDisplayName: z.string().trim().min(1).max(128),
  content: z.string().min(1).max(5000),
  imageCount: z.number().int().min(0).max(feedbackMaxImages),
  status: feedbackDeliveryStatusSchema,
  failureCode: z.string().min(1).max(128).nullable(),
  createdAt: isoDateSchema,
  readAt: isoDateSchema.nullable(),
});
export const feedbackThreadSummarySchema = feedbackRecordSchema.extend({
  conversationStatus: feedbackConversationStatusSchema,
  lastMessageAt: isoDateSchema,
  lastMessagePreview: z.string().min(1).max(240),
  lastMessageSender: feedbackMessageSenderSchema,
  latestSupportMessageAt: isoDateSchema.nullable(),
  latestSupportMessagePreview: z.string().min(1).max(240).nullable(),
  messageCount: z.number().int().positive(),
  supportMessageCount: z.number().int().nonnegative(),
  unreadMessageCount: z.number().int().nonnegative(),
});
export const feedbackThreadSchema = feedbackThreadSummarySchema.extend({
  messages: z.array(feedbackMessageSchema).min(1),
});
export const feedbackReplyRequestSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});
export const feedbackHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const productQrPayloadSchema = z.string().trim().max(256).regex(
  /^uniclife:\/\/cabinet\/v1\/init\/[A-Za-z0-9-]{1,64}\/[A-Za-z0-9_-]{16,128}$/,
);
export const cabinetJoinQrPayloadSchema = z.string().trim().max(256).regex(
  /^uniclife:\/\/cabinet\/v1\/join\/[A-Za-z0-9_-]{32,128}$/,
);
export const cabinetQrPayloadSchema = z.union([
  productQrPayloadSchema,
  cabinetJoinQrPayloadSchema,
]);
export const resolveCabinetQrRequestSchema = z.object({ code: cabinetQrPayloadSchema });
export const initializeCabinetRequestSchema = writeOptionsSchema.extend({
  productQrCode: productQrPayloadSchema,
  name: cabinetNameSchema,
  timeZone: z.string().trim().min(1).max(64).default('UTC'),
});
export const createCabinetJoinInvitationRequestSchema = writeOptionsSchema;
export const joinCabinetRequestSchema = writeOptionsSchema.extend({
  joinQrCode: cabinetJoinQrPayloadSchema,
});
export const renameCabinetRequestSchema = writeOptionsSchema.extend({ name: cabinetNameSchema });
export const transferCabinetSuperAdminRequestSchema = writeOptionsSchema.extend({
  membershipId: entityIdSchema,
});

export const addKeyRequestSchema = writeOptionsSchema.extend({
  slotId: entityIdSchema,
  name: z.string().trim().min(1).max(128),
  note: z.string().trim().max(1000).default(''),
});
export const updateKeyRequestSchema = writeOptionsSchema.extend({
  name: z.string().trim().min(1).max(128).optional(),
  note: z.string().trim().max(1000).optional(),
}).refine((value) => value.name !== undefined || value.note !== undefined, {
  message: 'At least one editable field is required',
});
export const checkoutKeyRequestSchema = writeOptionsSchema.extend({
  requestId: requestIdSchema,
  borrowerName: z.string().trim().min(1).max(128),
  borrowerContact: z.string().trim().min(1).max(320).optional(),
  checkedOutAt: isoDateSchema.optional(),
  expectedReturnAt: isoDateSchema.optional(),
});
export const returnKeyRequestSchema = writeOptionsSchema.extend({
  requestId: requestIdSchema,
  returnedAt: isoDateSchema.optional(),
});

export const loanListQuerySchema = z.object({
  cabinetId: entityIdSchema.optional(),
  status: loanStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const eventListQuerySchema = z.object({
  cabinetId: entityIdSchema.optional(),
  keyId: entityIdSchema.optional(),
  actorId: entityIdSchema.optional(),
  type: z.union([cabinetEventTypeSchema, z.array(cabinetEventTypeSchema)]).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type PushPlatform = z.infer<typeof pushPlatformSchema>;
export type PushTokenRequest = z.infer<typeof pushTokenRequestSchema>;
export type InitializeCabinetRequest = z.infer<typeof initializeCabinetRequestSchema>;
export type CreateCabinetJoinInvitationRequest = z.infer<
  typeof createCabinetJoinInvitationRequestSchema
>;
export type JoinCabinetRequest = z.infer<typeof joinCabinetRequestSchema>;
export type TransferCabinetSuperAdminRequest = z.infer<
  typeof transferCabinetSuperAdminRequestSchema
>;
export type AddKeyRequest = z.infer<typeof addKeyRequestSchema>;
export type UpdateKeyRequest = z.infer<typeof updateKeyRequestSchema>;
export type CheckoutKeyRequest = z.infer<typeof checkoutKeyRequestSchema>;
export type ReturnKeyRequest = z.infer<typeof returnKeyRequestSchema>;
export type FeedbackType = z.infer<typeof feedbackTypeSchema>;
export type FeedbackImage = z.infer<typeof feedbackImageSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type FeedbackDeliveryStatus = z.infer<typeof feedbackDeliveryStatusSchema>;
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;
export type FeedbackConversationStatus = z.infer<typeof feedbackConversationStatusSchema>;
export type FeedbackMessageSender = z.infer<typeof feedbackMessageSenderSchema>;
export type FeedbackMessage = z.infer<typeof feedbackMessageSchema>;
export type FeedbackThreadSummary = z.infer<typeof feedbackThreadSummarySchema>;
export type FeedbackThread = z.infer<typeof feedbackThreadSchema>;
export type FeedbackReplyRequest = z.infer<typeof feedbackReplyRequestSchema>;
