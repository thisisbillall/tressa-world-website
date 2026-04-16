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
import Suites from '@/components/Suites';
import Gallery from '@/components/Gallery';
import FAQ from '@/components/FAQ';
import Booking from '@/components/Booking';
import Marquee from '@/components/Marquee';
import Footer from '@/components/Footer';
import ScrollProgress from '@/components/ScrollProgress';
import StatsCounter from '@/components/StatsCounter';
import RooftopNight from '@/components/RooftopNight';

export default function Home() {
  return (
    <>
      <Preloader />
      <SmoothScroll />
      <ScrollProgress />
      <Navbar />
      <main>
        {/* 1. Intro */}
        <Hero />
        <Marquee />

        {/* 2. Who we are */}
        <About />
        <MissionVision />

        {/* 3. What we offer */}
        <Spaces />
        <VideoSection />
        <Menu />
        {/* Suites (Aura) — under development, hidden for now */}
        {/* <Suites /> */}

        {/* 4. Atmosphere / moments */}
        <RooftopNight />
        <Gallery />
        <ParallaxQuote />

        {/* 5. Trust & answers */}
        <StatsCounter />
        <FAQ />
        {/* <Booking /> */}
      </main>
      <Footer />
      {/* Crawlable SEO copy — invisible to users, read by search engines */}
      <section aria-hidden="true" className="sr-only">
        <h2>About TRESSA World</h2>
        <p>
          TRESSA World is a luxury hospitality destination in Pune, India, combining a rooftop lounge,
          a fine-dining family restaurant, a signature bar and a collection of curated luxury suites
          under one address. Book a table online at our restaurant, rooftop or bar with four daily
          time slots from 12 PM to midnight, or reserve a luxury suite with instant confirmation.
        </p>
        <h3>Services</h3>
        <ul>
          <li>Rooftop lounge reservations in Pune</li>
          <li>Family restaurant table booking with live availability</li>
          <li>Signature bar and cocktail reservations</li>
          <li>Luxury suite bookings — Royal, Garden and Heritage categories</li>
          <li>Private dining, banquets and corporate events</li>
        </ul>
        <h3>Booking Time Slots</h3>
        <p>12:00 PM – 3:00 PM · 3:00 PM – 5:00 PM · 5:00 PM – 8:00 PM · 8:00 PM – 12:00 AM</p>
      </section>
    </>
  );
}
