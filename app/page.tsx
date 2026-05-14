import type { Metadata } from 'next';
import SmoothScroll from '@/components/SmoothScroll';
import Preloader from '@/components/Preloader';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import MissionVision from '@/components/MissionVision';
import Spaces from '@/components/Spaces';
import VideoSection from '@/components/VideoSection';
import ParallaxQuote from '@/components/ParallaxQuote';
import Menu from '@/components/Menu';
import Gallery from '@/components/Gallery';
import FAQ from '@/components/FAQ';
import Marquee from '@/components/Marquee';
import Footer from '@/components/Footer';
import ScrollProgress from '@/components/ScrollProgress';
import StatsCounter from '@/components/StatsCounter';
import RooftopNight from '@/components/RooftopNight';
import { SITE, fullAddress } from '@/lib/seo';
import { breadcrumbSchema } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: `${SITE.name} — Rooftop Lounge, Family Restaurant, Bar & Luxury Suites in Pune`,
  description: SITE.description,
  alternates: {
    canonical: SITE.url,
    languages: {
      'en-IN': SITE.url,
      'en-US': SITE.url,
      'x-default': SITE.url
    }
  }
};

export default function Home() {
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbSchema([{ name: 'Home', url: SITE.url }]),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE.url}/#webpage`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        isPartOf: { '@id': `${SITE.url}/#website` },
        about: { '@id': `${SITE.url}/#localbusiness` },
        primaryImageOfPage: `${SITE.url}/opengraph-image`,
        inLanguage: 'en-IN',
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', 'h2', '#about p']
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: `${SITE.name} — A World of Experiences`,
        description: 'An evening at TRESSA World — rooftop lounge, fine dining restaurant, signature bar and luxury suites in Pune.',
        thumbnailUrl: [`${SITE.url}/images/sky/tressa-sky-rooftop-hero.png`],
        uploadDate: SITE.business.foundingDate,
        contentUrl: `${SITE.url}/videos/tressa-hero.mp4`,
        embedUrl: SITE.url,
        publisher: { '@id': `${SITE.url}/#organization` }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <Preloader />
      <SmoothScroll />
      <ScrollProgress />
      <Navbar />
      <main itemScope itemType="https://schema.org/Restaurant">
        <meta itemProp="name" content={SITE.name} />
        <meta itemProp="priceRange" content={SITE.business.priceRange} />
        <meta itemProp="telephone" content={SITE.business.phone} />
        <meta itemProp="address" content={fullAddress()} />

        {/* 1. Intro */}
        <Hero />
        <Marquee />

        {/* 2. Who we are */}
        <About />
        <MissionVision />

        {/* 3. What we offer */}
        <Spaces />
        {/* <VideoSection /> */}
        <Menu />

        {/* 4. Atmosphere / moments */}
        <RooftopNight />
        <Gallery />
        <ParallaxQuote />

        {/* 5. Trust & answers */}
        <StatsCounter />
        <FAQ />
      </main>
      <Footer />

      {/* Crawlable SEO copy — screen-reader accessible, search-engine-indexed */}
      <section className="sr-only" aria-label="About TRESSA World Pune">
        <h2>TRESSA World — Luxury Hospitality in Pune</h2>
        <p>
          TRESSA World is Pune&apos;s premier luxury hospitality destination, combining a rooftop
          lounge, a fine-dining family restaurant, a signature bar and a collection of curated
          luxury suites under one address in {SITE.business.neighborhood}. Book a table online at
          our restaurant, rooftop or bar with four daily time slots from 12 PM to midnight, or
          reserve a luxury suite with instant confirmation.
        </p>
        <h3>Services &amp; Experiences</h3>
        <ul>
          <li>Rooftop lounge reservations in {SITE.business.city}</li>
          <li>Family restaurant table booking with live availability</li>
          <li>Signature bar and craft cocktail reservations</li>
          <li>Luxury suite bookings — Royal, Garden and Heritage categories</li>
          <li>Private dining, banquets, weddings and corporate events</li>
          <li>Romantic dinners, anniversary celebrations and birthday parties</li>
        </ul>
        <h3>Cuisines</h3>
        <p>{SITE.business.servesCuisine.join(', ')}</p>
        <h3>Booking Time Slots</h3>
        <p>12:00 PM – 3:00 PM · 3:00 PM – 5:00 PM · 5:00 PM – 8:00 PM · 8:00 PM – 12:00 AM</p>
        <h3>Location</h3>
        <address>{fullAddress()}</address>
        <h3>Contact</h3>
        <p>
          Phone: <a href={`tel:${SITE.business.phone.replace(/\s/g, '')}`}>{SITE.business.phoneDisplay}</a>
          {' · '}
          Email: <a href={`mailto:${SITE.business.email}`}>{SITE.business.email}</a>
        </p>
      </section>
    </>
  );
}
