'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';
import { sky, unwind } from '@/lib/brandImages';

export default function RooftopNight() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bigWordY = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);
  const heroY = useTransform(scrollYProgress, [0, 1], ['-4%', '8%']);

  return (
    <section
      ref={ref}
      id="rooftop"
      className="relative overflow-hidden text-cream py-24 md:py-32 px-6 md:px-[8%]"
      style={{
        background:
          'radial-gradient(80% 60% at 85% 0%, #5e141e 0%, transparent 60%),' +
          'radial-gradient(70% 50% at 10% 100%, #3a0d14 0%, transparent 55%),' +
          'linear-gradient(180deg,#10060a 0%,#1a0810 45%,#10060a 100%)'
      }}
    >
      {/* giant backdrop wordmark */}
      <motion.span
        aria-hidden
        style={{ y: bigWordY }}
        className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 font-serif italic text-transparent select-none whitespace-nowrap"
      >
        <span
          className="block text-[26vw] md:text-[22vw] leading-[0.8] tracking-tight"
          style={{ WebkitTextStroke: '1px rgba(227,171,50,0.12)' }}
        >
          the sky
        </span>
      </motion.span>

      {/* grain */}
      <div aria-hidden className="absolute inset-0 grain opacity-25 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* ============ TOP META ROW ============ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9 }}
          className="flex items-center justify-between text-[10px] md:text-[11px] tracking-[0.4em] uppercase text-gold/80 mb-10 md:mb-14"
        >
          <span className="font-serif italic">Chapter I</span>
          <span className="hidden md:inline-flex items-center gap-2">
            <span className="h-px w-8 bg-gold/50" />
            Tressa / After Dark
            <span className="h-px w-8 bg-gold/50" />
          </span>
          <span className="font-serif italic">MMXXVI</span>
        </motion.div>

        {/* ============ HERO EDITORIAL SPLIT ============ */}
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-end mb-20 md:mb-28">
          {/* Left: title block */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="md:col-span-5"
          >
            <CrescentMark />
            <h2 className="mt-8 font-serif text-6xl md:text-[92px] font-light leading-[0.95] tracking-tight text-cream">
              TRESSA
              <br />
              <span className="italic text-gold">SKY</span>
            </h2>
            <div className="mt-8 h-px w-20 bg-gold/70" />
            <p className="mt-6 text-[14px] md:text-[15px] text-cream/75 font-light leading-[1.9] max-w-md">
              A medley of earthy aromas, soft lighting, and soulful flavours — an evening at Tressa
              is as much about what you feel as what you taste.
            </p>
            <div className="mt-10 flex items-center gap-4 text-[10px] tracking-[0.4em] uppercase text-cream/60">
              <span className="font-serif italic text-gold/90">Est.</span>
              <span>2018</span>
              <span className="h-px w-10 bg-cream/20" />
              <span>Pune · India</span>
            </div>
          </motion.div>

          {/* Right: tall portrait image with floating price-ribbon */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ y: heroY }}
            className="md:col-span-7 relative group"
          >
            <div className="absolute -inset-3 border border-gold/30 pointer-events-none" />
            <div className="relative aspect-[5/6] md:aspect-[4/3] overflow-hidden">
              <Image
                src={sky[0].src}
                alt={sky[0].alt}
                fill
                quality={85}
                sizes="(max-width: 768px) 100vw, 60vw"
                placeholder="blur"
                blurDataURL={sky[0].blurDataURL}
                className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#10060a]/80 via-transparent to-transparent" />

              {/* ribbon */}
              <div className="absolute top-6 -left-3 bg-gold text-[#1a0810] px-6 py-2 font-serif italic text-[12px] tracking-[0.3em] uppercase shadow-[0_6px_30px_rgba(227,171,50,0.35)]">
                Signature Evenings
              </div>

              {/* side engraved caption */}
              <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10">
                <p className="font-serif italic text-[10px] md:text-[11px] tracking-[0.4em] uppercase text-gold/90 mb-3">
                  Sky Lounge · Top Floor
                </p>
                <p className="font-serif text-2xl md:text-4xl font-light leading-[1.15] text-cream max-w-xl">
                  Where every table holds a reason to smile.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ============ HORIZONTAL FILM STRIP ============ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 1 }}
          className="relative border-y border-gold/20 py-8 md:py-10 mb-20 md:mb-28"
        >
          <div className="flex items-center justify-between mb-6">
            <p className="font-serif italic text-[11px] tracking-[0.4em] uppercase text-gold/80">
              Moments & Scenes
            </p>
            <span className="text-[10px] tracking-[0.4em] uppercase text-cream/40">01 — 03</span>
          </div>

          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {[
              { img: sky[1], label: 'Lounge', caption: 'Softly lit, always inviting.' },
              { img: sky[2], label: 'Terrace', caption: 'Where the city slows down.' },
              { img: unwind[0], label: 'Unwind', caption: 'Spirits that linger.' }
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.9, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="group relative"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={s.img.src}
                    alt={s.img.alt}
                    fill
                    quality={80}
                    sizes="(max-width: 768px) 33vw, 25vw"
                    placeholder="blur"
                    blurDataURL={s.img.blurDataURL}
                    className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#10060a]/90 via-[#10060a]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-5">
                    <p className="font-serif italic text-[9px] md:text-[10px] tracking-[0.4em] uppercase text-gold mb-1">
                      {String(i + 1).padStart(2, '0')} · {s.label}
                    </p>
                    <p className="font-serif text-[12px] md:text-[15px] font-light text-cream/90 leading-snug">
                      {s.caption}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ============ PILLARS as NUMBERED ENTRIES ============ */}
        <div className="grid md:grid-cols-2 gap-10 md:gap-x-20 md:gap-y-14 mb-20 md:mb-28">
          {[
            { no: 'I', label: 'Experiential', text: 'A living experience that transforms with every visit.' },
            { no: 'II', label: 'Artistic', text: 'Every plate, playlist, and detail curated with intent.' },
            { no: 'III', label: 'Sophisticated', text: 'Understated luxury — elevated, yet approachable.' },
            { no: 'IV', label: 'Soulful', text: 'A warmth guests carry long after they leave.' }
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative flex items-start gap-6 pb-6 border-b border-gold/15"
            >
              <span
                className="font-serif italic text-gold/40 text-5xl md:text-6xl leading-none w-14 md:w-16 select-none transition-colors duration-500 group-hover:text-gold"
              >
                {f.no}
              </span>
              <div className="flex-1">
                <p className="font-serif text-[13px] md:text-sm tracking-[0.35em] uppercase text-gold mb-2">
                  {f.label}
                </p>
                <p className="text-[14px] text-cream/75 font-light leading-[1.9] max-w-md">
                  {f.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ============ PULL QUOTE ============ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1 }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-8 text-gold/70">
            <span className="h-px w-14 bg-gold/50" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
            <span className="h-px w-14 bg-gold/50" />
          </div>
          <p className="font-serif text-2xl md:text-4xl font-light italic leading-[1.35] text-cream">
            &ldquo;Tressa is where you come for the food, but you stay for how it{' '}
            <span className="not-italic text-gold">makes you feel</span>.&rdquo;
          </p>
          <p className="mt-8 text-[10px] tracking-[0.5em] uppercase text-cream/50">— The Tressa Philosophy</p>
        </motion.div>

        {/* ============ CTA ============ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="mt-20 md:mt-24 text-center"
        >
          <a
            href="/booking"
            className="group relative inline-block"
          >
            <span className="pointer-events-none absolute -inset-2 border border-gold/40" />
            <span className="relative z-10 inline-flex items-center justify-center gap-3 px-12 py-5 font-sans text-[11px] font-semibold tracking-[0.4em] uppercase border border-gold text-gold transition-colors duration-500 group-hover:text-[#1a0810] group-hover:bg-gold">
              Reserve Your Evening
              <span className="text-[14px] transition-transform duration-500 group-hover:translate-x-1">
                &rarr;
              </span>
            </span>
          </a>
          <p className="mt-5 font-serif italic text-[11px] tracking-[0.35em] uppercase text-cream/40">
            The Sky · Lounge · Family Resto · Suites
          </p>
        </motion.div>
      </div>

      {/* bottom fade */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#10060a] to-transparent pointer-events-none" />
    </section>
  );
}

/* ----------------- sub-components ----------------- */

function CrescentMark() {
  return (
    <div className="relative w-14 h-14">
      <svg viewBox="0 0 60 60" className="w-full h-full text-gold">
        <defs>
          <mask id="crescent">
            <rect width="60" height="60" fill="black" />
            <circle cx="30" cy="30" r="22" fill="white" />
            <circle cx="38" cy="25" r="22" fill="black" />
          </mask>
        </defs>
        <circle cx="30" cy="30" r="22" fill="currentColor" mask="url(#crescent)" />
        <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
