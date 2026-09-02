import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../common/config/env.js';
import * as schema from './schema.js';

const databaseUrl = env.DATABASE_URL;

export const sql = databaseUrl
  ? postgres(databaseUrl, {
      max: env.DB_POOL_MAX,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export type AppDatabase = NonNullable<typeof db>;
export type AppTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
export type DbExecutor = AppDatabase | AppTransaction;

export function requireDatabase(): AppDatabase {
  if (!db) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  await sql?.end({ timeout: 5 });
}
