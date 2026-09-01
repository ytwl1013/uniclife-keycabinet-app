import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { loadEnvironmentFiles, resolveRuntimeEnvironment } from './load-env.js';

const runtimeEnvironment = resolveRuntimeEnvironment();
const backendRoot = fileURLToPath(new URL('../../../', import.meta.url));

loadEnvironmentFiles(backendRoot, runtimeEnvironment);

const envSchema = z.object({
  ADMIN_API_TOKEN: z
    .string()
    .min(32)
    .max(512)
    .refine((value) => !value.includes('<') && !value.includes('>') && !value.startsWith('replace-with'), {
      message: 'ADMIN_API_TOKEN must not be an example placeholder',
    })
    .optional(),
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
  MAIL_FEEDBACK_TO: z.string().email().optional(),
  MAIL_PASSWORD: z.string().min(1).optional(),
  MAIL_PORT: z.coerce.number().int().min(1).max(65_535).default(465),
  MAIL_SENDER: z
    .string()
    .trim()
    .min(1)
    .max(320)
    .refine((value) => {
      const address = value.match(/<([^<>]+)>/)?.[1]?.trim() ?? value;
      return z.string().email().safeParse(address).success;
    }, 'MAIL_SENDER must contain a valid email address')
    .optional(),
  MAIL_SENDER_NAME: z.string().trim().min(1).max(128).default('keycabinet_app'),
  MAIL_SERVER: z.string().trim().min(1).max(255).optional(),
  MAIL_TIMEOUT: z.coerce.number().int().min(1).max(120).default(45),
  MAIL_USERNAME: z.string().email().optional(),
  MAIL_USE_SSL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  MAIL_USE_TLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default(runtimeEnvironment),
  PORT: z.coerce.number().int().positive().default(4000),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'test' && !value.AUTH_TOKEN_PEPPER) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `AUTH_TOKEN_PEPPER is required when NODE_ENV=${value.NODE_ENV}`,
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
  const mailConfigured = Boolean(value.MAIL_SERVER || value.MAIL_USERNAME || value.MAIL_PASSWORD);
  if (mailConfigured) {
    for (const field of ['MAIL_SERVER', 'MAIL_USERNAME', 'MAIL_PASSWORD'] as const) {
      if (!value[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is required when SMTP feedback delivery is configured`,
          path: [field],
        });
      }
    }
  }
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV !== 'test' && !parsedEnv.DATABASE_URL) {
  throw new Error(`DATABASE_URL is required when NODE_ENV=${parsedEnv.NODE_ENV}`);
}

export const env = parsedEnv;
