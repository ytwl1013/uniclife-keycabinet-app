import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../common/config/env.js';
import * as schema from './schema.js';

const databaseUrl = env.DATABASE_URL;

export const sql = databaseUrl
  ? postgres(databaseUrl, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export async function closeDatabase(): Promise<void> {
  await sql?.end({ timeout: 5 });
}
