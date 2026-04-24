import { NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/venue-charges — list per-venue cover charges for the booking form.
export async function GET() {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  try {
    const rows = await queryMany(
      `SELECT venue, price_per_person, description, is_active
         FROM venue_charges
        WHERE is_active = TRUE
        ORDER BY venue ASC`,
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return jsonError(e);
  }
}
