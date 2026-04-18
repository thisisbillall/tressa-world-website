'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useSiteContent } from '@/lib/siteContent';

export default function ParallaxQuote() {
  const [content] = useSiteContent();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-80, 80]);
  const o = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="relative min-h-[55vh] md:h-[70vh] py-20 md:py-0 flex items-center justify-center overflow-hidden bg-cream">
      <motion.div style={{ y }} className="absolute inset-0 grain" />
      <motion.div
        style={{ opacity: o }}
        className="relative z-10 text-center max-w-3xl px-6"
      >
        <p className="font-serif italic text-maroon text-xl sm:text-2xl md:text-4xl leading-relaxed font-light">
          “{content.quote.text}”
        </p>
        <p className="mt-6 sm:mt-8 text-[10px] tracking-[0.35em] sm:tracking-[0.5em] uppercase text-gold">— {content.quote.attr}</p>
      </motion.div>
    </section>
  );
}
