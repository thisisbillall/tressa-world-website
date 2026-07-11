import { NextRequest, NextResponse } from 'next/server';
import { aggregateSuiteTypes, getRoomsWithAvailability } from '@/lib/suiteRooms';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/suite-types?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
// Returns the 3 suite types with price, offer and how many rooms are free for
// the given dates (all rooms shown available when no dates are passed).
export async function GET(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;
  try {
    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get('check_in') || undefined;
    const checkOut = searchParams.get('check_out') || undefined;
    const rooms = await getRoomsWithAvailability(checkIn, checkOut);
    return NextResponse.json({ success: true, data: aggregateSuiteTypes(rooms) });
  } catch (e) {
    return jsonError(e);
  }
}
