import { z } from 'zod';

export const apiCodeSchema = z.string().min(1);

export const requestIdSchema = z.string().trim().min(8).max(128);

export const writeOptionsSchema = z.object({
  expectedVersion: z.number().int().nonnegative().optional(),
  requestId: requestIdSchema.optional(),
});

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: apiCodeSchema,
    message: z.string(),
    data: dataSchema.nullable(),
  });

export type ApiEnvelope<T> = {
  code: string;
  message: string;
  data: T | null;
};

export type WriteOptions = z.infer<typeof writeOptionsSchema>;

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonArray = readonly JsonValue[];

/** Public health metadata; revision is present only for an identified Git deployment. */
export const healthStatusSchema = z.object({
  service: z.literal('uniclife-keycabinet-backend'),
  status: z.literal('ok'),
  revision: z.string().regex(/^[a-f0-9]{40}$/i).optional(),
});
export type HealthStatus = z.infer<typeof healthStatusSchema>;
