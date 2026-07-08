import { z } from 'zod';

export const apiCodeSchema = z.string().min(1);

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

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonArray = readonly JsonValue[];
