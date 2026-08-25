import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  aggregateSuiteTypes,
  cleanupStaleSuiteBookings,
  computeTypeCharge,
  getRoomsWithAvailability,
  nightsBetween,
} from '@/lib/suiteRooms';
import { isRazorpayConfigured, rzp, RZP_KEY_ID, RZP_APP_TAG } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { generateBookingCode } from '@/lib/bookingCode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BookInput = {
  type_name: string;
  check_in: string;
  check_out: string;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
};

// POST /api/suite-bookings/book
// Books `quantity` rooms of a suite type: auto-assigns that many free rooms for
// the dates, reserves them atomically, and creates ONE Razorpay order.
export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: BookInput;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const quantity = Math.floor(Number(body.quantity) || 0);
  if (!body.type_name?.trim()) return NextResponse.json({ success: false, error: 'Room type is required' }, { status: 400 });
  if (quantity < 1) return NextResponse.json({ success: false, error: 'Pick at least one room' }, { status: 400 });
  if (!body.customer_name?.trim()) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  if ((body.customer_phone || '').replace(/\D/g, '').length !== 10) {
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

    // Paused rooms are not sellable even when their dates are open.
    const free = typeRooms.filter((r) => r.is_free && r.booking_enabled);
    if (free.length < quantity) {
      return NextResponse.json(
        { success: false, code: 'NOT_ENOUGH', error: `Only ${free.length} ${body.type_name} room(s) available for these dates.` },
        { status: 409 },
      );
    }

    // Uniform type pricing: base + the type's best offer, applied to every room.
    const type = aggregateSuiteTypes(typeRooms)[0];
    const charge = computeTypeCharge(type.base_price, type.gst_rate, type.offer_percent, nights);
    if (charge.total <= 0) return NextResponse.json({ success: false, error: 'Could not price this room type' }, { status: 400 });

    const assigned = free.slice(0, quantity);
    const grandTotal = charge.total * quantity;

    // ---- reserve all assigned rooms atomically ----
    const client = await pool.connect();
    let groupId = '';
    let groupRef = '';
    let created: any[] = [];
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
             payment_status, status, notes
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending','pending',$19)
           RETURNING *`,
          [
            generateBookingCode(), groupId, groupRef,
            room.id, room.room_number, room.name,
            body.customer_name.trim(), body.customer_phone.trim(), (body.customer_email ?? '').trim() || null,
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

    // ---- one Razorpay order for the whole booking ----
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
          customer_name: body.customer_name, customer_phone: body.customer_phone,
        },
      });
    } catch (rzpErr: any) {
      await pool.query(`UPDATE suite_bookings SET status='cancelled', payment_status='failed' WHERE group_id=$1`, [groupId]).catch(() => {});
      console.error('[suite book] razorpay error:', rzpErr?.error || rzpErr);
      throw rzpErr;
    }

    const upd = await pool.query(`UPDATE suite_bookings SET razorpay_order_id=$1 WHERE group_id=$2 RETURNING *`, [order.id, groupId]);

    return NextResponse.json({
      success: true,
      group: { group_id: groupId, group_ref: groupRef, nights, quantity, type_name: body.type_name },
      bookings: upd.rows,
      razorpay: { order_id: order.id, amount: Math.round(grandTotal * 100), currency: 'INR', key_id: RZP_KEY_ID },
    });
  } catch (e) {
    return jsonError(e);
  }
}
