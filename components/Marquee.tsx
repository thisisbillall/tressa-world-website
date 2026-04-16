'use client';
import { useSiteContent } from '@/lib/siteContent';

export default function Marquee() {
  const [content] = useSiteContent();
  const words = content.marquee;
  if (!words.length) return null;
  const loop = [...words, ...words];
  return (
    <section className="py-10 border-y border-maroon/10 overflow-hidden bg-white">
      <div className="flex gap-16 animate-marquee whitespace-nowrap">
        {loop.map((w, i) => (
          <span key={i} className="font-serif italic text-3xl md:text-5xl font-light text-maroon/80 flex items-center gap-16">
            {w}
            <span className="w-2 h-2 bg-gold rotate-45 inline-block" />
          </span>
        ))}
      </div>
    </section>
  );
}
