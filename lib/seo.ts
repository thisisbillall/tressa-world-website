// Single source of truth for SEO values. Update the business details here
// and they will flow into metadata, JSON-LD and sitemap.

export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tressaworld.com',
  name: 'TRESSA World',
  shortName: 'TRESSA',
  tagline: 'Rooftop · Restaurant · Bar · Suites',
  description:
    'TRESSA World — Pune\'s luxury hospitality destination. A rooftop lounge, fine-dining family restaurant, signature bar and curated suites under one address. Reserve a table or book a suite online with instant confirmation and real-time availability.',
  shortDescription:
    'Rooftop lounge, family restaurant, signature bar and luxury suites in Pune. Book online with instant confirmation.',
  locale: 'en_IN',
  defaultLocale: 'en_IN',
  alternateLocales: ['en_US', 'en_GB'],
  themeColor: '#5E141E',
  twitter: '@tressaworld',
  // Dynamically generated via app/opengraph-image.tsx when `/og.jpg` is missing.
  ogImage: '/og.jpg',

  business: {
    legalName: 'TRESSA Hospitality Pvt. Ltd.',
    foundingDate: '2026-02-01',
    phone: '+91 8600627270',
    phoneDisplay: '+91 8600627270',
    whatsapp: '+91 8600627270',
    email: 'operationstressa@gmail.com',
    reservationsEmail: 'reservations@tressaworld.com',
    priceRange: '₹₹₹',
    currency: 'INR',
    paymentAccepted: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'],
    street: 'TRESSA World Lane',
    neighborhood: 'Koregaon Park',
    city: 'Pune',
    region: 'MH',
    regionName: 'Maharashtra',
    postal: '411001',
    country: 'IN',
    countryName: 'India',
    latitude: 18.5362,
    longitude: 73.8939,
    mapUrl: 'https://maps.google.com/?q=TRESSA+World+Pune',
    servesCuisine: ['Indian', 'North Indian', 'Continental', 'Pan-Asian', 'Mediterranean', 'Fusion'],
    services: [
      'Rooftop Lounge Reservations',
      'Fine-Dining Family Restaurant',
      'Signature Bar & Cocktails',
      'Luxury Suite Bookings',
      'Private Dining & Banquet Halls',
      'Corporate Events',
      'Weddings & Celebrations'
    ],
    openingHours: [
      { days: ['Mo', 'Tu', 'We', 'Th', 'Su'], opens: '11:00', closes: '23:30', name: 'Restaurant' },
      { days: ['Fr', 'Sa'], opens: '11:00', closes: '00:30', name: 'Restaurant' },
      { days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], opens: '17:00', closes: '01:00', name: 'Rooftop' },
      { days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], opens: '18:00', closes: '01:00', name: 'Bar' }
    ],
    social: [
      'https://www.instagram.com/tressa.experience',
      'https://www.facebook.com/tressaworld',
      'https://twitter.com/tressaworld',
      'https://www.linkedin.com/company/tressaworld'
    ]
  }
};

export function fullAddress() {
  const b = SITE.business;
  return `${b.street}, ${b.neighborhood}, ${b.city} ${b.postal}, ${b.regionName}, ${b.countryName}`;
}

export const VERIFICATION = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
};

export const keywords = [
  // brand
  'Tressa', 'Tressa World', 'Tressa Pune', 'Tressa World Pune',
  'Tressa Restaurant', 'Tressa Rooftop', 'Tressa Bar', 'Tressa Suites', 'Tressa Sky',
  // high-intent (bookings)
  'book a table online Pune', 'restaurant reservation Pune', 'rooftop booking Pune',
  'luxury suite booking Pune', 'private dining booking Pune', 'bar reservation Pune',
  'banquet hall booking Pune', 'family restaurant booking Pune', 'online table booking',
  'rooftop reservation Koregaon Park', 'best rooftop to book in Pune',
  // services
  'fine dining restaurant Pune', 'family restaurant Pune', 'rooftop lounge Pune',
  'signature bar Pune', 'boutique suites Pune', 'luxury hotel suites Pune',
  'romantic dinner Pune', 'corporate dining Pune', 'wedding venue Pune',
  'private dining Pune', 'birthday party venue Pune', 'anniversary dinner Pune',
  'date night restaurant Pune', 'cocktail bar Pune', 'craft cocktails Pune',
  // location + discovery
  'restaurants near me Pune', 'best rooftop Pune', 'luxury hotel Pune',
  'Koregaon Park restaurant', 'Pune fine dining', 'Pune hospitality',
  'best rooftop lounge', 'best rooftop in Maharashtra',
  // experience
  'romantic rooftop Pune', 'sunset dinner Pune', 'rooftop cocktails Pune',
  'live music bar Pune', 'luxury dining experience Pune'
];
