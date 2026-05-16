import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { queryOne } from '@/lib/db';
import {
  BOOKING_DISCOUNT_PERCENT,
  formatBookingTime,
  isPriorityTime,
  PRIORITY_WINDOWS,
} from '@/lib/venueConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-customer confirmation page — contains booking PII and a one-shot code.
// Never index it: any crawler-cached copy is both useless (codes expire) and
// a privacy risk.
export const metadata: Metadata = {
  title: 'Booking Confirmation',
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
};

type BookingRow = {
  id: string;
  customer_name: string;
  venue: 'bar' | 'restaurant' | 'rooftop' | 'suite';
  reservation_date: string | null;
  reservation_time: string | null;
  slot_id: string | null;
  guests: number | null;
  suite_name: string | null;
  check_in: string | null;
  check_out: string | null;
  booking_code: string;
  code_expires_at: string | null;
  amount: string | number;
  payment_status: string;
};

const VENUE_LABEL: Record<BookingRow['venue'], string> = {
  bar: 'Unwind · Bar',
  restaurant: 'Soul · Restaurant',
  rooftop: 'Sky · Rooftop',
  suite: 'Aura · Suite',
};

function fmtDate(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtExpiry(value: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return value;
  }
}

export default async function BookingQrPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || '').trim().toUpperCase();
  if (!code) notFound();

  const booking = await queryOne<BookingRow>(
    `SELECT id, customer_name, venue, reservation_date, reservation_time, slot_id,
            guests, suite_name, check_in, check_out, booking_code, code_expires_at,
            amount, payment_status
       FROM bookings
      WHERE UPPER(booking_code) = $1
      LIMIT 1`,
    [code],
  );

  if (!booking) notFound();

  const isSuite = booking.venue === 'suite';
  const reservationHHMM = booking.reservation_time ? booking.reservation_time.slice(0, 5) : null;
  const timeLabel = reservationHHMM ? formatBookingTime(reservationHHMM) : '';
  const priority = !isSuite && isPriorityTime(reservationHHMM);
  const now = Date.now();
  const expiryMs = booking.code_expires_at ? new Date(booking.code_expires_at).getTime() : null;
  const expired = !isSuite && expiryMs != null && expiryMs < now;
  const qrSrc = `/api/qr/${encodeURIComponent(booking.booking_code)}?size=420`;
  const amount = Number(booking.amount) || 0;

  return (
    <main className="min-h-screen bg-[#fdf8ea] text-ink px-5 py-10 md:py-16">
      <div className="max-w-md mx-auto bg-white border border-maroon/15 shadow-[0_20px_60px_rgba(94,20,30,0.08)]">
        <header className="px-6 pt-8 pb-5 border-b border-maroon/10 text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase text-maroon">TRESSA · Priority Booking</p>
          <h1 className="font-serif text-3xl md:text-4xl font-light mt-2 text-ink">
            {VENUE_LABEL[booking.venue]}
          </h1>
          <p className="mt-3 text-sm text-muted">Hi {booking.customer_name.split(' ')[0]},</p>
        </header>

        <div className="p-6 text-center">
          {expired ? (
            <div className="bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm">
              This QR / code has expired.{priority ? ` Please make a fresh booking to claim the ${BOOKING_DISCOUNT_PERCENT}% bill discount.` : ''}
            </div>
          ) : (
            <div className="inline-block bg-white border border-maroon/15 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`QR for ${booking.booking_code}`} width={300} height={300} className="block w-[260px] h-[260px] md:w-[300px] md:h-[300px]" />
            </div>
          )}

          <p className="mt-5 font-mono text-2xl tracking-[0.25em] text-maroon">
            {booking.booking_code}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-left">
            {isSuite ? (
              <>
                <Cell label="Suite" value={booking.suite_name ?? ''} />
                <Cell label="Check-in" value={fmtDate(booking.check_in)} />
                <Cell label="Check-out" value={fmtDate(booking.check_out)} />
                <Cell label="Guests" value={String(booking.guests ?? '')} />
              </>
            ) : (
              <>
                <Cell label="Date" value={fmtDate(booking.reservation_date)} />
                <Cell label="Time" value={timeLabel || booking.reservation_time || ''} />
                <Cell label="Guests" value={String(booking.guests ?? '')} />
                <Cell label="Reservation" value={amount ? `₹${amount.toLocaleString('en-IN')}` : '—'} />
              </>
            )}
          </dl>

          {!isSuite && priority && (
            <div className="mt-6 bg-gold/10 border border-gold/40 px-4 py-3 text-left">
              <p className="text-[10px] tracking-[0.3em] uppercase text-maroon font-medium">
                Tressa Exclusive Benefit
              </p>
              <p className="mt-1.5 text-[12px] text-ink leading-relaxed">
                Show this QR / code at the venue and get{' '}
                <strong>{BOOKING_DISCOUNT_PERCENT}% OFF</strong> on the total bill via
                Tressa Pay — better than Zomato or Swiggy. Your ₹{amount.toLocaleString('en-IN')} booking
                amount is redeemed against your total billing at the venue.
              </p>
            </div>
          )}

          {!isSuite && !priority && (
            <div className="mt-6 bg-cream/40 border border-maroon/15 px-4 py-3 text-left">
              <p className="text-[10px] tracking-[0.3em] uppercase text-maroon font-medium">
                Premium booking
              </p>
              <p className="mt-1.5 text-[12px] text-ink leading-relaxed">
                Your slot is held at the venue. The {BOOKING_DISCOUNT_PERCENT}% bill discount applies only for
                Exclusive slots in {PRIORITY_WINDOWS.map((w) => w.label).join(' or ')}. Your
                ₹{amount.toLocaleString('en-IN')} booking amount is redeemed against your total billing at the venue.
              </p>
            </div>
          )}

          {!isSuite && booking.code_expires_at && (
            <p className={`mt-4 text-[11px] tracking-[0.2em] uppercase ${expired ? 'text-red-600' : 'text-muted'}`}>
              {expired ? 'Expired' : 'Valid till'} {fmtExpiry(booking.code_expires_at)}
            </p>
          )}
        </div>

        <div className="px-6 pb-6">
          <a
            href={`/api/booking-pdf/${encodeURIComponent(booking.booking_code)}`}
            target="_blank"
            rel="noopener"
            className="block w-full text-center px-5 py-3 text-[11px] tracking-[0.3em] uppercase bg-gold text-maroon hover:bg-maroon hover:text-cream transition-colors"
          >
            Download Slip (PDF)
          </a>
        </div>

        <footer className="px-6 py-5 border-t border-maroon/10 flex items-center justify-between text-[10px] tracking-[0.3em] uppercase">
          <Link href="/" className="text-maroon hover:text-gold transition-colors">← Home</Link>
          <Link href="/booking" className="text-maroon hover:text-gold transition-colors">New booking</Link>
        </footer>
      </div>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-maroon/10 px-3 py-2">
      <p className="text-[9px] tracking-[0.3em] uppercase text-muted">{label}</p>
      <p className="text-sm text-ink mt-0.5 truncate">{value || '—'}</p>
    </div>
  );
}
