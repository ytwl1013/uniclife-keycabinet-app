import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { loadEnvironmentFiles, resolveRuntimeEnvironment } from './load-env.js';

const runtimeEnvironment = resolveRuntimeEnvironment();
const backendRoot = fileURLToPath(new URL('../../../', import.meta.url));

loadEnvironmentFiles(backendRoot, runtimeEnvironment);

const envSchema = z.object({
  AUTH_ALLOW_RESET_CODE_PREVIEW: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  AUTH_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(10),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_TOKEN_PEPPER: z.string().min(32).optional(),
  DATABASE_URL: z.string().url().optional(),
  FRONTEND_ORIGIN: z.string().default('http://localhost:8081'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default(runtimeEnvironment),
  PORT: z.coerce.number().int().positive().default(4000),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.AUTH_TOKEN_PEPPER) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AUTH_TOKEN_PEPPER is required in production',
      path: ['AUTH_TOKEN_PEPPER'],
    });
  }
  if (value.NODE_ENV === 'production' && value.AUTH_ALLOW_RESET_CODE_PREVIEW) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AUTH_ALLOW_RESET_CODE_PREVIEW must be false in production',
      path: ['AUTH_ALLOW_RESET_CODE_PREVIEW'],
    });
  }
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV !== 'test' && !parsedEnv.DATABASE_URL) {
  throw new Error(`DATABASE_URL is required when NODE_ENV=${parsedEnv.NODE_ENV}`);
}

export const env = parsedEnv;
