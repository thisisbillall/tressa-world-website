'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useSiteContent } from '@/lib/siteContent';

export default function VideoSection() {
  const [content] = useSiteContent();
  const v = content.video;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.82, 1, 1.06]);
  const radius = useTransform(scrollYProgress, [0, 0.5], ['28px', '0px']);
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);

  return (
    <section id="experience" ref={ref} className="relative py-20 md:py-32 bg-cream/40 overflow-hidden">
      <div className="relative max-w-[1600px] mx-auto px-6 md:px-[6%]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center mb-12 md:mb-16"
        >
          <p className="text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] uppercase text-maroon mb-4">{v.label}</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-light text-ink leading-tight">{v.title}</h2>
        </motion.div>

        <motion.div style={{ scale, borderRadius: radius }} className="relative overflow-hidden shadow-[0_40px_120px_rgba(94,20,30,0.25)]">
          {v.videoSrc && (
            <video
              src={v.videoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`${v.title} — ${v.captionTitle}`}
              poster="/images/sky/tressa-sky-rooftop-hero.png"
              className="w-full h-[55vh] sm:h-[70vh] md:h-[90vh] object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          <motion.div style={{ y }} className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-auto md:bottom-16 md:left-16 text-cream max-w-md">
            <p className="text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{v.captionLabel}</p>
            <h3 className="font-serif text-xl sm:text-2xl md:text-4xl font-light leading-tight">{v.captionTitle}</h3>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mt-14 md:mt-20 text-center"
        >
          {v.stats.map((s, i) => (
            <div key={i} className="border-t border-maroon/15 pt-6">
              <p className="font-serif text-2xl sm:text-3xl md:text-5xl font-light text-maroon break-words">{s.n}</p>
              <p className="text-[9px] sm:text-[10px] tracking-[0.25em] sm:tracking-[0.35em] uppercase text-muted mt-2">{s.l}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
