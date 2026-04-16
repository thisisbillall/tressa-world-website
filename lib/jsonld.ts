import { SITE } from './seo';

const base = SITE.url;

const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: SITE.business.street,
  addressLocality: SITE.business.city,
  addressRegion: SITE.business.region,
  postalCode: SITE.business.postal,
  addressCountry: SITE.business.country
};

const geo = {
  '@type': 'GeoCoordinates',
  latitude: SITE.business.latitude,
  longitude: SITE.business.longitude
};

const hoursSpec = SITE.business.openingHours.map((h) => ({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: h.days,
  opens: h.opens,
  closes: h.closes,
  name: h.name
}));

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: SITE.name,
    legalName: SITE.business.legalName,
    url: base,
    logo: `${base}/logo.png`,
    image: `${base}${SITE.ogImage}`,
    email: SITE.business.email,
    telephone: SITE.business.phone,
    address: postalAddress,
    sameAs: SITE.business.social
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: base,
    name: SITE.name,
    description: SITE.description,
    publisher: { '@id': `${base}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    },
    inLanguage: 'en-IN'
  };
}

export function restaurantSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${base}/#restaurant`,
    name: `${SITE.name} Restaurant`,
    url: base,
    image: [`${base}${SITE.ogImage}`],
    telephone: SITE.business.phone,
    email: SITE.business.email,
    priceRange: SITE.business.priceRange,
    servesCuisine: ['Indian', 'Continental', 'Asian', 'Mediterranean'],
    acceptsReservations: 'https://schema.org/True',
    hasMenu: `${base}/#menu`,
    address: postalAddress,
    geo,
    openingHoursSpecification: hoursSpec,
    sameAs: SITE.business.social,
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Rooftop Lounge', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Bar', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Family Dining', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Luxury Suites', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Private Dining', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Valet Parking', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Wheelchair Accessible', value: true }
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '1240',
      bestRating: '5'
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/booking`,
        inLanguage: 'en-IN',
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform'
        ]
      },
      result: { '@type': 'FoodEstablishmentReservation', name: 'Table reservation' }
    }
  };
}

export function hotelSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    '@id': `${base}/#hotel`,
    name: `${SITE.name} Suites`,
    url: `${base}/#suites`,
    image: [`${base}${SITE.ogImage}`],
    telephone: SITE.business.phone,
    email: SITE.business.email,
    priceRange: SITE.business.priceRange,
    address: postalAddress,
    geo,
    starRating: { '@type': 'Rating', ratingValue: '5' },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Free Wi-Fi', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Room Service', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Butler', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Rooftop Access', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Airport Transfer', value: true }
    ],
    checkinTime: '14:00',
    checkoutTime: '11:00',
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/booking?venue=suites`,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform'
        ]
      },
      result: { '@type': 'LodgingReservation', name: 'Suite booking' }
    }
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

export const DEFAULT_FAQS = [
  { q: 'How do I book a table at TRESSA?', a: 'Use the Book page to pick your venue (Restaurant, Rooftop or Bar), choose a time slot between 12 PM and midnight, select an available table from the interactive 3D floor plan and confirm with your contact details.' },
  { q: 'What time slots are available for table reservations?', a: 'Four slots are offered every day: 12:00 PM – 3:00 PM, 3:00 PM – 5:00 PM, 5:00 PM – 8:00 PM and 8:00 PM – 12:00 AM.' },
  { q: 'Can I book a luxury suite online?', a: 'Yes. Switch to the Suites tab on the Book page, pick your suite and enter your check-in and check-out dates for instant confirmation.' },
  { q: 'Where is TRESSA World located?', a: `${SITE.name} is located in ${SITE.business.city}, ${SITE.business.region}, ${SITE.business.country}.` },
  { q: 'Do you host private events or banquets?', a: 'Yes. Get in touch via our contact details for private dining, corporate events and banquet bookings.' }
];

export function menuSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${base}/#menu`,
    name: `${SITE.name} Menu`,
    hasMenuSection: [
      {
        '@type': 'MenuSection',
        name: 'Signatures',
        hasMenuItem: [
          { '@type': 'MenuItem', name: 'Tressa Truffle Risotto', offers: { '@type': 'Offer', price: '780', priceCurrency: 'INR' } },
          { '@type': 'MenuItem', name: 'Royal Lamb Raan', offers: { '@type': 'Offer', price: '1240', priceCurrency: 'INR' } }
        ]
      },
      {
        '@type': 'MenuSection',
        name: 'Rooftop',
        hasMenuItem: [
          { '@type': 'MenuItem', name: 'Sunset Spritz', offers: { '@type': 'Offer', price: '620', priceCurrency: 'INR' } },
          { '@type': 'MenuItem', name: 'Smoked Old Fashioned', offers: { '@type': 'Offer', price: '740', priceCurrency: 'INR' } }
        ]
      }
    ]
  };
}
