import { z } from 'zod';

export const permissionCodeSchema = z.enum([
  'auth:login',
  'users:read',
  'users:write',
  'cabinets:read',
  'cabinets:operate',
  'keys:read',
  'keys:borrow',
  'keys:return',
  'records:read',
  'audit:read',
]);

export type PermissionCode = z.infer<typeof permissionCodeSchema>;

export const highRiskPermissionCodes: readonly PermissionCode[] = [
  'cabinets:operate',
  'keys:borrow',
  'keys:return',
];
