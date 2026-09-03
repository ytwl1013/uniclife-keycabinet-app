import 'server-only';

import { z } from 'zod';

const protectedValueSchema = z
  .string()
  .min(32)
  .max(512)
  .refine((value) => !value.includes('<') && !value.includes('>') && !value.startsWith('replace-with'));

const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(['dev', 'pro']).default('dev'),
    API_BASE_URL_DEV: z.string().url(),
    API_BASE_URL_PRO: z.string().url(),
    ADMIN_USERNAME: z.string().trim().email().transform((value) => value.toLowerCase()),
    ADMIN_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/),
    ADMIN_SESSION_SECRET: protectedValueSchema,
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    ADMIN_API_TOKEN: protectedValueSchema.optional(),
    ADMIN_API_TOKEN_DEV: protectedValueSchema.optional(),
    ADMIN_API_TOKEN_PRO: protectedValueSchema.optional(),
  })
  .superRefine((value, context) => {
    const selectedUrl = new URL(value.APP_ENV === 'pro' ? value.API_BASE_URL_PRO : value.API_BASE_URL_DEV);
    if (value.APP_ENV === 'pro' && selectedUrl.protocol !== 'https:') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['API_BASE_URL_PRO'],
        message: 'The production API must use HTTPS',
      });
    }
    const selectedToken = value.APP_ENV === 'pro' ? value.ADMIN_API_TOKEN_PRO : value.ADMIN_API_TOKEN_DEV;
    if (!selectedToken && !value.ADMIN_API_TOKEN) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.APP_ENV === 'pro' ? 'ADMIN_API_TOKEN_PRO' : 'ADMIN_API_TOKEN_DEV'],
        message: `The ${value.APP_ENV} admin API token is required`,
      });
    }
  });

export type AdminEnvironment = 'dev' | 'pro';
export type AdminServerEnv = z.infer<typeof serverEnvSchema> & {
  adminApiToken: string;
  apiBaseUrl: string;
};

let cachedEnvironment: AdminServerEnv | undefined;

export function getAdminServerEnv(): AdminServerEnv {
  if (cachedEnvironment) return cachedEnvironment;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('ADMIN_CONFIGURATION_INVALID');
  }
  const apiBaseUrl = (parsed.data.APP_ENV === 'pro'
    ? parsed.data.API_BASE_URL_PRO
    : parsed.data.API_BASE_URL_DEV
  ).replace(/\/$/, '');
  const adminApiToken = (parsed.data.APP_ENV === 'pro'
    ? parsed.data.ADMIN_API_TOKEN_PRO
    : parsed.data.ADMIN_API_TOKEN_DEV) ?? parsed.data.ADMIN_API_TOKEN!;
  cachedEnvironment = { ...parsed.data, adminApiToken, apiBaseUrl };
  return cachedEnvironment;
}

export function getAdminEnvironmentName(): AdminEnvironment {
  return process.env.APP_ENV === 'pro' ? 'pro' : 'dev';
}
