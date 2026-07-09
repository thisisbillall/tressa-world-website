import { NextResponse } from 'next/server';
import { listActiveSuiteRooms } from '@/lib/suiteRooms';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public list of bookable premium rooms for the /suites page. Pricing/offers
// here are whatever your webapp has set in suite_rooms.
export async function GET() {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;
  try {
    const rooms = await listActiveSuiteRooms();
    return NextResponse.json({ success: true, data: rooms });
  } catch (e) {
    return jsonError(e);
  }
}
