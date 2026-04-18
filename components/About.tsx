'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useSiteContent } from '@/lib/siteContent';
import { soul } from '@/lib/brandImages';

export default function About() {
  const [content] = useSiteContent();
  const { about } = content;
  return (
    <section id="about" className="py-20 md:py-32 px-6 md:px-[8%] overflow-hidden">
      <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="will-change-transform"
        >
          <p className="text-[11px] tracking-[0.5em] uppercase text-maroon mb-6">{about.label}</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light leading-tight text-ink mb-8">
            {about.title}
          </h2>
          <p className="text-sm md:text-[15px] leading-loose text-muted font-light mb-6">{about.p1}</p>
          <p className="text-sm md:text-[15px] leading-loose text-muted font-light">{about.p2}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative h-[340px] sm:h-[420px] md:h-[520px] group overflow-hidden will-change-transform"
        >
          <Image
            src={soul[0].src}
            alt={soul[0].alt}
            fill
            quality={85}
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={soul[0].blurDataURL}
            className="object-cover img-enhance transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-2 left-2 w-16 h-16 sm:w-24 sm:h-24 border-t border-l border-gold group-hover:top-4 group-hover:left-4 transition-all duration-500 z-10" />
          <div className="absolute bottom-2 right-2 w-16 h-16 sm:w-24 sm:h-24 border-b border-r border-gold group-hover:bottom-4 group-hover:right-4 transition-all duration-500 z-10" />
          <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 text-cream z-10 pr-4">
            <p className="text-[10px] tracking-[0.3em] uppercase opacity-80">Since 2018</p>
            <p className="font-serif text-xl sm:text-2xl mt-2">Hospitality, reimagined.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
