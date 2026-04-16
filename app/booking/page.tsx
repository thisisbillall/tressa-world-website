import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingClient from './BookingClient';
import { SITE } from '@/lib/seo';
import { breadcrumbSchema, faqSchema } from '@/lib/jsonld';

const title = 'Book a Table or Luxury Suite — Live 3D Reservation';
const description =
  'Reserve a table at TRESSA Restaurant, Rooftop or Bar, or book a luxury suite — directly from our interactive 3D floor plan. Real-time availability, four time slots (12 PM – 12 AM), instant confirmation.';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'book a table', 'restaurant reservation', 'rooftop reservation', 'bar reservation',
    'book a suite', 'luxury suite booking', 'online table booking', 'Tressa booking',
    'interactive 3D booking', 'private dining reservation'
  ],
  alternates: { canonical: `${SITE.url}/booking` },
  openGraph: {
    type: 'website',
    url: `${SITE.url}/booking`,
    title: `Book at ${SITE.name} — Interactive 3D`,
    description,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: `${SITE.name} booking` }]
  },
  twitter: {
    card: 'summary_large_image',
    title: `Book at ${SITE.name}`,
    description,
    images: [SITE.ogImage]
  },
  robots: { index: true, follow: true }
};

const bookingFaqs = [
  { q: 'What are the available time slots?', a: '12:00 PM – 3:00 PM, 3:00 PM – 5:00 PM, 5:00 PM – 8:00 PM, and 8:00 PM – 12:00 AM.' },
  { q: 'Is the 3D booking page mobile friendly?', a: 'Yes. You can drag to orbit, pinch to zoom, and tap any table or suite to zoom in and reserve.' },
  { q: 'Do I get instant confirmation?', a: 'Yes — every booking is confirmed instantly and a copy is sent to your email and phone.' }
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
        primaryImageOfPage: `${SITE.url}${SITE.ogImage}`,
        inLanguage: 'en-IN',
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
      {/* Hidden H1 for crawlers — the visual page is 3D */}
      <h1 className="sr-only">
        Book a table or a luxury suite at TRESSA World — interactive 3D reservation for restaurant, rooftop, bar and suites.
      </h1>
      <Suspense fallback={null}>
        <BookingClient />
      </Suspense>
    </>
  );
}
