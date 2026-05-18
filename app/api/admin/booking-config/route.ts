import { NextResponse } from 'next/server';
import { listBookingConfigs } from '@/lib/bookingConfigDb';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/booking-config — list every venue row (incl. disabled).
// Same shape as the public route today; kept separate so the admin UI can
// evolve (auth, more fields) without churning the public surface.
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
