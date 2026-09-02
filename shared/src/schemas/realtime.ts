import { z } from 'zod';

import { entityIdSchema, isoDateSchema } from './domain.js';

export const realtimeProtocol = 'uniclife.realtime.v1';
export const realtimeAuthProtocolPrefix = 'uniclife.auth.';

export const realtimeResourceSchema = z.enum([
  'cabinets',
  'memberships',
  'keys',
  'loans',
  'events',
]);

export const realtimeReadyEventSchema = z.object({
  type: z.literal('realtime.ready'),
  eventId: entityIdSchema,
  occurredAt: isoDateSchema,
  heartbeatIntervalMs: z.number().int().positive(),
});

export const realtimeWorkspaceChangedEventSchema = z.object({
  type: z.literal('workspace.changed'),
  eventId: entityIdSchema,
  occurredAt: isoDateSchema,
  cabinetId: entityIdSchema,
  cabinetVersion: z.number().int().nonnegative(),
  resources: z.array(realtimeResourceSchema).min(1),
});

export const realtimeSupportMessageCreatedEventSchema = z.object({
  type: z.literal('support.message_created'),
  eventId: entityIdSchema,
  occurredAt: isoDateSchema,
  feedbackId: entityIdSchema,
});

export const realtimeEventSchema = z.discriminatedUnion('type', [
  realtimeReadyEventSchema,
  realtimeWorkspaceChangedEventSchema,
  realtimeSupportMessageCreatedEventSchema,
]);

export type RealtimeResource = z.infer<typeof realtimeResourceSchema>;
export type RealtimeReadyEvent = z.infer<typeof realtimeReadyEventSchema>;
export type RealtimeWorkspaceChangedEvent = z.infer<
  typeof realtimeWorkspaceChangedEventSchema
>;
export type RealtimeSupportMessageCreatedEvent = z.infer<
  typeof realtimeSupportMessageCreatedEventSchema
>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
