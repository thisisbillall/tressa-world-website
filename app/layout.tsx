import type { Metadata, Viewport } from 'next';
import { Poppins, Playfair_Display } from 'next/font/google';
import './globals.css';
import TransitionProvider from '@/components/TransitionProvider';
import OfferBanner from '@/components/OfferBanner';
import ChatWidget from '@/components/ChatWidget';
import { SITE, keywords, VERIFICATION } from '@/lib/seo';
import {
  organizationSchema,
  websiteSchema,
  localBusinessSchema,
  restaurantSchema,
  hotelSchema,
  menuSchema,
  faqSchema,
  servicesSchema,
  DEFAULT_FAQS
} from '@/lib/jsonld';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-playfair',
  display: 'swap'
});

const title = `${SITE.name} — Rooftop Lounge, Family Restaurant, Bar & Luxury Suites in Pune`;
const ogTitle = `${SITE.name} — Rooftop · Restaurant · Bar · Suites in Pune`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: title,
    template: `%s | ${SITE.name}`
  },
  description: SITE.description,
  keywords,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: 'Hospitality',
  classification: 'Restaurant, Hotel, Bar, Lounge, Rooftop',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: SITE.url,
    languages: {
      'en-IN': SITE.url,
      'en-US': SITE.url,
      'en-GB': SITE.url,
      'x-default': SITE.url
    }
  },
  openGraph: {
    type: 'website',
    url: SITE.url,
    title: ogTitle,
    description: SITE.description,
    siteName: SITE.name,
    locale: SITE.defaultLocale,
    alternateLocale: SITE.alternateLocales,
    countryName: SITE.business.countryName
    // OG image auto-generated via app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    creator: SITE.twitter,
    title: ogTitle,
    description: SITE.shortDescription
    // Twitter image auto-generated via app/twitter-image.tsx
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
    google: VERIFICATION.google
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico'
  },
  manifest: '/manifest.webmanifest',
  other: {
    'geo.region': `${SITE.business.country}-${SITE.business.region}`,
    'geo.placename': `${SITE.business.city}, ${SITE.business.regionName}`,
    'geo.position': `${SITE.business.latitude};${SITE.business.longitude}`,
    ICBM: `${SITE.business.latitude}, ${SITE.business.longitude}`,
    'DC.title': title,
    'DC.type': 'Service',
    'DC.format': 'text/html',
    'DC.language': 'en-IN',
    rating: 'General',
    distribution: 'Global',
    'revisit-after': '7 days'
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
      localBusinessSchema(),
      restaurantSchema(),
      hotelSchema(),
      menuSchema(),
      faqSchema(DEFAULT_FAQS),
      ...servicesSchema()
    ]
  };

  return (
    <html
      lang="en-IN"
      className={`${poppins.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* Razorpay — warm up the connection so the checkout modal opens
            instantly after the booking POST returns, instead of waiting on
            a fresh TLS handshake + 50-100KB download. */}
        <link rel="preconnect" href="https://checkout.razorpay.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.razorpay.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
        <link rel="dns-prefetch" href="https://lumberjack.razorpay.com" />
        {/* Suite/room imagery — open the connection early so images load faster. */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* Meta Pixel — warm the connection so the fbevents.js script is fast. */}
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={SITE.shortName} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
        {/* Meta Pixel Code — placed at the bottom of <head> per Meta's install guide. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1942228859741625');fbq('track','PageView');`,
          }}
        />
        {/* End Meta Pixel Code */}
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Meta Pixel <noscript> fallback — must live in <body> for valid HTML. */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1942228859741625&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <OfferBanner />
        <TransitionProvider>{children}</TransitionProvider>
        <ChatWidget />
      </body>
    </html>
  );
}
