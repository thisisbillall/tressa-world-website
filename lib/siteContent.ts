'use client';
// Site-wide editable content store.
// Persists to localStorage (demo). Swap the get/set functions for API calls
// when a real backend is ready — keep the schema identical.

import { useEffect, useState } from 'react';

export type Offer = {
  id: string;
  enabled: boolean;
  title: string;      // e.g. "Monsoon Feast — 20% off all suites"
  subtitle?: string;  // short line under title
  ctaLabel?: string;
  ctaHref?: string;
  expiresAt?: string; // ISO string — if past, offer is hidden
  bg: string;         // background color
  color: string;      // text color
  accent: string;     // cta/highlight color
};

export type FAQ = { id: string; q: string; a: string };

export type SpaceEdit = {
  id: 'rooftop' | 'restaurant' | 'bar' | 'suites';
  name: string;
  tagline: string;
  desc: string;
  img: string;
};

export type SuiteEdit = {
  id: string;
  tag: string;
  name: string;
  desc: string;
  rate: string;
  feat: string[];
  img: string;
};

export type Hero = {
  tagline: string;
  title: string;
  subtitle: string;
};

export type Contact = {
  phone: string;
  email: string;
  address: string;
  city: string;
  instagram: string;
  
};

export type MenuItem = { id: string; name: string; desc: string; price: string; img?: string };
export type MenuCategory = { id: string; name: string; items: MenuItem[] };

export type GalleryImage = { id: string; src: string; alt: string };

export type TimeSlotEdit = { id: string; label: string; start: string; end: string };

export type VideoEdit = {
  label: string;
  title: string;
  videoSrc: string;
  captionLabel: string;
  captionTitle: string;
  stats: { n: string; l: string }[];
};

export type QuoteEdit = { text: string; attr: string };

export type FooterHour = { id: string; label: string; value: string };

export type SiteContent = {
  offers: Offer[];
  faqs: FAQ[];
  hero: Hero;
  about: {
    label: string;
    title: string;
    p1: string;
    p2: string;
    mission: { label: string; title: string; body: string };
    vision: { label: string; title: string; body: string };
  };
  spaces: SpaceEdit[];
  suites: SuiteEdit[];
  menu: MenuCategory[];
  gallery: GalleryImage[];
  marquee: string[];
  quote: QuoteEdit;
  video: VideoEdit;
  footerHours: FooterHour[];
  timeSlots: TimeSlotEdit[];
  contact: Contact;
  seoTitle: string;
  seoDescription: string;
};

// ---------- defaults ----------

export const DEFAULT_CONTENT: SiteContent = {
  offers: [
    {
      id: 'welcome-offer',
      enabled: false,
      title: 'Grand Reopening · 20% off your first evening',
      subtitle: 'Use code TRESSA20 at checkout',
      ctaLabel: 'Book Now',
      ctaHref: '/booking',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      bg: '#5E141E',
      color: '#FCF1D6',
      accent: '#E3AB32'
    }
  ],
  faqs: [
    { id: 'f1', q: 'How do I book a table at TRESSA?', a: 'Use the Book page to pick your venue (Restaurant, The Sky or Bar), choose a time slot, and select a table from the interactive 3D floor plan.' },
    { id: 'f2', q: 'What time slots are available?', a: '12:00 PM – 3:00 PM, 3:00 PM – 5:00 PM, 5:00 PM – 8:00 PM, and 8:00 PM – 12:00 AM.' },
    { id: 'f3', q: 'Can I book a luxury suite online?', a: 'Aura, our suites collection, is currently under development. Please check back soon or contact us for early reservations.' },
    { id: 'f4', q: 'Do you host private events or banquets?', a: 'Yes. Contact us for private dining, corporate events and banquet bookings.' }
  ],
  hero: {
    tagline: 'The Sky · Bar · Restaurant · Suites',
    title: 'TRESSA',
    subtitle: 'A World of Experiences'
  },
  about: {
    label: 'Our Story',
    title: 'Where every moment is crafted with care.',
    p1: 'TRESSA is more than a destination — it is a world unto itself. From the sun-drenched rooftop lounge to the intimate family restaurant, our signature bar, and the quiet luxury of our suites, every space is composed to stir the senses.',
    p2: 'Rooted in warmth and elevated by detail, we celebrate the art of hospitality the way it was always meant to be — unhurried, generous, unforgettable.',
    mission: {
      label: 'Our Mission',
      title: 'To craft unforgettable moments, one guest at a time.',
      body: 'We exist to elevate everyday gatherings into lasting memories — through thoughtful service, sincere warmth, and spaces designed to slow time down. Every plate, every pour, every welcome is a quiet promise kept.'
    },
    vision: {
      label: 'Our Vision',
      title: 'To be the benchmark of warm, elevated hospitality.',
      body: 'A world where luxury feels personal, where family and celebration share the same table, and where TRESSA is the name remembered long after the evening ends — in India and beyond.'
    }
  },
  spaces: [
    { id: 'rooftop', name: 'The Sky', tagline: 'Skyline. Stars. Stories.', desc: 'Unwind above the city with cocktails, live acoustics and a view that never sleeps.', img: '/images/sky/tressa-sky-rooftop-hero.png' },
    { id: 'restaurant', name: 'Soul · Family Restaurant', tagline: 'Warmth on every plate.', desc: 'A global menu served with the heart of a home kitchen — designed for every generation.', img: '/images/venues/soul/tressa-soul-01.webp' },
    { id: 'bar', name: 'Unwind · Bar', tagline: 'Spirits, elevated.', desc: 'Rare labels, house-aged infusions and bartenders who remember your drink.', img: '/images/venues/unwind/tressa-unwind-01.webp' },
    { id: 'suites', name: 'Luxury Suites', tagline: 'Rest, re-imagined.', desc: 'Curated suites where quiet luxury meets thoughtful design — your private retreat.', img: '/images/cave-dining.jpg' }
  ],
  suites: [
    { id: 's1', tag: 'Signature', name: 'The Royal Suite', desc: 'A 1,200 sq.ft haven with private terrace and sunken tub.', rate: '₹ 28,000', feat: ['King Bed', 'Terrace', 'Butler'], img: '/images/cave-dining.jpg' },
    { id: 's2', tag: 'Premium', name: 'Garden Suite', desc: 'Verdant private garden with indoor-outdoor living.', rate: '₹ 18,500', feat: ['Garden', 'Spa Tub'], img: '/images/rooftop-terrace.jpg' },
    { id: 's3', tag: 'Classic', name: 'Heritage Suite', desc: 'Old-world charm meets modern comfort.', rate: '₹ 14,200', feat: ['Courtyard', 'Library'], img: '/images/private-dining.jpg' }
  ],
  menu: [
    {
      id: 'signatures', name: 'Signatures', items: [
        { id: 'm2', name: 'Royal Lamb Raan', desc: 'Slow-cooked tandoori platter, charred tikka & seekh, mint chutney, kachumber.', price: '₹ 1,240', img: '/images/carousel/tressa-tandoori-platter.jpg' },
        { id: 'm5', name: 'Gold Leaf Kulfi', desc: 'Warm gulab jamun on crisp vermicelli, saffron rabri, rose petals.', price: '₹ 480', img: '/images/carousel/tressa-gulab-jamun-rabri.jpg' },
        { id: 'm6', name: 'Chocolate Soufflé', desc: '70% dark chocolate dome, watermelon pearls, raspberry coulis, mint.', price: '₹ 520', img: '/images/carousel/tressa-chocolate-dome.jpg' }
      ]
    },
    {
      id: 'rooftop', name: 'The Sky', items: [
        { id: 'r3', name: 'Gin Garden', desc: 'Botanical matcha cooler, coconut-cream float, cocoa-rose dust.', price: '₹ 680', img: '/images/carousel/tressa-matcha-cocktail.jpg' },
        { id: 'r5', name: 'Sky Platter', desc: 'Chef’s selection of bruschetta, smoked skewers, chilli bites and crostini.', price: '₹ 990', img: '/images/carousel/tressa-starters-platter.jpg' }
      ]
    },
    {
      id: 'bar', name: 'Bar', items: [
        { id: 'b3', name: 'Espresso Martini', desc: 'Classic dry martini, brined olives, citrus twist.', price: '₹ 640', img: '/images/carousel/tressa-classic-martini.jpg' }
      ]
    }
  ],
  gallery: [
    { id: 'g1', src: '/images/sky/tressa-sky-rooftop-01.png', alt: 'TRESSA Sky rooftop lounge — evening panorama in Pune' },
    { id: 'g2', src: '/images/venues/soul/tressa-soul-02.webp', alt: 'TRESSA Soul family restaurant — elegant interior in Pune' },
    { id: 'g3', src: '/images/venues/unwind/tressa-unwind-02.webp', alt: 'TRESSA Unwind bar — signature cocktails and ambient lighting' },
    { id: 'g4', src: '/images/venues/soul/tressa-soul-03.webp', alt: 'TRESSA Soul — intimate dining moment' },
    { id: 'g5', src: '/images/sky/tressa-sky-rooftop-02.png', alt: 'TRESSA Sky rooftop — Pune skyline at golden hour' },
    { id: 'g6', src: '/images/venues/soul/tressa-soul-04.webp', alt: 'TRESSA Soul restaurant — table setting detail' },
    { id: 'g7', src: '/images/venues/unwind/tressa-unwind-03.webp', alt: 'TRESSA Unwind bar — crafted evenings' },
    { id: 'g8', src: '/images/sky/tressa-sky-rooftop-03.png', alt: 'TRESSA Sky terrace seating under the stars' }
  ],
  marquee: ['The Sky', 'Family Restaurant', 'Signature Bar', 'Luxury Suites', 'Private Dining', 'Banquet Hall'],
  quote: {
    text: 'A place where time slows down, flavors linger, and every guest becomes family.',
    attr: 'The Tressa Philosophy'
  },
  video: {
    label: 'Live The Experience',
    title: 'Step inside the TRESSA world.',
    videoSrc: '/videos/frame-20.mp4',
    captionLabel: 'Cinematic',
    captionTitle: 'An evening at Tressa is an experience composed frame by frame.',
    stats: [
      { n: '12+', l: 'Curated Experiences' },
      { n: '4', l: 'Signature Spaces' },
      { n: '50K+', l: 'Happy Guests' },
      { n: '24/7', l: 'Concierge' }
    ]
  },
  footerHours: [
    { id: 'h1', label: 'Restaurant', value: '11:00 – 23:30' },
    { id: 'h2', label: 'The Sky', value: '17:00 – 01:00' },
    { id: 'h3', label: 'Bar', value: '18:00 – 01:00' },
    { id: 'h4', label: 'Reception', value: '24 / 7' }
  ],
  timeSlots: [
    { id: 'evening', label: '3:00 PM – 7:00 PM', start: '15:00', end: '19:00' },
    { id: 'late', label: '10:00 PM – 12:00 AM', start: '22:00', end: '23:45' }
  ],
  contact: {
    phone: '+91 8600627270',
    email: 'operationstressa@gmail.com',
    address: 'Tressa Restaurant and Suites, Jarvari Rd, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027',
    city: 'Pune, India',
    instagram: 'https://www.instagram.com/tressa.experience?igsh=MTNpMXFibHB4bm54aA=='
  },
  seoTitle: 'TRESSA World — Rooftop Lounge, Family Restaurant, Bar & Luxury Suites',
  seoDescription:
    'An immersive hospitality destination featuring a rooftop lounge, award-winning family restaurant, signature bar and luxury suites.'
};

const KEY = 'tressa.siteContent.v1';

export function loadContent(): SiteContent {
  if (typeof window === 'undefined') return DEFAULT_CONTENT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONTENT;
    return { ...DEFAULT_CONTENT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function saveContent(c: SiteContent) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(c));
  window.dispatchEvent(new CustomEvent('tressa:content'));
}

export function resetContent() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('tressa:content'));
}

export function useSiteContent(): [SiteContent, (next: SiteContent) => void] {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);

  useEffect(() => {
    const sync = () => setContent(loadContent());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('tressa:content', sync as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('tressa:content', sync as any);
    };
  }, []);

  const update = (next: SiteContent) => {
    setContent(next);
    saveContent(next);
  };

  return [content, update];
}

// ---------- helpers ----------

export function activeOffer(offers: Offer[]): Offer | null {
  const now = Date.now();
  return (
    offers.find(
      (o) => o.enabled && (!o.expiresAt || new Date(o.expiresAt).getTime() > now)
    ) ?? null
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);
