import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/seo';
import {
  BOOKING_CODE_GRACE_MIN,
  BOOKING_DISCOUNT_PERCENT,
  BOOKING_FEE_INR,
  PRIORITY_WINDOWS,
} from '@/lib/venueConfig';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Priority Booking terms for TRESSA World — ₹99 reservation (redeemable on total bill), 15% Tressa Pay discount on Exclusive slots, QR + booking code validity, and refund policy.',
  alternates: { canonical: `${SITE.url}/terms` },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '13 May 2026';

const PRIORITY_WINDOW_TEXT = PRIORITY_WINDOWS.map((w) => w.label).join(' and ');

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-ink text-cream/85 pt-28 md:pt-36 pb-20 px-5 sm:px-6 md:px-[8%]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] tracking-[0.5em] uppercase text-gold mb-3">Legal</p>
          <h1 className="font-serif text-4xl md:text-5xl text-cream mb-3">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs tracking-[0.2em] uppercase text-cream/40 mb-12">
            Last updated · {LAST_UPDATED}
          </p>

          <Section title="1. TRESSA Priority Booking — What you're paying for">
            <p>
              The booking flow at <code>tressaworld.com/booking</code> is a{' '}
              <strong>Priority Booking</strong> service. By paying the flat{' '}
              <strong>₹{BOOKING_FEE_INR} reservation fee</strong> you receive:
            </p>
            <List
              items={[
                'A held Exclusive or Premium slot at the selected TRESSA venue (Soul · Restaurant, Sky · Rooftop, or Unwind · Bar) for the date and 15-minute time you chose.',
                'A unique booking code (e.g. <code>TW-XXXXXX</code>) plus a QR image, delivered via SMS, the on-screen confirmation, and a downloadable PDF slip.',
                `When the booked time falls inside a priority window (${PRIORITY_WINDOW_TEXT}), a <strong>${BOOKING_DISCOUNT_PERCENT}% discount on the total bill</strong> — applied at billing via Tressa Pay only.`,
              ]}
            />
            <p>
              Walk-in seating is honoured separately and is not covered by these
              terms. Aura · Luxury Suites are currently not bookable through this
              flow.
            </p>
          </Section>

          <Section title="2. ₹99 reservation fee — non-refundable">
            <p>
              The ₹{BOOKING_FEE_INR} reservation fee is{' '}
              <strong>strictly non-refundable</strong> once a payment is captured
              successfully via Razorpay. This applies regardless of whether the
              booking falls inside a priority window, whether you arrive at the
              venue, or whether you ultimately use the {BOOKING_DISCOUNT_PERCENT}%
              discount.
            </p>
            <List
              items={[
                'No partial refunds for changes in party size, time, date, or venue.',
                'No refunds for no-shows or late arrivals past the QR / code expiry.',
                `No refunds if the customer chooses a time outside the priority windows (${PRIORITY_WINDOW_TEXT}) — the reservation is still held; only the ${BOOKING_DISCOUNT_PERCENT}% discount does not apply.`,
                'Failed or unverified payments do not create a booking and never charge the customer; abandoned pending bookings are released automatically after 5 minutes.',
              ]}
            />
            <p>
              Exceptions — described in section 5 — apply only when TRESSA cancels
              the slot.
            </p>
          </Section>

          <Section title={`3. ${BOOKING_DISCOUNT_PERCENT}% Tressa Pay discount`}>
            <p>
              When the booked time falls inside a priority window, the booking
              unlocks <strong>{BOOKING_DISCOUNT_PERCENT}% OFF</strong> the eligible
              portion of the bill. This is settled at the venue, at billing time,
              via Tressa Pay only.
            </p>
            <List
              items={[
                `Exclusive windows: <strong>${PRIORITY_WINDOW_TEXT}</strong>. Endpoints are inclusive — a 7:00 PM booking qualifies; a 7:30 PM booking does not.`,
                'Discount applies to food &amp; beverage (F&B) consumed during the same visit only. It does not apply to room tariffs, government taxes, gratuity, service charge, MRP-bound items, or any third-party charges.',
                'Discount is only honored when the bill is settled via <strong>Tressa Pay</strong>. Bills settled via cash, card, UPI, netbanking, or any other method are not eligible.',
                'Bookings outside the priority windows do not qualify for the discount even though the ₹99 reservation fee still applies.',
                'The booking code is single-use, tied to one billing session, non-transferable, cannot be split across bills, exchanged for cash, or combined with any other promotional offer, loyalty program, or third-party promotion (Zomato Gold, Swiggy One, DineOut, EazyDiner, etc.).',
                'Cancelled, expired, or unpaid bookings invalidate the code immediately.',
              ]}
            />
          </Section>

          <Section title="4. QR &amp; booking-code validity">
            <p>
              Each booking code and QR expires{' '}
              <strong>{BOOKING_CODE_GRACE_MIN} minutes after the booked time</strong>.
              For example, a 3:00 PM booking is valid until 3:15 PM IST.
            </p>
            <List
              items={[
                `Guests must arrive and present the QR (digitally or from the PDF slip) before expiry. The exact expiry timestamp is shown on the confirmation screen, the SMS, and the PDF slip.`,
                'Once expired, the slot is released, the discount is forfeited, and the ₹99 reservation fee is not refunded.',
                'Tampered, forged, screen-captured-from-another-customer, or expired codes will be rejected by venue staff.',
                'Codes are venue-bound: a code issued for Soul cannot be redeemed at Sky or Unwind, and vice versa.',
              ]}
            />
          </Section>

          <Section title="5. When TRESSA cancels — full refund">
            <p>
              If TRESSA closes the venue, cancels the slot, or otherwise prevents
              you from using a paid booking through no fault of yours, the full
              ₹{BOOKING_FEE_INR} reservation fee is refunded to the original
              payment method via Razorpay. Examples:
            </p>
            <List
              items={[
                'Severe weather closure or government-mandated shutdown.',
                'Unplanned operational closure (kitchen / facility incident, staff emergency, etc.).',
                'Overbooking on our part where we cannot accommodate the guest within a reasonable wait time.',
              ]}
            />
            <p>
              Refunds, where applicable, are routed back to the same card / UPI /
              netbanking account used to pay. Razorpay typically credits the
              amount within <strong>5–7 working days</strong>; some banks may take
              longer. For disputes, share the Razorpay reference when contacting
              us.
            </p>
          </Section>

          <Section title="6. Payments &amp; Razorpay">
            <p>
              Online payments are processed by Razorpay. By paying online you
              agree to Razorpay&apos;s terms and authorise TRESSA World to
              capture, refund, and store transaction references against your
              booking.
            </p>
            <List
              items={[
                'All amounts shown on the booking page are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.',
                'The PDF slip and the booking record include both the Razorpay <code>order_id</code> and <code>payment_id</code> for reconciliation and refund disputes.',
                'Bookings whose payment is not verified within the checkout window are marked pending and automatically released after 5 minutes — no charge is captured against the customer in that case.',
              ]}
            />
          </Section>

          <Section title="7. Conduct &amp; Right of Admission">
            <p>
              TRESSA World reserves the right of admission. Guests who are
              visibly intoxicated, disruptive, or in violation of venue rules may
              be asked to leave without a refund. Smoking is permitted only in
              designated areas. Pets are not allowed inside indoor dining areas.
              Holding a paid booking does not override the right of admission.
            </p>
          </Section>

          <Section title="8. Data, SMS &amp; PDF slip">
            <p>
              On confirmation, we send an SMS to the phone number you provided
              containing the booking code, QR-page link, and a PDF-slip link.
              The PDF slip is hosted on a CDN and may remain accessible at its
              URL after expiry for your records.
            </p>
            <List
              items={[
                'Provide an accurate phone number — the SMS is the primary delivery channel for the QR / code.',
                'TRESSA does not share the customer&apos;s contact details with third parties for marketing without consent.',
                'Razorpay, Twilio, and Vercel Blob are processors for payment, SMS, and PDF storage respectively.',
              ]}
            />
          </Section>

          <Section title="9. Liability">
            <p>
              We take reasonable care of property left at the venue, but do not
              accept liability for loss of personal belongings. Allergens are
              noted to the best of our ability — please inform our staff of any
              allergies before ordering. TRESSA&apos;s aggregate liability for any
              claim arising from a Priority Booking is limited to the ₹{BOOKING_FEE_INR}{' '}
              reservation fee paid.
            </p>
          </Section>

          <Section title="10. Changes to these Terms">
            <p>
              We may update these Terms from time to time. The version in force
              for any given booking is the one published on this page on the
              date the booking is paid. Continued use of our booking system
              after a change constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>For booking, refund, or general queries:</p>
            <ul className="space-y-1 mt-3 text-sm">
              <li>
                Email:{' '}
                <a href={`mailto:${SITE.business.email ?? ''}`} className="text-gold underline">
                  {SITE.business.email}
                </a>
              </li>
              <li>
                Reservations:{' '}
                <a href={`mailto:${SITE.business.reservationsEmail ?? ''}`} className="text-gold underline">
                  {SITE.business.reservationsEmail}
                </a>
              </li>
              <li>
                Phone:{' '}
                <a href={`tel:${(SITE.business.phone ?? '').replace(/\s/g, '')}`} className="text-gold underline">
                  {SITE.business.phone}
                </a>
              </li>
            </ul>
          </Section>

          <p className="mt-16 text-xs text-cream/40">
            By paying the ₹{BOOKING_FEE_INR} reservation fee you confirm that you
            have read and agree to these Terms &amp; Conditions, including the
            non-refundable nature of the fee and the {BOOKING_CODE_GRACE_MIN}-minute
            QR validity.{' '}
            <Link href="/" className="text-gold underline">Back to home</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2
        className="font-serif text-2xl md:text-3xl text-cream mb-4"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="space-y-3 text-sm md:text-[15px] leading-relaxed text-cream/75">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 marker:text-gold/60">
      {items.map((it, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
      ))}
    </ul>
  );
}
