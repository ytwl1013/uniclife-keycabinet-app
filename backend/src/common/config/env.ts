import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { loadEnvironmentFiles, resolveRuntimeEnvironment } from './load-env.js';

const runtimeEnvironment = resolveRuntimeEnvironment();
const backendRoot = fileURLToPath(new URL('../../../', import.meta.url));

loadEnvironmentFiles(backendRoot, runtimeEnvironment);

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  FRONTEND_ORIGIN: z.string().default('http://localhost:8081'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default(runtimeEnvironment),
  PORT: z.coerce.number().int().positive().default(4000),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV !== 'test' && !parsedEnv.DATABASE_URL) {
  throw new Error(`DATABASE_URL is required when NODE_ENV=${parsedEnv.NODE_ENV}`);
}

export const env = parsedEnv;
