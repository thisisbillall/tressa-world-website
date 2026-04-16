import type { Metadata, Viewport } from 'next';
import { Poppins, Playfair_Display } from 'next/font/google';
import './globals.css';
import TransitionProvider from '@/components/TransitionProvider';
import OfferBanner from '@/components/OfferBanner';
import { SITE, keywords } from '@/lib/seo';
import {
  organizationSchema,
  websiteSchema,
  restaurantSchema,
  hotelSchema,
  menuSchema,
  faqSchema,
  DEFAULT_FAQS
} from '@/lib/jsonld';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Rooftop Lounge, Family Restaurant, Bar & Luxury Suites`,
    template: `%s | ${SITE.name}`
  },
  description: SITE.description,
  keywords,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: 'Hospitality',
  classification: 'Restaurant, Hotel, Bar, Lounge',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: SITE.url,
    languages: {
      'en-IN': SITE.url,
      'en-US': SITE.url,
      'x-default': SITE.url
    }
  },
  openGraph: {
    type: 'website',
    url: SITE.url,
    title: `${SITE.name} — Rooftop · Restaurant · Bar · Suites`,
    description: SITE.description,
    siteName: SITE.name,
    locale: SITE.defaultLocale,
    alternateLocale: SITE.alternateLocales,
    images: [
      { url: SITE.ogImage, width: 1200, height: 630, alt: `${SITE.name} — luxury hospitality destination`, type: 'image/jpeg' }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    creator: SITE.twitter,
    title: `${SITE.name} — Rooftop · Restaurant · Bar · Suites`,
    description: 'Book tables, reserve luxury suites, explore our menu — instant online confirmation.',
    images: [SITE.ogImage]
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  },
  verification: {
    google: 'REPLACE_WITH_GOOGLE_SITE_VERIFICATION',
    yandex: undefined,
    other: { 'facebook-domain-verification': [] }
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
  manifest: '/manifest.webmanifest',
  other: {
    'geo.region': `${SITE.business.country}-${SITE.business.region}`,
    'geo.placename': SITE.business.city,
    'geo.position': `${SITE.business.latitude};${SITE.business.longitude}`,
    ICBM: `${SITE.business.latitude}, ${SITE.business.longitude}`
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCF1D6' },
    { media: '(prefers-color-scheme: dark)', color: SITE.themeColor }
  ],
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(),
      websiteSchema(),
      restaurantSchema(),
      hotelSchema(),
      menuSchema(),
      faqSchema(DEFAULT_FAQS)
    ]
  };

  return (
    <html lang="en-IN" className={`${poppins.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      </head>
      <body className="font-sans antialiased">
        <OfferBanner />
        <TransitionProvider>{children}</TransitionProvider>
      </body>
    </html>
  );
}
