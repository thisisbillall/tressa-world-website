'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useSiteContent } from '@/lib/siteContent';

export default function Spaces() {
  const [content] = useSiteContent();
  const spaces = content.spaces.map((s, i) => ({
    ...s,
    num: String(i + 1).padStart(2, '0'),
    alt: `${s.name} at TRESSA`
  }));
  return (
    <section id="spaces" className="py-20 md:py-32 px-6 md:px-[8%] bg-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="text-center mb-14 md:mb-20"
      >
        <p className="text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] uppercase text-maroon mb-4">Four Worlds</p>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-ink">One unforgettable address.</h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1600px] mx-auto">
        {spaces.map((s, i) => (
          <motion.article
            key={s.num}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, delay: i * 0.12 }}
            className="group relative h-[380px] sm:h-[450px] overflow-hidden cursor-pointer"
          >
            <Image
              src={s.img}
              alt={s.alt}
              fill
              quality={80}
              priority={i === 0}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover img-enhance transition-transform duration-[900ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10 transition-transform duration-500 group-hover:-translate-y-3">
              <p className="text-[10px] tracking-[0.35em] text-cream/60">{s.num}</p>
              <h3 className="font-serif text-xl sm:text-2xl text-cream mt-2">{s.name}</h3>
              <p className="text-[11px] tracking-[0.15em] uppercase text-gold mt-1">{s.tagline}</p>
              <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 mt-3">
                <p className="overflow-hidden text-xs leading-relaxed text-cream/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {s.desc}
                </p>
              </div>
              <div className="w-8 h-px bg-cream mt-4 transition-all duration-500 group-hover:w-16 group-hover:bg-gold" />
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
