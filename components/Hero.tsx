'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import TressaLink from './TressaLink';
import { useSiteContent } from '@/lib/siteContent';

export default function Hero() {
  const [content] = useSiteContent();
  const { hero } = content;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section id="home" ref={ref} className="relative h-screen overflow-hidden flex items-center justify-center">
      <motion.div
        style={{ scale }}
        className="absolute inset-0 grain"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 50%, rgba(94,20,30,0.85), transparent 70%), radial-gradient(ellipse at 70% 30%, rgba(18,66,57,0.55), transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(227,171,50,0.15), transparent 50%), #5E141E'
          }}
        />
      </motion.div>

      <motion.div style={{ y, opacity }} className="relative z-10 text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.1 }}
          className="text-[11px] md:text-xs tracking-[0.5em] uppercase text-gold mb-6"
        >
          {hero.tagline}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 2.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-serif font-light text-cream leading-none tracking-[0.2em] md:tracking-[0.3em]"
          style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
        >
          {hero.title}
          <span className="sr-only"> — Rooftop Lounge, Family Restaurant, Signature Bar & Luxury Suites in Pune</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.7 }}
          className="text-[10px] md:text-xs tracking-[0.7em] uppercase text-cream/60 mt-6"
        >
          {hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 2.9 }}
          className="w-16 h-px bg-gold mx-auto my-8 origin-center"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <TressaLink href="/booking" className="btn-outline"><span>Reserve A Table</span></TressaLink>
          {/* Aura Suites under development — hide CTA until launch */}
          {/* <TressaLink href="/booking?venue=suites" className="btn-outline"><span>Book A Suite</span></TressaLink> */}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.4, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-cream/50">Scroll</span>
        <div className="w-px h-14 bg-gradient-to-b from-gold to-transparent animate-scrollPulse" />
      </motion.div>
    </section>
  );
}
