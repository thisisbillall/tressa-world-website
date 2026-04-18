'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';
import { useSiteContent } from '@/lib/siteContent';

export default function Gallery() {
  const [content] = useSiteContent();
  const images = content.gallery;

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const xLeft  = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);
  const xRight = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  if (!images.length) return null;

  const half = Math.ceil(images.length / 2);
  const top = images.slice(0, half);
  const bottom = images.slice(half);

  return (
    <section ref={ref} className="relative py-20 md:py-32 overflow-hidden bg-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="text-center mb-12 md:mb-16 px-6"
      >
        <p className="text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] uppercase text-maroon mb-4">Inside Tressa</p>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-ink">A Glimpse of the World</h2>
      </motion.div>

      <div className="space-y-6">
        <motion.div style={{ x: xLeft }} className="flex gap-6 pl-6">
          {top.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.9, delay: i * 0.1 }}
              className={`relative flex-shrink-0 overflow-hidden group ${
                i % 2 === 0 ? 'w-[55vw] md:w-[38vw] h-[50vh]' : 'w-[40vw] md:w-[28vw] h-[40vh] self-end'
              }`}
            >
              {img.src && (
                <Image src={img.src} alt={img.alt} fill quality={95} sizes="(max-width: 768px) 55vw, 38vw" className="object-cover img-enhance transition-transform duration-700 group-hover:scale-105" />
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div style={{ x: xRight }} className="flex gap-6 pr-6 justify-end">
          {bottom.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.9, delay: i * 0.1 }}
              className={`relative flex-shrink-0 overflow-hidden group ${
                i % 2 === 0 ? 'w-[42vw] md:w-[30vw] h-[42vh]' : 'w-[55vw] md:w-[36vw] h-[48vh]'
              }`}
            >
              {img.src && (
                <Image src={img.src} alt={img.alt} fill quality={95} sizes="(max-width: 768px) 55vw, 36vw" className="object-cover img-enhance transition-transform duration-700 group-hover:scale-105" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
