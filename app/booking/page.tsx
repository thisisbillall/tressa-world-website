import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingClient from './BookingClient';
import { SITE } from '@/lib/seo';
import { breadcrumbSchema, faqSchema } from '@/lib/jsonld';

const title = 'Priority Booking at TRESSA Pune — 15% Off Bill, Rs. 99 Reservation';
const description =
  'Reserve your Exclusive slot at TRESSA Soul, Sky or Unwind in Pune. Pick any 15-minute window between 3 PM and 11 PM, pay ₹99 (redeemed on your total billing at the venue) and get a QR + booking code. 15% OFF on the total bill (via Tressa Pay, better than Zomato or Swiggy) applies only for bookings in 3:00 PM – 7:00 PM or 10:00 PM – 11:00 PM (Exclusive).';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'book a table Pune', 'restaurant reservation Pune', 'rooftop reservation Pune',
    'bar reservation Pune', 'book a suite Pune', 'luxury suite booking Pune',
    'online table booking', 'Tressa booking', 'interactive 3D booking',
    'private dining reservation Pune', 'rooftop lounge booking Pune',
    'family restaurant booking Pune', 'reservations Koregaon Park',
    'TRESSA World reservation', 'book rooftop online'
  ],
  alternates: {
    canonical: `${SITE.url}/booking`,
    languages: {
      'en-IN': `${SITE.url}/booking`,
      'en-US': `${SITE.url}/booking`,
      'x-default': `${SITE.url}/booking`
    }
  },
  openGraph: {
    type: 'website',
    url: `${SITE.url}/booking`,
    title: `Book at ${SITE.name} — Interactive 3D Reservation`,
    description,
    siteName: SITE.name,
    locale: SITE.defaultLocale
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    creator: SITE.twitter,
    title: `Book at ${SITE.name}`,
    description
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  }
};

const bookingFaqs = [
  { q: 'What are the available booking times?', a: 'Pick any 15-minute time between 3:00 PM and 11:00 PM — for example 3:00, 3:15, 3:30, 3:45, 4:00, and so on.' },
  { q: 'When does the 15% Tressa Pay discount apply?', a: 'Only when your booking time falls inside an Exclusive slot — 3:00 PM – 7:00 PM or 10:00 PM – 11:00 PM (endpoints included). 7:00 PM qualifies; 7:15 PM does not.' },
  { q: 'How much is the booking fee?', a: '₹99 per reservation. The full ₹99 is redeemed on your total billing at the venue, so you pay nothing extra to reserve. The 15% discount only applies in Exclusive windows.' },
  { q: 'What do I get in return?', a: 'A unique QR + booking code on SMS. Show it at the venue billing during an Exclusive slot to get 15% OFF on the total bill via Tressa Pay — better than Zomato or Swiggy. Your ₹99 booking amount is also redeemed against your total booking.' },
  { q: 'When does my QR expire?', a: 'It is valid up to 15 minutes after your booking time. Please arrive on time so the discount can be honored.' }
];

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbSchema([
        { name: 'Home', url: SITE.url },
        { name: 'Book', url: `${SITE.url}/booking` }
      ]),
      faqSchema(bookingFaqs),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE.url}/booking#webpage`,
        url: `${SITE.url}/booking`,
        name: title,
        description,
        isPartOf: { '@id': `${SITE.url}/#website` },
        about: { '@id': `${SITE.url}/#localbusiness` },
        inLanguage: 'en-IN',
        breadcrumb: { '@id': `${SITE.url}/booking#breadcrumb` },
        potentialAction: [
          {
            '@type': 'ReserveAction',
            name: 'Reserve a table',
            target: `${SITE.url}/booking`,
            result: { '@type': 'FoodEstablishmentReservation' }
          },
          {
            '@type': 'ReserveAction',
            name: 'Book a suite',
            target: `${SITE.url}/booking?venue=suites`,
            result: { '@type': 'LodgingReservation' }
          }
        ]
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">
        TRESSA Priority Booking Pune — Rs. 99 reservation (redeemed on total booking) for 15% OFF total bill at Soul, Sky and Unwind
      </h1>
      <Suspense fallback={null}>
        <BookingClient />
      </Suspense>
    </>
  );
}
