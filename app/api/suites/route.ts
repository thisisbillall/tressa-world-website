import { NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  try {
    const rows = await queryMany(
      `SELECT id, slug, name, tag, floor, description,
              price_per_night, max_guests, features, image,
              is_active, sort_order
         FROM suites
        WHERE is_active = TRUE
        ORDER BY sort_order ASC, name ASC`,
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return jsonError(e);
  }
}
