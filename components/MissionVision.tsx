'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useSiteContent, DEFAULT_CONTENT } from '@/lib/siteContent';

export default function MissionVision() {
  const [content] = useSiteContent();
  const mission = content.about.mission ?? DEFAULT_CONTENT.about.mission;
  const vision = content.about.vision ?? DEFAULT_CONTENT.about.vision;

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });
  const markerY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      ref={ref}
      id="mission-vision"
      className="relative overflow-hidden bg-[#1a0810] text-cream py-20 md:py-30 px-6 md:px-[8%]"
    >
      {/* Static ambient glow — no parallax. Animating `transform` on a
          blur-[120px] element forces the compositor to re-blur every frame,
          which was tanking framerate on mid phones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
      >
        <div className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full bg-gold blur-[120px]" />
        <div className="absolute -bottom-20 -right-20 w-[520px] h-[520px] rounded-full bg-maroon blur-[120px]" />
      </div>

      <motion.header
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative max-w-7xl mx-auto text-center mb-20 md:mb-28"
      >
        <p className="text-[10px] tracking-[0.5em] sm:tracking-[0.6em] uppercase text-gold mb-5">Philosophy</p>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-light leading-[1.05]">
          What guides
          <span className="italic text-gold"> every </span>
          evening.
        </h2>
        <div className="mx-auto mt-8 flex items-center justify-center gap-3 text-gold/70">
          <span className="h-px w-10 bg-gold/50" />
          <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
          <span className="h-px w-10 bg-gold/50" />
        </div>
      </motion.header>

      <div className="relative max-w-7xl mx-auto">
        {/* decorative center line (md+) */}
        <motion.div
          aria-hidden
          style={{ y: markerY }}
          className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
        >
          <div className="relative h-full w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border border-gold/70 bg-[#1a0810]" />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-16 md:gap-24">
          <Panel number="01" label={mission.label} title={mission.title} body={mission.body} align="left" delay={0} />
          <Panel number="02" label={vision.label} title={vision.title} body={vision.body} align="right" delay={0.15} />
        </div>
      </div>
    </section>
  );
}

function Panel({
  number,
  label,
  title,
  body,
  align,
  delay
}: {
  number: string;
  label: string;
  title: string;
  body: string;
  align: 'left' | 'right';
  delay: number;
}) {
  const fromX = align === 'left' ? -30 : 30;
  return (
    <motion.article
      initial={{ opacity: 0, x: fromX }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative will-change-transform ${align === 'right' ? 'md:text-right md:pl-6' : 'md:pr-6'}`}
    >
      <div
        className={`flex items-baseline gap-4 sm:gap-5 mb-8 flex-wrap ${
          align === 'right' ? 'md:justify-end md:flex-row-reverse md:[&>*]:text-right' : ''
        }`}
      >
        <span className="font-serif text-[44px] sm:text-[56px] md:text-[72px] leading-none text-gold/25 select-none">
          {number}
        </span>
        <span className="text-[10px] tracking-[0.4em] sm:tracking-[0.5em] uppercase text-gold">{label}</span>
      </div>

      <h3 className="font-serif text-2xl sm:text-3xl md:text-[40px] font-light leading-[1.2] text-cream mb-8 break-words">
        {title}
      </h3>

      <div className={`flex items-center gap-3 mb-8 ${align === 'right' ? 'md:justify-end' : ''}`}>
        <span className="h-px w-10 bg-gold/70" />
        <span className="h-1 w-1 rotate-45 bg-gold" />
      </div>

      <p className="text-[13px] md:text-[15px] leading-loose text-cream/70 font-light max-w-prose md:ml-auto">
        {body}
      </p>
    </motion.article>
  );
}
