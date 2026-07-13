import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Staff-only. Releases an UNPAID reception hold so the room is sellable again.
// Never removes a paid/confirmed booking — the WHERE clause guards that, so if
// the guest has already paid this returns released:0 and the booking stands.
const INTERNAL_SECRET = process.env.INTERNAL_BOOKING_SECRET || '';

export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const provided = req.headers.get('x-internal-secret') || body.secret || '';
  if (!INTERNAL_SECRET) return NextResponse.json({ success: false, error: 'Internal booking is not configured.' }, { status: 500 });
  if (provided !== INTERNAL_SECRET) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const ref = String(body.group_ref || '').trim().toUpperCase();
  if (!ref) return NextResponse.json({ success: false, error: 'group_ref required' }, { status: 400 });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM suite_bookings
        WHERE group_ref = $1
          AND payment_status = 'pending'
          AND status = 'pending'`,
      [ref],
    );
    const released = rowCount ?? 0;
    if (released === 0) {
      // Nothing unpaid to free — either already paid, or already released.
      return NextResponse.json({ success: true, released: 0, note: 'Nothing to cancel (already paid or already released).' });
    }
    return NextResponse.json({ success: true, released });
  } catch (e) {
    return jsonError(e);
  }
}
