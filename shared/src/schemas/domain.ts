import { z } from 'zod';

export const userStatusSchema = z.enum(['active', 'disabled']);
export const cabinetStatusSchema = z.enum(['online', 'offline', 'maintenance']);
export const keyStatusSchema = z.enum(['available', 'borrowed', 'lost', 'disabled']);
export const recordTypeSchema = z.enum(['borrow', 'return', 'inventory', 'force_open', 'exception']);

export const keyActionRequestSchema = z.object({
  keyCode: z.string().min(1).max(64),
  cabinetCode: z.string().min(1).max(64),
  slotCode: z.string().min(1).max(64),
  requestId: z.string().min(8).max(128),
  reason: z.string().max(256).optional(),
});

export type UserStatus = z.infer<typeof userStatusSchema>;
export type CabinetStatus = z.infer<typeof cabinetStatusSchema>;
export type KeyStatus = z.infer<typeof keyStatusSchema>;
export type RecordType = z.infer<typeof recordTypeSchema>;
export type KeyActionRequest = z.infer<typeof keyActionRequestSchema>;
