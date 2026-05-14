'use client';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { useSiteContent } from '@/lib/siteContent';

export default function Footer() {
  const [content] = useSiteContent();
  const { contact } = content;

  return (
    <footer id="contact" className="bg-ink text-cream/80 pt-16 md:pt-20 pb-8 px-5 sm:px-6 md:px-[8%] overflow-hidden">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10 pb-12 border-b border-cream/10">
        <div>
          <p className="font-serif tracking-[0.4em] text-gold text-xl">TRESSA</p>
          <p className="mt-5 text-sm leading-relaxed text-cream/60">
            A world of rooftop, restaurant, bar and suites — crafted for those who notice the details.
          </p>
          <div className="flex gap-4 mt-6">
            {[{ Icon: Instagram, url: contact.instagram }].map(({ Icon, url }, i) => (
              <a key={i} href={url} target="_blank" rel="noopener" aria-label="Social" className="w-9 h-9 border border-cream/20 flex items-center justify-center hover:bg-gold hover:text-maroon hover:border-gold transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-5">Explore</p>
          <ul className="space-y-3 text-sm">
            {['About', 'Spaces', 'Menu', 'Suites'].map((l) => (
              <li key={l}><a href={`#${l.toLowerCase()}`} className="hover:text-gold transition-colors">{l}</a></li>
            ))}
            <li><a href="/booking" className="hover:text-gold transition-colors">Priority Booking</a></li>
            <li><a href="/terms" className="hover:text-gold transition-colors">Terms &amp; Refund Policy</a></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-5">Contact</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3"><MapPin size={14} className="mt-1 text-gold flex-shrink-0" /> <span className="break-words min-w-0">{contact.address}, {contact.city}</span></li>
            <li className="flex items-center gap-3"><Phone size={14} className="text-gold flex-shrink-0" /> <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:text-gold break-words min-w-0">{contact.phone}</a></li>
            <li className="flex items-center gap-3"><Mail size={14} className="text-gold flex-shrink-0" /> <a href={`mailto:${contact.email}`} className="hover:text-gold break-all min-w-0">{contact.email}</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-cream/40 text-center md:text-left">
        <p>© {new Date().getFullYear()} Tressa World. All rights reserved.</p>
        <p>
          Crafted with care ·{' '}
          <a href="/terms" className="hover:text-gold transition-colors">Terms &amp; Refund Policy</a>
        </p>
      </div>
    </footer>
  );
}
