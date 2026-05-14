'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';
import { useSiteContent } from '@/lib/siteContent';

export default function Menu() {
  const [content] = useSiteContent();
  const items = content.menu.flatMap((c) => c.items);

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgShift = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  return (
    <section
      ref={ref}
      id="menu"
      className="relative overflow-hidden bg-[#1a0810] text-cream py-20 md:py-30 px-5 sm:px-6 md:px-[8%]"
    >
      {/* ambient blur orbs — same as MissionVision */}
      <motion.div
        aria-hidden
        style={{ y: bgShift }}
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
      >
        <div className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full bg-gold blur-[120px]" />
        <div className="absolute -bottom-20 -right-20 w-[520px] h-[520px] rounded-full bg-maroon blur-[120px]" />
      </motion.div>
      <div className="grain absolute inset-0 pointer-events-none" />

      {/* ----- Header ----- */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative max-w-7xl mx-auto text-center mb-16 md:mb-20"
      >
        <p className="text-[10px] tracking-[0.4em] sm:tracking-[0.6em] uppercase text-gold mb-5">Culinary</p>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-light leading-[1.05]">
          The
          <span className="italic text-gold"> Curated </span>
          Menus
        </h2>
        <div className="mx-auto mt-8 flex items-center justify-center gap-3 text-gold/70">
          <span className="h-px w-10 bg-gold/50" />
          <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
          <span className="h-px w-10 bg-gold/50" />
        </div>
      </motion.header>

      {/* ----- Menu grid ----- */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-[1400px] mx-auto">
        {items.map((item, i) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -6 }}
            className="group relative bg-white/[0.035] backdrop-blur-[1px] border border-cream/10 flex flex-col transition-all duration-500 hover:border-gold/50 hover:bg-white/[0.06]"
          >
            {/* Gold corner ornaments */}
            <span className="pointer-events-none absolute -top-px -left-px h-6 w-6 border-t border-l border-gold/70 transition-all duration-500 group-hover:h-10 group-hover:w-10" />
            <span className="pointer-events-none absolute -bottom-px -right-px h-6 w-6 border-b border-r border-gold/70 transition-all duration-500 group-hover:h-10 group-hover:w-10" />

            {item.img && (
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  quality={95}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover img-enhance transition-transform duration-[1100ms] ease-out group-hover:scale-[1.07]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0810] via-[#1a0810]/40 to-transparent" />
                <span className="absolute top-4 left-4 text-[9px] tracking-[0.4em] uppercase text-cream bg-black/40 backdrop-blur-sm px-2.5 py-1 border border-gold/40">
                  Signature
                </span>
              </div>
            )}

            <div className="relative flex-1 p-5 sm:p-6 md:p-7">
              <h3 className="font-serif text-base sm:text-lg md:text-[19px] font-medium text-cream leading-snug break-words">
                {item.name}
              </h3>

              <p className="mt-3 text-[13px] leading-relaxed text-cream/60 font-light italic">
                {item.desc}
              </p>

              <div className="mt-5 flex items-center gap-2 text-gold/80 transition-opacity duration-500 opacity-60 group-hover:opacity-100">
                <span className="h-px w-5 bg-gold/70 transition-all duration-500 group-hover:w-10" />
                <span className="text-[9px] tracking-[0.4em] uppercase">Chef&apos;s Pick</span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
