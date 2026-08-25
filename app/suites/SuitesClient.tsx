'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2,
  Minus, Plus, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

/* ------------------------------------------------------------------ types */
type SuiteType = {
  name: string;
  subtitle: string | null;
  description: string | null;
  images: string[];
  amenities: string[];
  base_price: number;
  gst_rate: number;
  max_guests: number;
  offer_active: boolean;
  offer_percent: number;
  offer_label: string | null;
  total_rooms: number;
  available_rooms: number;
  booking_enabled: boolean;
};
type ConfirmedRoom = { room_name: string; room_number: string; booking_code: string; total_amount: string | number };

/* ------------------------------------------------------------------ utils */
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
// Calendar-safe: does the math in UTC on the y-m-d parts so it never drifts a
// day due to the local timezone offset.
const addDaysISO = (iso: string, d: number) => {
  const [y, m, dd] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd));
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10);
};
const nightsBetween = (ci: string, co: string) => {
  const ms = new Date(co + 'T00:00:00').getTime() - new Date(ci + 'T00:00:00').getTime();
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
};

// Display-only preview; server recomputes every price authoritatively.
function typePreview(t: SuiteType, nights: number, qty: number) {
  const base1 = round2(t.base_price * nights);
  const disc1 = round2(base1 * (t.offer_percent / 100));
  const gst1 = round2((base1 - disc1) * (t.gst_rate / 100));
  const total1 = round2(base1 - disc1 + gst1);
  const perNightAfter = t.offer_percent ? round2(t.base_price * (1 - t.offer_percent / 100)) : t.base_price;
  return {
    perNight: t.base_price, perNightAfter,
    base: round2(base1 * qty), discount: round2(disc1 * qty), gst: round2(gst1 * qty), total: round2(total1 * qty),
  };
}

/* -------------------------------------------------------- razorpay loader */
let rzpScriptPromise: Promise<boolean> | null = null;
function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (rzpScriptPromise) return rzpScriptPromise;
  rzpScriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { rzpScriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return rzpScriptPromise;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80';
// Tiny theme-coloured blur shown instantly while the real image loads.
const BLUR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVR4nGN4cG0XVsQwkBIAULR1AbZ2244AAAAASUVORK5CYII=';

// next/image with an animated shimmer skeleton over it until it finishes
// loading. The parent must be positioned (the image containers all are).
function ShimmerImage(props: React.ComponentProps<typeof Image>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <Image {...props} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
      <span
        aria-hidden
        className={`img-shimmer absolute inset-0 z-10 pointer-events-none transition-opacity duration-700 ${loaded ? 'opacity-0' : 'opacity-100'}`}
      />
    </>
  );
}
const invoiceHref = (ref: string) => `/api/suite-bookings/invoice/${encodeURIComponent(ref)}`;
function autoDownloadInvoice(ref: string) {
  if (typeof document === 'undefined') return;
  try {
    const a = document.createElement('a');
    a.href = invoiceHref(ref);
    a.download = `TRESSA-Suite-Invoice-${ref}.pdf`;
    a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  } catch { /* manual link still offered on the confirmation screen */ }
}

/* ================================================================ page */
export default function SuitesClient() {
  const [types, setTypes] = useState<SuiteType[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 1));
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const nights = nightsBetween(checkIn, checkOut);

  useEffect(() => { void loadRazorpay(); }, []);
  useEffect(() => { if (nightsBetween(checkIn, checkOut) < 1) setCheckOut(addDaysISO(checkIn, 1)); }, [checkIn]); // eslint-disable-line

  // (Re)load availability whenever the dates change.
  useEffect(() => {
    let alive = true;
    const qs = nights >= 1 ? `?check_in=${checkIn}&check_out=${checkOut}` : '';
    apiFetch<SuiteType[]>(`/api/suite-types${qs}`, { cache: 'no-store' })
      .then((j) => { if (alive) { setTypes(j.data || []); setLoadError(null); } })
      .catch((e) => { if (alive) setLoadError(e?.message || 'Could not load rooms.'); });
    return () => { alive = false; };
  }, [checkIn, checkOut, nights]);

  const selected = useMemo(() => types?.find((t) => t.name === selectedName) ?? null, [types, selectedName]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  const openBooking = (t: SuiteType) => {
    // Paused types are shown but not sellable — the card offers no way in,
    // and this is the guard for anything that still calls through.
    if (!t.booking_enabled) return;
    setSelectedName(t.name); setQty(1);
  };

  return (
    <main className="relative min-h-screen text-cream">
      {/* full-page background image behind all content */}
      <div className="fixed inset-0 -z-10">
        <ShimmerImage src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1600&q=70"
          alt="" fill priority quality={70} sizes="100vw"
          placeholder="blur" blurDataURL={BLUR} className="object-cover" />
        <div className="absolute inset-0 bg-[#160608]/70" />
      </div>

      {/* hero */}
      <section className="relative">
        <div className="relative px-5 md:px-[8%] pt-6 md:pt-8 pb-5 md:pb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-cream/80 hover:text-gold transition-colors">
            <ArrowLeft size={14} /> Back to TRESSA
          </Link>
          <div className="mt-8 md:mt-10 max-w-2xl">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
              className="text-[9px] md:text-[11px] tracking-[0.4em] md:tracking-[0.5em] uppercase text-gold mb-3 md:mb-4">TRESSA · Stay With Us</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}
              className="font-serif text-5xl md:text-6xl font-light text-cream leading-[1.02]">Aura Suites</motion.h2>
            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
              className="mt-4 text-[12.5px] md:text-base text-cream/90 leading-relaxed max-w-xl">
              Choose your suite, pick how many rooms and your dates,<br className="hidden sm:block" /> and book in one secure payment<br className="sm:hidden" /> <span className="whitespace-nowrap">from <span className="text-gold font-medium">₹4,000</span> / night plus GST.</span>
            </motion.p>
            <div className="mt-7 hidden sm:flex flex-wrap gap-2.5">
              <HeroBadge icon={<ShieldCheck size={14} />} label="Secure payment" />
              <HeroBadge icon={<CalendarDays size={14} />} label="Live availability" />
              <HeroBadge icon={<Sparkles size={14} />} label="Seasonal offers" />
            </div>
          </div>
        </div>
      </section>

      {/* type cards */}
      <section className="px-5 md:px-[8%] pt-10 pb-20">
        {loadError && <p className="max-w-md mx-auto text-center text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{loadError}</p>}
        {types === null && !loadError && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[460px] bg-white/60 animate-pulse" />)}
          </div>
        )}
        {types && types.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-[1400px] mx-auto">
            {[...types]
              .sort((a, b) => Number(b.booking_enabled) - Number(a.booking_enabled))
              .map((t, i) => <TypeCard key={t.name} type={t} nights={nights} index={i} onBook={() => openBooking(t)} />)}
          </div>
        )}
      </section>

      {/* booking modal */}
      <AnimatePresence>
        {selected && (
          <BookingModal
            type={selected} nights={nights} checkIn={checkIn} checkOut={checkOut} qty={qty}
            setCheckIn={setCheckIn} setCheckOut={setCheckOut} setQty={setQty}
            onClose={() => setSelectedName(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ------------------------------------------------------------- hero badge */
function HeroBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-xl text-cream text-[10px] tracking-[0.18em] uppercase [box-shadow:0_8px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]">
      <span className="text-gold">{icon}</span>{label}
    </span>
  );
}

/* -------------------------------------------------------------- type card */
function TypeCard({ type, nights, index, onBook }: { type: SuiteType; nights: number; index: number; onBook: () => void }) {
  const img = type.images?.[0] || FALLBACK_IMG;
  const p = typePreview(type, Math.max(nights, 1), 1);
  const bookable = type.booking_enabled;
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.3) }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white/[0.88] backdrop-blur-xl border border-maroon/40 [box-shadow:0_12px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.55)] hover:border-maroon/60 hover:[box-shadow:0_24px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-500"
    >
      <button
        onClick={onBook}
        disabled={!bookable}
        className={`relative aspect-[4/3] overflow-hidden text-left ${bookable ? '' : 'cursor-default'}`}
      >
        <ShimmerImage src={img} alt={type.name} fill quality={72} sizes="(max-width:768px) 100vw, 33vw"
          placeholder="blur" blurDataURL={BLUR}
          className="object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-70" />
        {bookable && type.offer_active && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold text-maroon text-[10px] font-semibold tracking-[0.12em] uppercase shadow">
            <Sparkles size={12} /> {type.offer_label || `${type.offer_percent}% Off`}
          </span>
        )}
        {!bookable && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-maroon-dark/85 backdrop-blur-md border border-gold/40 text-cream text-[10px] font-semibold tracking-[0.12em] uppercase shadow">
            Coming soon
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3.5 py-2 bg-maroon-dark/80 backdrop-blur-md border border-gold/40 text-cream text-[11px] font-semibold tracking-[0.12em] uppercase shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
          </span>
          {type.total_rooms} Room{type.total_rooms > 1 ? 's' : ''}
        </span>
      </button>

      <div className="flex flex-col flex-1 p-5 md:p-6">
        <h3 className="font-serif text-2xl font-light text-ink">{type.name}</h3>
        {type.subtitle && <p className="text-[13px] text-maroon/80 mt-0.5">{type.subtitle}</p>}

        {type.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {type.amenities.map((a) => <span key={a} className="text-[10px] tracking-[0.05em] text-maroon/70 border border-maroon/15 px-2 py-1">{a}</span>)}
          </div>
        )}

        <div className="mt-10 pt-5 border-t border-maroon/10 flex items-end justify-between">
          {bookable ? (
            <>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted">From</p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  {type.offer_active && <span className="text-sm text-muted/70 line-through">{inr(p.perNight)}</span>}
                  <span className="font-serif text-2xl text-maroon">{inr(p.perNightAfter)}</span>
                  <span className="text-[11px] text-muted">/ night</span>
                </p>
                <p className="text-[10px] text-muted mt-0.5">+ {type.gst_rate}% GST</p>
              </div>
              <button onClick={onBook}
                className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase bg-maroon text-cream hover:bg-gold hover:text-maroon transition-colors">
                Book Now
              </button>
            </>
          ) : (
            /* Paused from the management app: the suite stays on show, but with
               no rate and no way to book it. */
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted">Availability</p>
              <p className="mt-1 font-serif text-xl text-maroon">Coming soon</p>
              <p className="text-[10px] text-muted mt-0.5">Reservations open shortly</p>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------ booking modal */
function BookingModal({ type, nights, checkIn, checkOut, qty, setCheckIn, setCheckOut, setQty, onClose }: {
  type: SuiteType; nights: number; checkIn: string; checkOut: string; qty: number;
  setCheckIn: (v: string) => void; setCheckOut: (v: string) => void; setQty: (v: number) => void; onClose: () => void;
}) {
  const images = type.images?.length ? type.images : [FALLBACK_IMG];
  const [imgIdx, setImgIdx] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ ref: string; rooms: ConfirmedRoom[]; total: number } | null>(null);

  const maxQty = Math.max(0, type.available_rooms);
  const q = Math.min(Math.max(qty, 1), Math.max(maxQty, 1));
  const p = typePreview(type, nights, q);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setErr(null);
    if (nights < 1) { setErr('Pick valid check-in and check-out dates.'); return; }
    if (q < 1 || q > maxQty) { setErr(`Only ${maxQty} room(s) available for these dates.`); return; }
    if (!name.trim()) { setErr('Please enter your name.'); return; }
    if (!/^[0-9]{10}$/.test(phone.trim())) { setErr('Please enter a valid 10-digit phone number.'); return; }
    if (!agreed) { setErr('Please accept the terms to continue.'); return; }

    try {
      setSending(true);
      const json = await apiFetch<any>('/api/suite-bookings/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_name: type.name, check_in: checkIn, check_out: checkOut, quantity: q,
          customer_name: name.trim(), customer_phone: phone.trim(),
          customer_email: email.trim() || undefined, notes: notes.trim() || undefined,
        }),
      });
      const rzpCfg = json.razorpay;
      if (!rzpCfg?.order_id) throw new Error('Could not start payment. Please retry.');
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Could not load the payment gateway. Please retry.');

      let paid = false;
      const release = () => {
        if (paid) return;
        fetch('/api/suite-bookings/release', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: rzpCfg.order_id }), keepalive: true,
        }).catch(() => {});
      };

      const rz = new (window as any).Razorpay({
        key: rzpCfg.key_id, amount: rzpCfg.amount, currency: rzpCfg.currency, order_id: rzpCfg.order_id,
        name: 'TRESSA · Aura Suites',
        description: `${q} × ${type.name} · ${nights} night${nights > 1 ? 's' : ''}`,
        prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() },
        theme: { color: '#5E141E' },
        handler: async (resp: any) => {
          paid = true;
          try {
            const vj = await apiFetch<any>('/api/suite-bookings/verify', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const rooms: ConfirmedRoom[] = vj.bookings || [];
            const total = rooms.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
            setConfirmed({ ref: vj.group_ref, rooms, total });
            autoDownloadInvoice(vj.group_ref);
          } catch (verErr: any) {
            setErr(verErr?.message || 'Payment verification failed. If charged, contact us with your payment ID.');
          } finally { setSending(false); }
        },
        modal: { ondismiss: () => { setSending(false); release(); setErr('Payment cancelled. No amount was charged.'); } },
      });
      rz.on('payment.failed', () => { setSending(false); release(); setErr('Payment failed. Please try again.'); });
      rz.open();
    } catch (e: any) {
      setSending(false);
      setErr((e?.code === 'ALREADY_BOOKED' || e?.code === 'NOT_ENOUGH') ? e.message : (e?.message || 'Something went wrong. Please retry.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-4xl md:h-auto md:max-h-[92vh] h-[92vh] mt-auto md:mt-0 bg-[#fdf8ea] overflow-y-auto shadow-2xl">
        <button onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-black/40 text-cream hover:bg-maroon rounded-full"><X size={18} /></button>

        <div className="md:grid md:grid-cols-2">
          {/* image side */}
          <div className="relative h-56 sm:h-72 md:h-full min-h-[260px]">
            <ShimmerImage src={images[imgIdx] || FALLBACK_IMG} alt={type.name} fill quality={72} sizes="(max-width:768px) 100vw, 50vw"
              placeholder="blur" blurDataURL={BLUR} className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-cream hover:bg-maroon rounded-full"><ChevronLeft size={18} /></button>
                <button onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-cream hover:bg-maroon rounded-full"><ChevronRight size={18} /></button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? 'bg-gold' : 'bg-cream/50'}`} />)}
                </div>
              </>
            )}
            {type.offer_active && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold text-maroon text-[10px] font-semibold tracking-[0.12em] uppercase">
                <Sparkles size={12} /> {type.offer_label || `${type.offer_percent}% Off`}
              </span>
            )}
          </div>

          {/* content side */}
          <div className="p-5 sm:p-7">
            {confirmed ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto rounded-full border-2 border-gold flex items-center justify-center text-gold"><Check size={26} /></div>
                <h3 className="font-serif text-2xl mt-4 font-light text-maroon">Booking Confirmed</h3>
                <p className="text-[11px] tracking-[0.3em] uppercase text-gold mt-2">Ref {confirmed.ref}</p>
                <div className="mt-5 bg-white border border-maroon/10 divide-y divide-maroon/10 text-left">
                  {confirmed.rooms.map((r) => (
                    <div key={r.booking_code} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm text-ink">{r.room_name}</p>
                        <p className="text-[10px] tracking-[0.15em] uppercase text-muted">#{r.room_number} · {r.booking_code}</p>
                      </div>
                      <span className="text-sm text-maroon">{inr(Number(r.total_amount))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-cream/40">
                    <span className="text-[11px] tracking-[0.2em] uppercase text-muted">Total paid</span>
                    <span className="font-serif text-xl text-maroon">{inr(confirmed.total)}</span>
                  </div>
                </div>
                <p className="mt-4 text-[12px] text-muted">Your invoice is downloading and an SMS has been sent. Show your reference at reception.</p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <a href={invoiceHref(confirmed.ref)} target="_blank" rel="noopener"
                    className="flex-1 py-3.5 text-[11px] tracking-[0.3em] uppercase bg-gold text-maroon text-center hover:bg-maroon hover:text-cream transition-colors">Download Invoice</a>
                  <button onClick={onClose} className="flex-1 py-3.5 text-[11px] tracking-[0.3em] uppercase bg-maroon text-cream">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl font-light text-ink">{type.name}</h3>
                  {type.subtitle && <p className="text-[13px] text-maroon/80 mt-0.5">{type.subtitle}</p>}
                  {type.description && <p className="text-[13px] text-muted mt-2 leading-relaxed">{type.description}</p>}
                  <p className="mt-2 text-[11px] tracking-[0.15em] uppercase text-maroon">{maxQty} of {type.total_rooms} available</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Check-in"><input type="date" value={checkIn} min={todayISO()} onChange={(e) => setCheckIn(e.target.value)} className={inputCls} /></Field>
                  <Field label="Check-out"><input type="date" value={checkOut} min={addDaysISO(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} className={inputCls} /></Field>
                </div>

                <div>
                  <label className="text-[9px] tracking-[0.25em] uppercase text-maroon mb-1.5 flex items-center gap-1.5"><Users size={12} /> How many rooms</label>
                  <Stepper value={q} min={1} max={Math.max(maxQty, 1)} onChange={setQty} />
                </div>

                {/* price breakdown */}
                <div className="bg-white border border-maroon/10 p-4 space-y-2 text-[13px]">
                  <Row label={`${inr(type.base_price)} × ${nights} night${nights > 1 ? 's' : ''} × ${q} room${q > 1 ? 's' : ''}`} value={inr(p.base)} />
                  {p.discount > 0 && <Row label={<span className="text-maroon">{type.offer_label || `Offer (${type.offer_percent}%)`}</span>} value={<span className="text-maroon">− {inr(p.discount)}</span>} />}
                  <Row label={`GST (${type.gst_rate}%)`} value={inr(p.gst)} muted />
                  <div className="pt-2 mt-1 border-t border-maroon/10 flex items-center justify-between">
                    <span className="text-[11px] tracking-[0.2em] uppercase text-muted">Total payable</span>
                    <span className="font-serif text-2xl text-maroon">{inr(p.total)}</span>
                  </div>
                </div>

                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required autoComplete="name" className={inputCls} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Phone (10-digit)" type="tel" inputMode="numeric" maxLength={10} required autoComplete="tel" className={inputCls} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" autoComplete="email" className={inputCls} />
                </div>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests (optional)" className={inputCls} />

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-maroon flex-shrink-0" />
                  <span className="text-[11px] text-muted leading-relaxed">
                    I agree to TRESSA World&apos;s <a href="/terms" target="_blank" rel="noopener" className="text-maroon underline hover:text-gold">Terms &amp; Policy</a> and understand the full stay amount is charged now to confirm.
                  </span>
                </label>

                {err && <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 px-3 py-2">{err}</p>}

                <button type="submit" disabled={sending || !agreed || nights < 1 || maxQty < 1}
                  className="w-full relative overflow-hidden py-4 text-[11px] tracking-[0.3em] uppercase bg-maroon text-cream font-medium group disabled:opacity-60 disabled:cursor-not-allowed">
                  <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <span className="relative group-hover:text-maroon transition-colors flex items-center justify-center gap-2">
                    {sending && <Loader2 className="animate-spin" size={14} />}
                    {sending ? 'Processing…' : `Pay ${inr(p.total)} & Confirm`}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* --------------------------------------------------------------- atoms */
const inputCls = 'w-full bg-white border border-maroon/15 text-ink text-sm px-3 py-2.5 focus:outline-none focus:border-gold transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] tracking-[0.25em] uppercase text-maroon mb-1.5 flex items-center gap-1.5"><CalendarDays size={12} /> {label}</label>
      {children}
    </div>
  );
}
function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return <div className={`flex items-center justify-between ${muted ? 'text-muted' : 'text-ink'}`}><span>{label}</span><span>{value}</span></div>;
}
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center border border-maroon/20">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} className="w-9 h-9 flex items-center justify-center text-maroon disabled:opacity-30"><Minus size={14} /></button>
      <span className="w-10 text-center text-sm text-ink">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="w-9 h-9 flex items-center justify-center text-maroon disabled:opacity-30"><Plus size={14} /></button>
    </div>
  );
}
