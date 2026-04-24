import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/health — fast check that DATABASE_URL is set, the DB is reachable,
// and the booking-related tables exist. Use for diagnosing "Unexpected end of
// JSON input" errors on the client.
export async function GET() {
  const checks: Record<string, any> = {
    database_url: !!process.env.DATABASE_URL,
    razorpay: {
      key_id: !!process.env.RAZORPAY_KEY_ID,
      key_secret: !!process.env.RAZORPAY_KEY_SECRET,
      webhook_secret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    },
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, checks, error: 'DATABASE_URL not set' }, { status: 500 });
  }

  try {
    await pool.query('SELECT 1');
    checks.db_connection = true;

    const tablesRes = await pool.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('bookings','suites')`,
    );
    const found = new Set(tablesRes.rows.map((r: any) => r.table_name));
    checks.tables = {
      bookings: found.has('bookings'),
      suites: found.has('suites'),
    };

    const triggerRes = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_notify_%' AND NOT tgisinternal`,
    );
    checks.notify_triggers = triggerRes.rows.map((r: any) => r.tgname);

    const allGood =
      checks.db_connection &&
      checks.tables.bookings &&
      checks.tables.suites;

    return NextResponse.json({
      success: allGood,
      checks,
      hint: allGood
        ? undefined
        : 'Run the SQL migrations: psql "$DATABASE_URL" -f sql/001_bookings.sql -f sql/002_suites.sql -f sql/003_booking_refs.sql',
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        checks,
        error: e?.message || 'Database check failed',
        code: e?.code,
      },
      { status: 500 },
    );
  }
}
