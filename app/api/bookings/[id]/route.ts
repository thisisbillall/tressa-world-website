import { NextRequest, NextResponse } from 'next/server';
import { pool, queryOne } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = ['pending', 'confirmed', 'cancelled', 'completed'] as const;

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;
  try {
    const booking = await queryOne(`SELECT * FROM bookings WHERE id = $1`, [params.id]);
    if (!booking) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: booking });
  } catch (e) {
    return jsonError(e);
  }
}

// PATCH /api/bookings/[id]  { status?: 'confirmed'|'cancelled'|'completed' }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const status = body?.status;
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, params.id],
    );
    if (!rows[0]) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (e) {
    return jsonError(e);
  }
}

// DELETE /api/bookings/[id]?order_id=<razorpay_order_id>
//
// Client calls this when the user closes / fails the Razorpay checkout, so the
// reserved slot frees immediately for someone else.
//
// Safety:
// - Requires the razorpay_order_id the client was given at POST /api/bookings.
//   Acts as a per-booking token so strangers can't delete other users' rows.
// - Only deletes rows that are still pending & unpaid. A paid/confirmed row is
//   never deleted here (that needs a refund flow, not a delete).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');

  try {
    const booking = await queryOne<any>(
      `SELECT id, status, payment_status, razorpay_order_id
         FROM bookings WHERE id = $1`,
      [params.id],
    );
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Token check: if the row has a razorpay order, the client must send it
    // back. Rows with no order_id (free bookings) skip this — they can't be
    // "cancelled by the user" post-hoc anyway; use PATCH for those.
    if (booking.razorpay_order_id) {
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'order_id query parameter required' },
          { status: 400 },
        );
      }
      if (orderId !== booking.razorpay_order_id) {
        return NextResponse.json(
          { success: false, error: 'order_id does not match booking' },
          { status: 403 },
        );
      }
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment already captured — cannot delete. Contact support for a refund.' },
        { status: 409 },
      );
    }
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      return NextResponse.json(
        { success: false, error: `Cannot delete a ${booking.status} booking.` },
        { status: 409 },
      );
    }

    const { rowCount } = await pool.query(`DELETE FROM bookings WHERE id = $1`, [params.id]);
    return NextResponse.json({ success: true, deleted: rowCount });
  } catch (e) {
    return jsonError(e);
  }
}
