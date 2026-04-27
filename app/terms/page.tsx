import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Booking, payment, refund, and cancellation policies for TRESSA World — rooftop, restaurant, bar and luxury suites in Pune.',
  alternates: { canonical: `${SITE.url}/terms` },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '27 April 2026';

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

          <Section title="1. Bookings">
            <p>
              All reservations made through TRESSA World are subject to availability
              and confirmation. A booking is considered confirmed only after you
              receive a confirmation SMS containing a redeem code (e.g. <code>TR-XXXXXX</code>).
              Walk-in seating is honoured separately and is not covered by these terms.
            </p>
            <List
              items={[
                'Restaurant, Bar and Rooftop table reservations are free to make and held until 30 minutes after the slot start time.',
                'Suite (room) bookings require full prepayment via Razorpay at the time of booking.',
                'You must present the redeem code on arrival to claim the discount and to confirm identity.',
              ]}
            />
          </Section>

          <Section title="2. Discounts &amp; Redeem Code">
            <p>
              Each confirmed booking generates a one-time redeem code. The code unlocks
              a discount of <strong>up to 15% OFF</strong> on the total bill, applied at the time
              of billing in the venue.
            </p>
            <List
              items={[
                'Up to 15% OFF — when the bill is settled via Tressa Pay AND the guest leaves a Google review at the table.',
                '12% OFF — when the bill is settled via Tressa Pay without a Google review.',
                '0% — bills paid via cash, card, or any payment method other than Tressa Pay are not eligible for the discount.',
                'The discount applies to food &amp; beverage (F&B) only. It does not apply to room tariffs, government taxes, gratuity, or third-party charges.',
                'The redeem code is single-use and tied to one billing session. It cannot be split across multiple bills, transferred, exchanged for cash, or combined with other promotional offers.',
                'Cancelled or expired bookings invalidate the code immediately.',
              ]}
            />
          </Section>

          <Section title="3. Payments">
            <p>
              Online payments are processed by Razorpay. By paying online you agree to
              Razorpay&apos;s terms and authorise TRESSA World to capture, refund, and
              store transaction references against your booking.
            </p>
            <List
              items={[
                'All amounts shown on the booking page are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.',
                'Suite bookings: the prepaid amount represents the room tariff for the selected stay. F&B consumed during your stay is billed separately at checkout.',
                'Failed or unverified payments result in the booking being marked as pending and released after 5 minutes.',
              ]}
            />
          </Section>

          <Section title="4. Cancellations &amp; Refunds">
            <p>
              You may request a cancellation by contacting us at{' '}
              <a href={`mailto:${SITE.business.email ?? ''}`} className="text-gold underline">
                {SITE.business.email}
              </a>{' '}
              or{' '}
              <a href={`tel:${(SITE.business.phone ?? '').replace(/\s/g, '')}`} className="text-gold underline">
                {SITE.business.phone}
              </a>
              . Refunds, where applicable, are processed only against the original
              payment method via Razorpay and typically reflect in your account within{' '}
              <strong>5–7 working days</strong>.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6 mb-3">4.1 Table reservations (Restaurant / Bar)</h3>
            <p>
              Restaurant and Bar reservations are free of charge. You may cancel any
              time. Failure to arrive within 30 minutes of the slot start may result
              in the table being released to walk-in guests.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6 mb-3">4.2 Rooftop (Sky)</h3>
            <p>
              Rooftop reservations carry a per-cover charge that is{' '}
              <strong>non-refundable</strong> once the booking is confirmed. This applies
              to both no-shows and customer-initiated cancellations. We reserve the right
              to relocate or cancel a rooftop reservation in the event of severe weather;
              in such cases a full refund will be initiated.
            </p>

            <h3 className="font-serif text-xl text-cream mt-6 mb-3">4.3 Suites (rooms)</h3>
            <List
              items={[
                'Cancellations made 48+ hours before check-in: full refund.',
                'Cancellations made within 48 hours of check-in: one night&apos;s tariff is retained; the balance is refunded.',
                'No-show: the full prepaid amount is forfeited.',
                'Early checkout: nights already consumed are billable; unused nights may be refunded at the manager&apos;s discretion.',
                'If the final settled bill is below the prepaid amount, the difference is automatically queued as a Razorpay refund and processed by the manager.',
              ]}
            />

            <h3 className="font-serif text-xl text-cream mt-6 mb-3">4.4 How refunds reach you</h3>
            <p>
              Approved refunds are routed back to the same card / UPI / netbanking
              account used to pay. Once initiated, you will receive an SMS containing
              the Razorpay reference. Razorpay typically credits the amount within 5–7
              working days; some banks may take longer. For disputes, please share the
              Razorpay reference when contacting us.
            </p>
          </Section>

          <Section title="5. Conduct &amp; Right of Admission">
            <p>
              TRESSA World reserves the right of admission. Guests who are visibly
              intoxicated, disruptive, or in violation of venue rules may be asked
              to leave without a refund. Smoking is permitted only in designated areas.
              Pets are not allowed inside indoor dining areas.
            </p>
          </Section>

          <Section title="6. Liability">
            <p>
              We take reasonable care of property left at the venue, but do not accept
              liability for loss of personal belongings. Allergens are noted to the best
              of our ability — please inform our staff of any allergies before ordering.
            </p>
          </Section>

          <Section title="7. Changes to these Terms">
            <p>
              We may update these Terms from time to time. The version in force is the
              one published on this page on the date of your booking. Continued use of
              our booking system after a change constitutes acceptance of the revised
              Terms.
            </p>
          </Section>

          <Section title="8. Contact">
            <p>
              For booking, refund, or general queries:
            </p>
            <ul className="space-y-1 mt-3 text-sm">
              <li>
                Email:{' '}
                <a href={`mailto:${SITE.business.email ?? ''}`} className="text-gold underline">
                  {SITE.business.email}
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
            By making a booking with TRESSA World you confirm that you have read and
            agree to these Terms &amp; Conditions.{' '}
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
