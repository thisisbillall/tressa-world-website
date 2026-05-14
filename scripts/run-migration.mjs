// Standalone migration runner — applies a single SQL file via pg using
// the same DATABASE_URL the app reads at runtime. Idempotent migrations
// only.
//
//   node scripts/run-migration.mjs sql/009_booking_code_expiry.sql

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

async function loadEnv() {
  // Minimal .env loader so we don't need an external dep. Reads KEY=value
  // lines and only sets DATABASE_URL.
  try {
    const txt = await readFile(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.*)$/);
      if (m && !process.env.DATABASE_URL) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env.DATABASE_URL = v;
        break;
      }
    }
  } catch {}
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.mjs <sql file>');
  process.exit(1);
}

await loadEnv();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in env or .env');
  process.exit(1);
}

const sql = await readFile(resolve(process.cwd(), file), 'utf8');
const useSSL = /amazonaws\.com|sslmode=require|render\.com|supabase\.co|neon\.tech/i.test(process.env.DATABASE_URL);
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  console.log(`[migrate] applying ${file}`);
  await client.query(sql);
  console.log('[migrate] done');
} catch (e) {
  console.error('[migrate] failed:', e?.message || e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
