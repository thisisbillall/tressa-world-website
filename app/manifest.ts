import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Rooftop · Restaurant · Bar · Suites`,
    short_name: SITE.shortName,
    description: SITE.shortDescription,
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    background_color: '#FCF1D6',
    theme_color: SITE.themeColor,
    orientation: 'any',
    dir: 'ltr',
    lang: 'en-IN',
    categories: ['food', 'lifestyle', 'travel', 'business'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
    ],
    shortcuts: [
      {
        name: 'Book a Table',
        short_name: 'Book Table',
        description: 'Reserve a table at Restaurant, Rooftop or Bar',
        url: '/booking?venue=restaurant',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: 'Rooftop Booking',
        short_name: 'Rooftop',
        description: 'Reserve your rooftop evening',
        url: '/booking?venue=rooftop',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: 'Bar Reservation',
        short_name: 'Bar',
        description: 'Reserve a seat at the bar',
        url: '/booking?venue=bar',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      }
    ]
  };
}
