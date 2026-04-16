'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useSiteContent } from '@/lib/siteContent';

export default function FAQ() {
  const [content] = useSiteContent();
  const [open, setOpen] = useState<string | null>(null);

  if (!content.faqs.length) return null;

  return (
    <section id="faq" className="py-28 px-6 md:px-[8%] bg-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="text-center mb-12"
      >
        <p className="text-[11px] tracking-[0.5em] uppercase text-maroon mb-4">Questions</p>
        <h2 className="font-serif text-4xl md:text-5xl font-light text-ink">Good to Know</h2>
      </motion.div>

      <div className="max-w-3xl mx-auto divide-y divide-maroon/10">
        {content.faqs.map((f, i) => {
          const isOpen = open === f.id;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="w-full flex items-center justify-between py-5 text-left group"
                aria-expanded={isOpen}
              >
                <span className="text-ink font-medium group-hover:text-maroon transition-colors text-sm md:text-base pr-4">{f.q}</span>
                <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-maroon/20 group-hover:border-gold group-hover:text-gold text-maroon transition-colors">
                  {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 text-sm text-muted leading-relaxed pr-12">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
