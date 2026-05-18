import { NextResponse } from 'next/server';
import { listBookingConfigs } from '@/lib/bookingConfigDb';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/booking-config — public, read-only. Used by the booking page to
// drive fee / discount / window / step / enabled / priority-windows per venue.
export async function GET() {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;
  try {
    const data = await listBookingConfigs();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return jsonError(e);
  }
}
