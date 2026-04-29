'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import TressaLink from './TressaLink';
import { useSiteContent } from '@/lib/siteContent';

export default function Suites() {
  const [content] = useSiteContent();
  const suites = content.suites.map((s) => ({ ...s, alt: s.name }));
  return (
    <section id="suites" className="py-32 px-6 md:px-[8%] bg-cream/40">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="text-center mb-16"
      >
        <p className="text-[11px] tracking-[0.5em] uppercase text-maroon mb-4">Stay With Us</p>
        <h2 className="font-serif text-4xl md:text-5xl font-light text-ink">Luxury Suites</h2>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 max-w-[1500px] mx-auto">
        {suites.map((s, i) => (
          <motion.article
            key={s.name}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, delay: i * 0.15 }}
            className="relative h-[560px] overflow-hidden group cursor-pointer"
          >
            <Image
              src={s.img}
              alt={s.alt}
              fill
              quality={95}
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover img-enhance transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            <div className="absolute top-6 left-6">
              <span className="text-[9px] tracking-[0.3em] uppercase px-3 py-1 border border-cream text-cream">{s.tag}</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 text-cream">
              <h3 className="font-serif text-3xl font-light mb-2">{s.name}</h3>
              <p className="text-sm leading-relaxed text-cream/70 mb-4">{s.desc}</p>

              <div className="flex gap-2 flex-wrap mb-5">
                {s.feat.map((f) => (
                  <span key={f} className="text-[10px] tracking-[0.15em] uppercase text-gold border border-gold/40 px-2 py-1">{f}</span>
                ))}
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-cream/20">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-cream/50">From</p>
                  <p className="text-2xl font-serif text-gold mt-1">{s.rate}<span className="text-xs text-cream/60"> / night</span></p>
                </div>
                {/* Booking CTA hidden — /booking redirection disabled site-wide */}
                {/* <TressaLink href="/booking?venue=suites" className="text-[10px] tracking-[0.3em] uppercase text-gold border-b border-gold pb-1 hover:text-cream hover:border-cream transition-colors">Book</TressaLink> */}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
