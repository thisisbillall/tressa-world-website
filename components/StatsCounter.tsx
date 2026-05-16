'use client';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

const stats = [
  { value: 8, suffix: '+', label: 'Years of Legacy', note: 'Crafted since 2018' },
  { value: 250, suffix: 'K+', label: 'Guests Welcomed', note: 'Across four worlds' },
  { value: 42, suffix: '', label: 'Signature Dishes', note: 'On our curated menu' },
  { value: 18, suffix: '', label: 'Awards & Honours', note: 'Hospitality excellence' },
];

export default function StatsCounter() {
  const sectionRef = useRef<HTMLElement>(null);
  // Only animate the blurred orbs while the section is on screen — they were
  // compositing huge blur-3xl quads every frame even when scrolled away,
  // burning the GPU for no visible benefit.
  const orbsInView = useInView(sectionRef, { amount: 0.05 });

  return (
    <section ref={sectionRef} className="relative py-20 md:py-32 px-5 sm:px-6 md:px-[8%] overflow-hidden bg-maroon">
      <div className="absolute inset-0 bg-gradient-to-br from-maroon via-maroon-dark to-forest" />
      <div className="absolute inset-0 grain opacity-40 pointer-events-none" />

      {/* Floating gold orbs — cut from 6 to 3 and paused off-screen */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gold/10 blur-3xl pointer-events-none"
          style={{
            width: 200 + (i % 3) * 80,
            height: 200 + (i % 3) * 80,
            left: `${(i * 27) % 90}%`,
            top: `${(i * 41) % 80}%`,
            willChange: orbsInView ? 'transform' : 'auto',
          }}
          animate={orbsInView ? { x: [0, 40, -30, 0], y: [0, -30, 20, 0] } : { x: 0, y: 0 }}
          transition={{ duration: 14 + i * 2, repeat: orbsInView ? Infinity : 0, ease: 'easeInOut' }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center mb-14 md:mb-20"
        >
          <p className="text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] uppercase text-gold mb-4">By The Numbers</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-5xl font-light text-cream">
            A legacy <span className="italic text-gold">measured in moments</span>
          </h2>
          <div className="mt-6 mx-auto w-16 h-px bg-gold" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-4">
          {stats.map((s, i) => (
            <StatCard key={s.label} {...s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  suffix,
  label,
  note,
  index,
}: {
  value: number;
  suffix: string;
  label: string;
  note: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 2200, bounce: 0 });
  const rounded = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative p-4 sm:p-6 md:p-8 border border-cream/15 backdrop-blur-sm bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500"
    >
      <div className="absolute -top-px -left-px w-8 h-8 border-t border-l border-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -bottom-px -right-px w-8 h-8 border-b border-r border-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-baseline gap-1 font-serif flex-wrap">
        <motion.span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-gold">
          {rounded}
        </motion.span>
        <span className="text-2xl sm:text-3xl md:text-4xl font-light text-gold">{suffix}</span>
      </div>
      <div className="mt-4 h-px w-12 bg-gold/50 group-hover:w-24 transition-all duration-500" />
      <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-cream tracking-wide">{label}</p>
      <p className="mt-1 text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] uppercase text-cream/50">{note}</p>
    </motion.div>
  );
}
