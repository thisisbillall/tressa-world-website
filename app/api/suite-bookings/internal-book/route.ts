import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  aggregateSuiteTypes,
  cleanupStaleSuiteBookings,
  computeTypeCharge,
  getRoomsWithAvailability,
  nightsBetween,
} from '@/lib/suiteRooms';
import { isRazorpayConfigured, rzp, RZP_APP_TAG } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { generateBookingCode } from '@/lib/bookingCode';
import { sendSms, isTwilioConfigured } from '@/lib/twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Staff-only endpoint. Reception creates a booking on the guest's behalf and we
// SMS a pay link. It reuses the SAME tagged Razorpay order as the public flow
// (notes.app='tressa-website'), so the existing webhook + refund-guard handle
// it unchanged — no new webhook, no cross-app conflict. The booking is marked
// booking_source='reception-link' so it gets a longer hold and is easy to
// distinguish.
const INTERNAL_SECRET = process.env.INTERNAL_BOOKING_SECRET || '';
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tressaworld.com').replace(/\/$/, '');

type Input = {
  secret?: string;
  type_name: string;
  check_in: string;
  check_out: string;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
};

export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: Input;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Staff auth: shared secret, validated server-side ──
  const provided = req.headers.get('x-internal-secret') || body.secret || '';
  if (!INTERNAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Internal booking is not configured (missing INTERNAL_BOOKING_SECRET).' }, { status: 500 });
  }
  if (provided !== INTERNAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const quantity = Math.floor(Number(body.quantity) || 0);
  if (!body.type_name?.trim()) return NextResponse.json({ success: false, error: 'Room type is required' }, { status: 400 });
  if (quantity < 1) return NextResponse.json({ success: false, error: 'Pick at least one room' }, { status: 400 });
  if (!body.customer_name?.trim()) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  const phone = (body.customer_phone || '').replace(/\D/g, '');
  if (phone.length !== 10) {
    return NextResponse.json({ success: false, error: 'Enter a valid 10-digit phone number' }, { status: 400 });
  }
  if (!body.check_in || !body.check_out || nightsBetween(body.check_in, body.check_out) < 1) {
    return NextResponse.json({ success: false, error: 'Check-out must be after check-in' }, { status: 400 });
  }
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ success: false, error: 'Payment gateway not configured.' }, { status: 500 });
  }

  await cleanupStaleSuiteBookings(15);
  const nights = nightsBetween(body.check_in, body.check_out);

  try {
    const rooms = await getRoomsWithAvailability(body.check_in, body.check_out);
    const typeRooms = rooms.filter((r) => r.name === body.type_name);
    if (!typeRooms.length) return NextResponse.json({ success: false, error: 'Unknown room type' }, { status: 400 });

    const free = typeRooms.filter((r) => r.is_free);
    if (free.length < quantity) {
      return NextResponse.json(
        { success: false, code: 'NOT_ENOUGH', error: `Only ${free.length} ${body.type_name} room(s) available for these dates.` },
        { status: 409 },
      );
    }

    const type = aggregateSuiteTypes(typeRooms)[0];
    const charge = computeTypeCharge(type.base_price, type.gst_rate, type.offer_percent, nights);
    if (charge.total <= 0) return NextResponse.json({ success: false, error: 'Could not price this room type' }, { status: 400 });

    const assigned = free.slice(0, quantity);
    const grandTotal = charge.total * quantity;

    // reserve atomically (booking_source='reception-link')
    const client = await pool.connect();
    let groupId = '';
    let groupRef = '';
    const created: any[] = [];
    try {
      await client.query('BEGIN');
      groupId = (await client.query('SELECT gen_random_uuid() AS id')).rows[0].id;
      groupRef = generateBookingCode();
      for (const room of assigned) {
        const { rows } = await client.query(
          `INSERT INTO suite_bookings (
             booking_code, group_id, group_ref,
             room_id, room_number, room_name,
             customer_name, customer_phone, customer_email,
             check_in, check_out, nights, guests,
             base_amount, discount_amount, gst_rate, gst_amount, total_amount,
             payment_status, status, notes, booking_source
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending','pending',$19,'reception-link')
           RETURNING *`,
          [
            generateBookingCode(), groupId, groupRef,
            room.id, room.room_number, room.name,
            body.customer_name.trim(), phone, (body.customer_email ?? '').trim() || null,
            body.check_in, body.check_out, nights, room.max_guests,
            charge.base, charge.discount, charge.gstRate, charge.gst, charge.total, body.notes?.trim() || null,
          ],
        );
        created.push(rows[0]);
      }
      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      if (e?.code === '23P01') {
        return NextResponse.json(
          { success: false, code: 'ALREADY_BOOKED', error: 'Those rooms were just taken. Please try again.' },
          { status: 409 },
        );
      }
      throw e;
    }
    client.release();

    // one tagged Razorpay order (same shape as the public flow)
    let order;
    try {
      order = await rzp().orders.create({
        amount: Math.round(grandTotal * 100),
        currency: 'INR',
        receipt: `suitegrp_${groupId.slice(0, 12)}`,
        notes: {
          app: RZP_APP_TAG,
          group_id: groupId, group_ref: groupRef, type: body.type_name,
          rooms: created.map((b) => b.room_number).join(','), nights: String(nights),
          customer_name: body.customer_name, customer_phone: phone,
          source: 'reception-link',
        },
      });
    } catch (rzpErr: any) {
      await pool.query(`UPDATE suite_bookings SET status='cancelled', payment_status='failed' WHERE group_id=$1`, [groupId]).catch(() => {});
      console.error('[internal-book] razorpay error:', rzpErr?.error || rzpErr);
      throw rzpErr;
    }
    await pool.query(`UPDATE suite_bookings SET razorpay_order_id=$1 WHERE group_id=$2`, [order.id, groupId]);

    // SMS the guest a link to the pay page
    const payUrl = `${SITE_ORIGIN}/pay/${encodeURIComponent(groupRef)}`;
    const amountStr = `₹${grandTotal.toLocaleString('en-IN')}`;
    let smsSent = false;
    if (isTwilioConfigured()) {
      const msg =
        `TRESSA — Hi ${body.customer_name.trim()}, your ${quantity} ${body.type_name} ` +
        `(${nights} night${nights > 1 ? 's' : ''}) is reserved.\n` +
        `Pay ${amountStr} to confirm: ${payUrl}\n` +
        `Hold expires in 20 min. — Team Tressa`;
      const res = await sendSms(phone, msg);
      smsSent = res.success;
      if (!res.success) console.error('[internal-book] sms failed:', res.error);
    }

    return NextResponse.json({
      success: true,
      group: { group_id: groupId, group_ref: groupRef, nights, quantity, type_name: body.type_name },
      total_amount: grandTotal,
      pay_url: payUrl,
      sms_sent: smsSent,
    });
  } catch (e) {
    return jsonError(e);
  }
}
