import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const useSSL = !!connectionString && /amazonaws\.com|sslmode=require|render\.com|supabase\.co|neon\.tech/i.test(connectionString);

// Hot reloads in `next dev` re-import this module and would otherwise
// instantiate a fresh Pool every save — the old pool's idle connections
// stick around until GC and quickly exhaust RDS connection slots. Park the
// pool on globalThis so the same instance survives reloads.
const g = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  g.__pgPool ??
  new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== 'production') g.__pgPool = pool;

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await pool.query(sql, params);
  return (result.rows[0] as T) || null;
}

export async function queryMany<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}
