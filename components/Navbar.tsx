'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import TressaLink from './TressaLink';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#spaces', label: 'Spaces' },
  { href: '#experience', label: 'Experience' },
  { href: '#menu', label: 'Menu' },
  // { href: '#suites', label: 'Suites' }, // Aura — under development
  { href: '#contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' }
];

export default function Navbar() {
  const [scrolledRaw, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Inner pages (everything other than the home page) don't have the dark
  // hero behind the nav, so the transparent / cream-text state is invisible
  // against their lighter / different backgrounds. Force the solid state
  // there so the nav is always readable.
  const isHome = pathname === '/' || pathname === '';
  const scrolled = scrolledRaw || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // For hash links the in-page smooth-scroll only makes sense when those
  // sections actually exist — i.e. we're on the home page. On inner routes
  // (/terms, /booking) we rewrite "#about" to "/#about" and let the browser
  // navigate so the link goes back to home and lands on the right section.
  const resolveHref = (href: string) => {
    if (!href.startsWith('#')) return href;
    return isHome ? href : `/${href}`;
  };

  const scrollToAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    if (!isHome) return; // let the browser navigate to "/#section"
    e.preventDefault();
    const id = href.slice(1);
    const el = id ? document.getElementById(id) : document.documentElement;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.nav
      // The delayed entrance animation is timed for the home page Preloader.
      // Inner routes (/terms, /booking) have no preloader, so we render the
      // navbar immediately in its final state — and skip the scroll-driven
      // colour transition entirely so it stays constant white.
      initial={isHome ? { y: -50, opacity: 0 } : false}
      animate={isHome ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
      transition={
        isHome
          ? { duration: 0.9, delay: 1.7, ease: [0.25, 0.46, 0.45, 0.94] }
          : { duration: 0 }
      }
      className={`fixed top-0 left-0 right-0 z-50 ${
        isHome ? 'transition-all duration-500' : ''
      } ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl py-4 border-b border-maroon/10 shadow-[0_1px_30px_rgba(0,0,0,0.04)]'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-5 sm:px-6 md:px-16 flex items-center justify-between gap-3">
        <Link
          href={isHome ? '#home' : '/'}
          onClick={(e) => scrollToAnchor(e as unknown as React.MouseEvent<HTMLAnchorElement>, '#home')}
          className="flex items-center gap-1 min-w-0"
          aria-label="TRESSA World home"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex-shrink-0">
            <Image
              src="/brand/tressa-logo-mark.png"
              alt=""
              fill
              priority
              sizes="44px"
              className="object-contain"
            />
          </div>
          <span
            className={`font-serif font-medium tracking-[0.2em] sm:tracking-[0.29em] text-base sm:text-lg md:text-xl transition-colors ${
              scrolled ? 'text-maroon' : 'text-cream'
            }`}
          >
            TRESSA
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-10">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={resolveHref(l.href)}
                onClick={(e) => scrollToAnchor(e, l.href)}
                className={`nav-link relative text-[11px] tracking-[0.25em] uppercase font-medium transition-colors ${
                  scrolled ? 'text-ink hover:text-maroon' : 'text-cream hover:text-gold'
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          {/* Booking CTA hidden — /booking redirection disabled site-wide */}
          {/* <TressaLink
            href="/booking"
            className={`hidden md:inline-block px-6 py-3 text-[11px] tracking-[0.25em] uppercase border transition-all duration-500 relative overflow-hidden group ${
              scrolled ? 'border-maroon text-maroon' : 'border-cream text-cream'
            }`}
          >
            <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.77,0,0.175,1)]" />
            <span className="relative group-hover:text-maroon transition-colors duration-300">Book Now</span>
          </TressaLink> */}

          <button
            onClick={() => setOpen(!open)}
            className={`lg:hidden p-1 ${scrolled ? 'text-maroon' : 'text-cream'}`}
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* mobile */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="lg:hidden bg-white border-t border-maroon/10"
        >
          <ul className="flex flex-col p-6 gap-5">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={resolveHref(l.href)}
                  onClick={(e) => { scrollToAnchor(e, l.href); setOpen(false); }}
                  className="text-ink text-sm tracking-[0.2em] uppercase"
                >
                  {l.label}
                </a>
              </li>
            ))}
            {/* Mobile booking CTA hidden — /booking redirection disabled site-wide */}
            {/* <TressaLink href="/booking" onClick={() => setOpen(false)} className="btn-primary inline-block text-center"><span>Book Now</span></TressaLink> */}
          </ul>
        </motion.div>
      )}
    </motion.nav>
  );
}
