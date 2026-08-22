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

export const cabinetQrPayloadSchema = z.string().trim().max(256).regex(
  /^uniclife:\/\/cabinet\/[A-Za-z0-9-]{1,64}\/[0-9a-fA-F-]{36}$/,
);
export const resolveCabinetQrRequestSchema = z.object({ code: cabinetQrPayloadSchema });
export const bindCabinetRequestSchema = writeOptionsSchema.extend({
  qrCode: cabinetQrPayloadSchema,
  name: cabinetNameSchema.optional(),
  timeZone: z.string().trim().min(1).max(64).default('UTC'),
});
export const renameCabinetRequestSchema = writeOptionsSchema.extend({ name: cabinetNameSchema });

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
export type BindCabinetRequest = z.infer<typeof bindCabinetRequestSchema>;
export type AddKeyRequest = z.infer<typeof addKeyRequestSchema>;
export type UpdateKeyRequest = z.infer<typeof updateKeyRequestSchema>;
export type CheckoutKeyRequest = z.infer<typeof checkoutKeyRequestSchema>;
export type ReturnKeyRequest = z.infer<typeof returnKeyRequestSchema>;
