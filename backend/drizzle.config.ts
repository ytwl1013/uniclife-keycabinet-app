import { fileURLToPath } from 'node:url';

import { defineConfig } from 'drizzle-kit';

import { loadEnvironmentFiles, resolveRuntimeEnvironment } from './src/common/config/load-env.js';

const backendRoot = fileURLToPath(new URL('.', import.meta.url));

loadEnvironmentFiles(backendRoot, resolveRuntimeEnvironment());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run Drizzle migrations');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
