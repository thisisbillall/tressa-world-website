import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingClient from './BookingClient';
import { SITE } from '@/lib/seo';
import { breadcrumbSchema, faqSchema } from '@/lib/jsonld';

const title = 'Book a Table or Luxury Suite in Pune — Live 3D Reservation';
const description =
  'Reserve a table at TRESSA Restaurant, Rooftop or Bar in Pune — or book a luxury suite — directly from our interactive 3D floor plan. Real-time availability, four daily time slots (12 PM – 12 AM), instant confirmation by email and SMS.';

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
  { q: 'What are the available time slots?', a: '12:00 PM – 3:00 PM, 3:00 PM – 5:00 PM, 5:00 PM – 8:00 PM, and 8:00 PM – 12:00 AM.' },
  { q: 'Is the 3D booking page mobile friendly?', a: 'Yes. You can drag to orbit, pinch to zoom, and tap any table or suite to zoom in and reserve.' },
  { q: 'Do I get instant confirmation?', a: 'Yes — every booking is confirmed instantly and a copy is sent to your email and phone.' },
  { q: 'Can I cancel or modify my booking?', a: 'Yes. Use the cancellation link in your confirmation email or call our reservations desk. Cancellations up to 2 hours before your slot are free.' },
  { q: 'Is there a booking fee?', a: 'No — reserving a table or suite online is completely free. You only pay for what you order on the day.' }
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
        Book a Table or Luxury Suite at TRESSA World Pune — Interactive 3D Reservation for Restaurant, Rooftop, Bar and Suites
      </h1>
      <Suspense fallback={null}>
        <BookingClient />
      </Suspense>
    </>
  );
}
