import { z } from 'zod';

import {
  cabinetStatusSchema,
  entityIdSchema,
  httpUrlSchema,
  isoDateSchema,
  productQrSchema,
  productSkuSchema,
  supportedLocaleSchema,
  userStatusSchema,
} from './domain.js';
import { feedbackThreadSummarySchema } from './requests.js';

export const adminUserQuerySchema = z.object({
  query: z.string().trim().max(128).default(''),
  status: z.enum(['all', 'active', 'disabled']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminActivityQuerySchema = z.object({
  query: z.string().trim().max(128).default(''),
  result: z.enum(['all', 'success', 'failure']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminFeedbackQuerySchema = z.object({
  query: z.string().trim().max(128).default(''),
  status: z
    .enum(['all', 'waiting_for_support', 'waiting_for_user', 'resolved'])
    .default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const productImageMaxBytes = 700 * 1024;
export const productImageMaxDimension = 1280;

export const adminProductQuerySchema = z.object({
  query: z.string().trim().max(128).default(''),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminProductImageInputSchema = z.object({
  data: z
    .string()
    .min(4)
    .max(Math.ceil(productImageMaxBytes / 3) * 4 + 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  mimeType: z.literal('image/webp'),
  byteSize: z.number().int().min(1).max(productImageMaxBytes),
  width: z.number().int().min(1).max(productImageMaxDimension),
  height: z.number().int().min(1).max(productImageMaxDimension),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const adminProductEditableFields = {
  model: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(128),
  color: z.string().trim().min(1).max(64),
  capacity: z.coerce.number().int().min(1).max(1000),
  description: z.string().trim().max(5000),
  manualUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === '' || httpUrlSchema.safeParse(value).success, {
      message: 'Manual URL must be empty or use http/https',
    })
    .default(''),
};

export const adminProductCreateRequestSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,64}$/),
  ...adminProductEditableFields,
  image: adminProductImageInputSchema,
});

export const adminProductUpdateRequestSchema = z.object({
  ...adminProductEditableFields,
  expectedVersion: z.number().int().nonnegative(),
  image: adminProductImageInputSchema.optional(),
});

export const adminProductImageSchema = adminProductImageInputSchema.omit({ data: true }).extend({
  path: z.string().regex(/^\/api\/v1\/products\/[A-Za-z0-9-]{1,128}\/image\?v=\d+$/),
  version: z.number().int().positive(),
});

export const adminProductSchema = productSkuSchema.extend({
  qr: productQrSchema.nullable(),
  image: adminProductImageSchema.nullable(),
  cabinetCount: z.number().int().nonnegative(),
  capacityEditable: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const adminProductListSchema = z.object({
  items: z.array(adminProductSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const adminUserStatusRequestSchema = z.object({
  status: userStatusSchema,
});

export const adminUserStatusResultSchema = z.object({
  id: entityIdSchema,
  status: userStatusSchema,
});

export const adminUserSchema = z.object({
  id: entityIdSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(128),
  locale: supportedLocaleSchema,
  status: userStatusSchema,
  loginCount: z.number().int().nonnegative(),
  lastLoginAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  cabinetCount: z.number().int().nonnegative(),
});

export const adminCabinetAdministratorSchema = z.object({
  id: entityIdSchema,
  displayName: z.string().min(1).max(128),
  email: z.string().email(),
  status: userStatusSchema,
  role: z.enum(['super_admin', 'admin']),
  joinedAt: isoDateSchema,
});

export const adminUserCabinetSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1).max(128),
  location: z.string().max(256),
  timeZone: z.string().min(1).max(64),
  status: cabinetStatusSchema,
  lastSyncedAt: isoDateSchema,
  createdAt: isoDateSchema,
  version: z.number().int().nonnegative(),
  membership: z.object({
    role: z.enum(['super_admin', 'admin']),
    joinedAt: isoDateSchema,
  }),
  product: z.object({
    sku: z.string().min(1).max(64),
    model: z.string().min(1).max(128),
    name: z.string().min(1).max(128),
    color: z.string().min(1).max(64),
    capacity: z.number().int().positive(),
  }),
  keyCount: z.number().int().nonnegative(),
  borrowedKeyCount: z.number().int().nonnegative(),
  administrators: z.array(adminCabinetAdministratorSchema),
});

export const adminUserDetailSchema = z.object({
  user: adminUserSchema.extend({
    activeSessionCount: z.number().int().nonnegative(),
  }),
  cabinets: z.array(adminUserCabinetSchema),
});

export const adminActivitySchema = z.object({
  id: entityIdSchema,
  action: z.string().min(1).max(128),
  targetType: z.string().min(1).max(64),
  targetId: z.string().min(1).max(128),
  result: z.enum(['success', 'failure']),
  reasonCode: z.string().min(1).max(128).nullable(),
  createdAt: isoDateSchema,
  actor: z
    .object({
      id: entityIdSchema,
      displayName: z.string().min(1).max(128),
      email: z.string().email(),
    })
    .nullable(),
});

export const adminOverviewSchema = z.object({
  metrics: z.object({
    totalUsers: z.number().int().nonnegative(),
    activeUsers: z.number().int().nonnegative(),
    disabledUsers: z.number().int().nonnegative(),
    newUsersLast7Days: z.number().int().nonnegative(),
    activeSessions: z.number().int().nonnegative(),
    totalCabinets: z.number().int().nonnegative(),
    onlineCabinets: z.number().int().nonnegative(),
  }),
  activityTrend: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      count: z.number().int().nonnegative(),
    }),
  ),
  recentActivities: z.array(adminActivitySchema),
});

export const adminUserListSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const adminActivityListSchema = z.object({
  items: z.array(adminActivitySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const adminFeedbackListSchema = z.object({
  items: z.array(feedbackThreadSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminActivityQuery = z.infer<typeof adminActivityQuerySchema>;
export type AdminFeedbackQuery = z.infer<typeof adminFeedbackQuerySchema>;
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;
export type AdminProductImageInput = z.infer<typeof adminProductImageInputSchema>;
export type AdminProductCreateRequest = z.infer<typeof adminProductCreateRequestSchema>;
export type AdminProductUpdateRequest = z.infer<typeof adminProductUpdateRequestSchema>;
export type AdminProductImage = z.infer<typeof adminProductImageSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminProductList = z.infer<typeof adminProductListSchema>;
export type AdminUserStatusRequest = z.infer<typeof adminUserStatusRequestSchema>;
export type AdminUserStatusResult = z.infer<typeof adminUserStatusResultSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminCabinetAdministrator = z.infer<typeof adminCabinetAdministratorSchema>;
export type AdminUserCabinet = z.infer<typeof adminUserCabinetSchema>;
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
export type AdminActivity = z.infer<typeof adminActivitySchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminUserList = z.infer<typeof adminUserListSchema>;
export type AdminActivityList = z.infer<typeof adminActivityListSchema>;
export type AdminFeedbackList = z.infer<typeof adminFeedbackListSchema>;
