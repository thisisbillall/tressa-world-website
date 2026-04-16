'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { activeOffer, useSiteContent } from '@/lib/siteContent';

const DISMISS_KEY = 'tressa.offer.dismissed.v1';

export default function OfferBanner() {
  const [content] = useSiteContent();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const offer = activeOffer(content.offers);
  const visible = offer && offer.id !== dismissed;

  const close = () => {
    if (!offer) return;
    localStorage.setItem(DISMISS_KEY, offer.id);
    setDismissed(offer.id);
  };

  const timeLeft = offer?.expiresAt
    ? Math.max(0, new Date(offer.expiresAt).getTime() - now)
    : null;

  return (
    <AnimatePresence>
      {visible && offer && (
        <motion.div
          key={offer.id}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed top-0 left-0 right-0 z-[9000] flex items-center justify-center gap-3 md:gap-5 px-10 md:px-14 py-2.5 text-[11px] md:text-xs tracking-[0.15em]"
          style={{ background: offer.bg, color: offer.color }}
          role="status"
        >
          <span className="hidden md:inline" style={{ color: offer.accent }}>★</span>
          <span className="font-medium">{offer.title}</span>
          {offer.subtitle && (
            <span className="hidden md:inline opacity-80">· {offer.subtitle}</span>
          )}
          {timeLeft !== null && timeLeft > 0 && (
            <span className="hidden lg:inline font-mono" style={{ color: offer.accent }}>
              · {formatLeft(timeLeft)}
            </span>
          )}
          {offer.ctaLabel && offer.ctaHref && (
            <a
              href={offer.ctaHref}
              className="ml-1 md:ml-2 underline-offset-4 hover:underline font-semibold"
              style={{ color: offer.accent }}
            >
              {offer.ctaLabel} →
            </a>
          )}
          <button
            onClick={close}
            aria-label="Dismiss offer"
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
            style={{ color: offer.color }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatLeft(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
