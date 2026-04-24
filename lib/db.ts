import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const useSSL = !!connectionString && /amazonaws\.com|sslmode=require|render\.com|supabase\.co|neon\.tech/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await pool.query(sql, params);
  return (result.rows[0] as T) || null;
}

export async function queryMany<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}
