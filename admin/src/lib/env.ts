import 'server-only';

import { z } from 'zod';

const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(['development', 'dev']).default('development'),
    API_BASE_URL_DEVELOPMENT: z.string().url(),
    API_BASE_URL_DEV: z.string().url(),
    ADMIN_USERNAME: z.string().trim().email().transform((value) => value.toLowerCase()),
    ADMIN_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/),
    ADMIN_SESSION_SECRET: z
      .string()
      .min(32)
      .max(512)
      .refine((value) => !value.includes('<') && !value.includes('>') && !value.startsWith('replace-with')),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    ADMIN_API_TOKEN: z
      .string()
      .min(32)
      .max(512)
      .refine((value) => !value.includes('<') && !value.includes('>') && !value.startsWith('replace-with')),
  })
  .superRefine((value, context) => {
    const selectedUrl = new URL(
      value.APP_ENV === 'dev' ? value.API_BASE_URL_DEV : value.API_BASE_URL_DEVELOPMENT,
    );
    if (value.APP_ENV === 'dev' && selectedUrl.protocol !== 'https:') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['API_BASE_URL_DEV'],
        message: 'The remote dev API must use HTTPS',
      });
    }
  });

export type AdminServerEnv = z.infer<typeof serverEnvSchema> & { apiBaseUrl: string };

let cachedEnvironment: AdminServerEnv | undefined;

export function getAdminServerEnv(): AdminServerEnv {
  if (cachedEnvironment) return cachedEnvironment;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('ADMIN_CONFIGURATION_INVALID');
  }
  const apiBaseUrl = (
    parsed.data.APP_ENV === 'dev'
      ? parsed.data.API_BASE_URL_DEV
      : parsed.data.API_BASE_URL_DEVELOPMENT
  ).replace(/\/$/, '');
  cachedEnvironment = { ...parsed.data, apiBaseUrl };
  return cachedEnvironment;
}

export function getAdminEnvironmentName(): 'development' | 'dev' {
  return process.env.APP_ENV === 'dev' ? 'dev' : 'development';
}
