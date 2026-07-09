import type { Metadata } from 'next';
import { Suspense } from 'react';
import SuitesClient from './SuitesClient';
import { SITE } from '@/lib/seo';
import { breadcrumbSchema } from '@/lib/jsonld';

const title = 'Book a Premium Suite at TRESSA Pune — Luxury Rooms from ₹4,000/night';
const description =
  'Reserve one of TRESSA\'s 10 premium rooms in Pune. Instant online booking with secure payment, live availability and seasonal offers. King & twin rooms with AC, Wi-Fi, room service and skyline views.';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'luxury suite booking Pune', 'premium rooms Pune', 'hotel room booking Pune',
    'book a suite Pune', 'TRESSA suites', 'premium hotel Koregaon Park',
    'online room booking Pune', 'boutique hotel Pune',
  ],
  alternates: { canonical: `${SITE.url}/suites` },
  openGraph: {
    type: 'website',
    url: `${SITE.url}/suites`,
    title: `Premium Suites at ${SITE.name}`,
    description,
    siteName: SITE.name,
    locale: SITE.defaultLocale,
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    creator: SITE.twitter,
    title: `Premium Suites at ${SITE.name}`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbSchema([
        { name: 'Home', url: SITE.url },
        { name: 'Suites', url: `${SITE.url}/suites` },
      ]),
      {
        '@type': 'WebPage',
        '@id': `${SITE.url}/suites#webpage`,
        url: `${SITE.url}/suites`,
        name: title,
        description,
        isPartOf: { '@id': `${SITE.url}/#website` },
        inLanguage: 'en-IN',
        potentialAction: {
          '@type': 'ReserveAction',
          name: 'Book a suite',
          target: `${SITE.url}/suites`,
          result: { '@type': 'LodgingReservation' },
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="sr-only">TRESSA Premium Suites Pune — book luxury rooms online from ₹4,000 per night</h1>
      <Suspense fallback={null}>
        <SuitesClient />
      </Suspense>
    </>
  );
}
