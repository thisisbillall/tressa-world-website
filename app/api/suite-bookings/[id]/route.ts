import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/suite-bookings/:id?order_id=...
// Called when the guest dismisses the Razorpay popup, to immediately free the
// room. Only ever removes an UNPAID hold — a paid booking is never deleted here.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM suite_bookings
        WHERE id = $1
          AND payment_status = 'pending'
          AND status = 'pending'
          ${orderId ? 'AND razorpay_order_id = $2' : ''}`,
      orderId ? [params.id, orderId] : [params.id],
    );
    return NextResponse.json({ success: true, released: (rowCount ?? 0) > 0 });
  } catch (e) {
    return jsonError(e);
  }
}
