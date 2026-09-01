import { z } from 'zod';

import { entityIdSchema, isoDateSchema, supportedLocaleSchema, userStatusSchema } from './domain.js';

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

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminActivityQuery = z.infer<typeof adminActivityQuerySchema>;
export type AdminUserStatusRequest = z.infer<typeof adminUserStatusRequestSchema>;
export type AdminUserStatusResult = z.infer<typeof adminUserStatusResultSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminActivity = z.infer<typeof adminActivitySchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminUserList = z.infer<typeof adminUserListSchema>;
export type AdminActivityList = z.infer<typeof adminActivityListSchema>;
