// Single source of truth for SEO values. Update the business details here
// and they will flow into metadata, JSON-LD and sitemap.

export const SITE = {
  url: 'https://tressaworld.com',
  name: 'TRESSA World',
  shortName: 'TRESSA',
  tagline: 'Rooftop · Restaurant · Bar · Suites',
  description:
    'TRESSA World is a luxury hospitality destination with a rooftop lounge, fine-dining family restaurant, signature bar and curated suites. Reserve a table or book a suite online with real-time availability.',
  locale: 'en_IN',
  defaultLocale: 'en_US',
  alternateLocales: ['en_IN', 'en_GB'],
  themeColor: '#5E141E',
  twitter: '@tressaworld',
  ogImage: '/og.jpg',

  business: {
    legalName: 'TRESSA Hospitality Pvt. Ltd.',
    phone: '+91-00000-00000',
    email: 'hello@tressaworld.com',
    priceRange: '₹₹₹',
    currency: 'INR',
    street: 'TRESSA World Lane',
    city: 'Pune',
    region: 'MH',
    postal: '411001',
    country: 'IN',
    latitude: 18.5204,
    longitude: 73.8567,
    openingHours: [
      { days: ['Mo', 'Tu', 'We', 'Th', 'Su'], opens: '11:00', closes: '23:30', name: 'Restaurant' },
      { days: ['Fr', 'Sa'], opens: '11:00', closes: '00:30', name: 'Restaurant' },
      { days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], opens: '17:00', closes: '01:00', name: 'Rooftop' },
      { days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], opens: '18:00', closes: '01:00', name: 'Bar' }
    ],
    social: [
      'https://www.instagram.com/tressaworld',
      'https://www.facebook.com/tressaworld',
      'https://twitter.com/tressaworld'
    ]
  }
};

export const keywords = [
  // brand
  'Tressa', 'Tressa World', 'Tressa Restaurant', 'Tressa Suites', 'Tressa Rooftop', 'Tressa Bar',
  // intent
  'book a table online', 'restaurant reservation', 'rooftop booking', 'luxury suite booking',
  'private dining booking', 'bar reservation', 'banquet hall booking',
  // services
  'fine dining restaurant', 'family restaurant', 'rooftop lounge', 'signature bar',
  'boutique suites', 'luxury hotel suites', 'romantic dinner', 'corporate dining',
  // location
  'restaurant in Pune', 'best rooftop Pune', 'luxury suites Pune', 'family restaurant Pune',
  'bar in Pune', 'fine dining Pune', 'best rooftop lounge'
];
