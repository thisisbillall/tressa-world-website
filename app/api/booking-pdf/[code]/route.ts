import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { guardDbConfigured } from '@/lib/apiError';
import { buildBookingPdf, BookingPdfInput } from '@/lib/bookingPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RowWithPdfUrl = BookingPdfInput & { pdf_url: string | null };

// GET /api/booking-pdf/[code]
// Redirects to the persisted Vercel Blob PDF when available; otherwise
// renders the slip inline on-the-fly. Linked from the confirmation SMS so
// guests can grab proof of booking on their phone.
export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  const code = decodeURIComponent(params.code || '').trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ success: false, error: 'code required' }, { status: 400 });
  }

  const booking = await queryOne<RowWithPdfUrl>(
    `SELECT id, customer_name, customer_phone, customer_email, venue,
            reservation_date, reservation_time, guests,
            suite_name, check_in, check_out,
            booking_code, code_expires_at, amount, payment_status,
            razorpay_payment_id, razorpay_order_id, created_at,
            pdf_url
       FROM bookings
      WHERE UPPER(booking_code) = $1
      LIMIT 1`,
    [code],
  );

  if (!booking) {
    return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  }

  if (booking.pdf_url) {
    return NextResponse.redirect(booking.pdf_url, 302);
  }

  try {
    const bytes = await buildBookingPdf(booking);
    // Buffer copy keeps Next's response handler happy with a true ArrayBuffer.
    const body = new Uint8Array(bytes);
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="tressa-booking-${booking.booking_code}.pdf"`,
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (e: any) {
    console.error('[booking-pdf] generation failed:', e?.message || e);
    return NextResponse.json({ success: false, error: 'PDF generation failed' }, { status: 500 });
  }
}
