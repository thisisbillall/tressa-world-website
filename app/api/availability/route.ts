import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/availability?venue=restaurant&date=2026-04-25&slot=dinner
export async function GET(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  try {
    const { searchParams } = new URL(req.url);
    const venue = searchParams.get('venue');
    const date = searchParams.get('date');
    const slot = searchParams.get('slot');

    if (!venue) {
      return NextResponse.json({ success: false, error: 'venue required' }, { status: 400 });
    }

    if (venue === 'suite' || venue === 'suites') {
      const rows = await queryMany<{ suite_name: string; check_in: string; check_out: string }>(
        `SELECT suite_name, check_in, check_out
           FROM bookings
          WHERE venue = 'suite'
            AND status IN ('pending','confirmed')
            AND payment_status IN ('paid','pending','not_required')
            AND check_out >= CURRENT_DATE
            AND suite_name IS NOT NULL`,
      );
      return NextResponse.json({
        success: true,
        reserved_tables: [],
        reserved_suite_ranges: rows,
      });
    }

    if (!date || !slot) {
      return NextResponse.json(
        { success: false, error: 'date and slot required for table venues' },
        { status: 400 },
      );
    }

    const rows = await queryMany<{ table_ref: string }>(
      `SELECT DISTINCT table_ref
         FROM bookings
        WHERE venue = $1
          AND reservation_date = $2
          AND slot_id = $3
          AND status IN ('pending','confirmed')
          AND table_ref IS NOT NULL`,
      [venue, date, slot],
    );

    return NextResponse.json({
      success: true,
      reserved_tables: rows.map((r) => r.table_ref),
      reserved_suite_ranges: [],
    });
  } catch (e) {
    return jsonError(e);
  }
}
