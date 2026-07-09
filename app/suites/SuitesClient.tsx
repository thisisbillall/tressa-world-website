'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BedDouble, CalendarDays, Check, ChevronLeft, ChevronRight,
  Loader2, Maximize2, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

/* ------------------------------------------------------------------ types */
type SuiteRoom = {
  id: string;
  room_number: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  floor: string | null;
  bed_type: string | null;
  size_sqft: number | null;
  max_guests: number;
  base_price: string | number;
  gst_rate: string | number;
  offer_active: boolean;
  offer_percent: string | number;
  offer_label: string | null;
  amenities: string[];
  images: string[];
};

type Confirmed = {
  booking_code: string;
  room_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_amount: string | number;
};

/* ------------------------------------------------------------------ utils */
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso: string, d: number) => {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};
const nightsBetween = (ci: string, co: string) => {
  const ms = new Date(co + 'T00:00:00').getTime() - new Date(ci + 'T00:00:00').getTime();
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
};
const prettyDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Client-side preview only; the server recomputes authoritatively at booking.
function preview(room: SuiteRoom, nights: number) {
  const perNight = Number(room.base_price) || 0;
  const gstRate = Number(room.gst_rate) || 0;
  const offerPct = room.offer_active ? Number(room.offer_percent) || 0 : 0;
  const base = round2(perNight * nights);
  const discount = round2(base * (offerPct / 100));
  const taxable = round2(base - discount);
  const gst = round2(taxable * (gstRate / 100));
  const total = round2(taxable + gst);
  const perNightAfter = offerPct ? round2(perNight * (1 - offerPct / 100)) : perNight;
  return { perNight, perNightAfter, gstRate, offerPct, base, discount, taxable, gst, total };
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

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80';

/* ================================================================ page */
export default function SuitesClient() {
  const [rooms, setRooms] = useState<SuiteRoom[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SuiteRoom | null>(null);

  useEffect(() => { void loadRazorpay(); }, []);

  useEffect(() => {
    let alive = true;
    apiFetch<SuiteRoom[]>('/api/suite-rooms', { cache: 'no-store' })
      .then((j) => { if (alive) setRooms(j.data || []); })
      .catch((e) => { if (alive) setLoadError(e?.message || 'Could not load rooms.'); });
    return () => { alive = false; };
  }, []);

  // Lock body scroll while the booking sheet is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#fdf8ea] text-ink">
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2000&q=80"
            alt="TRESSA premium suite"
            fill
            priority
            quality={85}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#fdf8ea]" />
        </div>

        <div className="relative px-5 md:px-[8%] pt-6 md:pt-8 pb-24 md:pb-32">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-cream/80 hover:text-gold transition-colors"
          >
            <ArrowLeft size={14} /> Back to TRESSA
          </Link>

          <div className="mt-16 md:mt-24 max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
              className="text-[11px] tracking-[0.5em] uppercase text-gold mb-4"
            >
              TRESSA · Stay With Us
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}
              className="font-serif text-4xl md:text-6xl font-light text-cream leading-[1.05]"
            >
              Premium Suites
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
              className="mt-5 text-sm md:text-base text-cream/85 leading-relaxed max-w-xl"
            >
              Ten thoughtfully appointed rooms where quiet luxury meets modern comfort.
              Book instantly with secure payment — from <span className="text-gold font-medium">₹4,000</span> / night
              plus applicable GST.
            </motion.p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <HeroBadge icon={<ShieldCheck size={14} />} label="Secure payment" />
              <HeroBadge icon={<CalendarDays size={14} />} label="Instant confirmation" />
              <HeroBadge icon={<Sparkles size={14} />} label="Seasonal offers" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- rooms ---------------- */}
      <section className="px-5 md:px-[8%] -mt-14 md:-mt-20 pb-24 relative z-10">
        {loadError && (
          <p className="max-w-md mx-auto text-center text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
            {loadError}
          </p>
        )}

        {rooms === null && !loadError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[420px] bg-white/60 border border-maroon/10 animate-pulse" />
            ))}
          </div>
        )}

        {rooms && rooms.length === 0 && !loadError && (
          <p className="text-center text-muted py-20">No rooms are available right now. Please check back soon.</p>
        )}

        {rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-[1500px] mx-auto">
            {rooms.map((room, i) => (
              <RoomCard key={room.id} room={room} index={i} onBook={() => setSelected(room)} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- booking sheet ---------------- */}
      <AnimatePresence>
        {selected && (
          <BookingSheet room={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ------------------------------------------------------------- hero badge */
function HeroBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-2 border border-gold/50 bg-black/25 backdrop-blur-sm text-cream text-[10px] tracking-[0.15em] uppercase">
      <span className="text-gold">{icon}</span>{label}
    </span>
  );
}

/* -------------------------------------------------------------- room card */
function RoomCard({ room, index, onBook }: { room: SuiteRoom; index: number; onBook: () => void }) {
  const img = room.images?.[0] || FALLBACK_IMG;
  const perNight = Number(room.base_price) || 0;
  const offerPct = room.offer_active ? Number(room.offer_percent) || 0 : 0;
  const perNightAfter = offerPct ? round2(perNight * (1 - offerPct / 100)) : perNight;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.4) }}
      className="group bg-white flex flex-col overflow-hidden shadow-[0_1px_0_rgba(94,20,30,0.04)] hover:shadow-[0_20px_50px_-20px_rgba(94,20,30,0.35)] transition-all duration-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={img}
          alt={room.name}
          fill
          quality={78}
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-70" />

        {offerPct > 0 && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold text-maroon text-[10px] font-semibold tracking-[0.12em] uppercase shadow">
            <Sparkles size={12} /> {room.offer_label || `${offerPct}% Off`}
          </span>
        )}
        <span className="absolute bottom-3 left-3 text-[10px] tracking-[0.2em] uppercase text-cream/90">
          Room {room.room_number}{room.floor ? ` · ${room.floor}` : ''}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5 md:p-6">
        <h3 className="font-serif text-2xl font-light text-ink">{room.name}</h3>
        {room.subtitle && <p className="text-[13px] text-maroon/80 mt-0.5">{room.subtitle}</p>}

        <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted">
          {room.bed_type && <span className="inline-flex items-center gap-1"><BedDouble size={13} /> {room.bed_type}</span>}
          <span className="inline-flex items-center gap-1"><Users size={13} /> Up to {room.max_guests}</span>
          {room.size_sqft && <span className="inline-flex items-center gap-1"><Maximize2 size={13} /> {room.size_sqft} sq.ft</span>}
        </div>

        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {room.amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-[10px] tracking-[0.05em] text-maroon/70 border border-maroon/15 px-2 py-1">{a}</span>
            ))}
            {room.amenities.length > 4 && (
              <span className="text-[10px] text-muted px-1 py-1">+{room.amenities.length - 4} more</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-5 flex items-end justify-between border-t border-maroon/10 mt-5">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted">From</p>
            <p className="mt-0.5 flex items-baseline gap-2">
              {offerPct > 0 && <span className="text-sm text-muted/70 line-through">{inr(perNight)}</span>}
              <span className="font-serif text-2xl text-maroon">{inr(perNightAfter)}</span>
              <span className="text-[11px] text-muted">/ night</span>
            </p>
            <p className="text-[10px] text-muted mt-0.5">+ {Number(room.gst_rate) || 0}% GST</p>
          </div>
          <button
            onClick={onBook}
            className="relative overflow-hidden px-4 py-2.5 text-[10px] tracking-[0.25em] uppercase bg-maroon text-cream group/btn"
          >
            <span className="absolute inset-0 bg-gold translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
            <span className="relative group-hover/btn:text-maroon transition-colors">Book</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* --------------------------------------------------------- booking sheet */
function BookingSheet({ room, onClose }: { room: SuiteRoom; onClose: () => void }) {
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 1));
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  const images = room.images?.length ? room.images : [FALLBACK_IMG];
  const nights = nightsBetween(checkIn, checkOut);
  const p = useMemo(() => preview(room, nights), [room, nights]);

  // Keep check-out strictly after check-in.
  useEffect(() => {
    if (nightsBetween(checkIn, checkOut) < 1) setCheckOut(addDaysISO(checkIn, 1));
  }, [checkIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setErr(null);
    if (nights < 1) { setErr('Please choose a valid check-in and check-out.'); return; }
    if (!name.trim()) { setErr('Please enter your name.'); return; }
    if (!/^\+?[0-9\s-]{7,15}$/.test(phone.trim())) { setErr('Please enter a valid phone number.'); return; }
    if (!agreed) { setErr('Please accept the terms to continue.'); return; }

    try {
      setSending(true);
      const json = await apiFetch<any>('/api/suite-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || undefined,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          notes: notes.trim() || undefined,
        }),
      });

      const booking = json.data;
      const rzpCfg = json.razorpay;
      if (!rzpCfg?.order_id) throw new Error('Could not start payment. Please retry.');

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Could not load the payment gateway. Please retry.');

      let paid = false;
      const releaseHold = () => {
        if (paid) return;
        fetch(`/api/suite-bookings/${booking.id}?order_id=${encodeURIComponent(rzpCfg.order_id)}`, {
          method: 'DELETE', keepalive: true,
        }).catch(() => {});
      };

      const rz = new (window as any).Razorpay({
        key: rzpCfg.key_id,
        amount: rzpCfg.amount,
        currency: rzpCfg.currency,
        order_id: rzpCfg.order_id,
        name: 'TRESSA · Premium Suites',
        description: `${room.name} · ${nights} night${nights > 1 ? 's' : ''}`,
        prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() },
        theme: { color: '#5E141E' },
        handler: async (resp: any) => {
          paid = true;
          try {
            const vj = await apiFetch<any>('/api/suite-bookings/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: booking.id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            setConfirmed({
              booking_code: vj.data.booking_code,
              room_name: vj.data.room_name,
              room_number: vj.data.room_number,
              check_in: vj.data.check_in?.slice(0, 10),
              check_out: vj.data.check_out?.slice(0, 10),
              nights: vj.data.nights,
              total_amount: vj.data.total_amount,
            });
          } catch (verErr: any) {
            setErr(verErr?.message || 'Payment verification failed. If you were charged, contact us with your payment ID.');
          } finally {
            setSending(false);
          }
        },
        modal: {
          ondismiss: () => { setSending(false); releaseHold(); setErr('Payment cancelled. No amount was charged.'); },
        },
      });
      rz.on('payment.failed', () => { setSending(false); releaseHold(); setErr('Payment failed. Please try again.'); });
      rz.open();
    } catch (e: any) {
      setSending(false);
      setErr(e?.code === 'ALREADY_BOOKED' ? e.message : (e?.message || 'Something went wrong. Please retry.'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-4xl md:h-auto md:max-h-[92vh] h-[92vh] mt-auto md:mt-0 bg-[#fdf8ea] overflow-y-auto shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-black/40 text-cream hover:bg-maroon transition-colors rounded-full"
        >
          <X size={18} />
        </button>

        <div className="md:grid md:grid-cols-2">
          {/* image side */}
          <div className="relative h-56 sm:h-72 md:h-full min-h-[240px]">
            <Image
              src={images[imgIdx] || FALLBACK_IMG}
              alt={room.name}
              fill
              quality={82}
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-cream hover:bg-maroon rounded-full"
                  aria-label="Previous photo"
                ><ChevronLeft size={18} /></button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-cream hover:bg-maroon rounded-full"
                  aria-label="Next photo"
                ><ChevronRight size={18} /></button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? 'bg-gold' : 'bg-cream/50'}`} />
                  ))}
                </div>
              </>
            )}
            {p.offerPct > 0 && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold text-maroon text-[10px] font-semibold tracking-[0.12em] uppercase">
                <Sparkles size={12} /> {room.offer_label || `${p.offerPct}% Off`}
              </span>
            )}
          </div>

          {/* content side */}
          <div className="p-5 sm:p-7">
            {confirmed ? (
              <ConfirmationView confirmed={confirmed} onClose={onClose} />
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-maroon">Room {room.room_number}</p>
                  <h3 className="font-serif text-2xl md:text-3xl font-light text-ink mt-1">{room.name}</h3>
                  {room.description && <p className="text-[13px] text-muted mt-2 leading-relaxed">{room.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Check-in" icon={<CalendarDays size={13} />}>
                    <input type="date" value={checkIn} min={todayISO()} required
                      onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Check-out" icon={<CalendarDays size={13} />}>
                    <input type="date" value={checkOut} min={addDaysISO(checkIn, 1)} required
                      onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <Field label={`Guests · up to ${room.max_guests}`} icon={<Users size={13} />}>
                  <input type="number" min={1} max={room.max_guests} value={guests}
                    onChange={(e) => setGuests(Math.max(1, Math.min(room.max_guests, Number(e.target.value) || 1)))}
                    className={inputCls} />
                </Field>

                {/* price breakdown */}
                <div className="bg-white border border-maroon/10 p-4 space-y-2 text-[13px]">
                  <Row label={`${inr(p.perNight)} × ${nights} night${nights > 1 ? 's' : ''}`} value={inr(p.base)} />
                  {p.discount > 0 && (
                    <Row label={<span className="text-maroon">{room.offer_label || `Offer (${p.offerPct}%)`}</span>}
                      value={<span className="text-maroon">− {inr(p.discount)}</span>} />
                  )}
                  <Row label={`GST (${p.gstRate}%)`} value={inr(p.gst)} muted />
                  <div className="pt-2 mt-1 border-t border-maroon/10 flex items-center justify-between">
                    <span className="text-[11px] tracking-[0.2em] uppercase text-muted">Total payable</span>
                    <span className="font-serif text-2xl text-maroon">{inr(p.total)}</span>
                  </div>
                  {p.discount > 0 && (
                    <p className="text-[11px] text-green-700">You save {inr(p.discount)} with this offer.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required
                    autoComplete="name" className={inputCls} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" type="tel" required
                      autoComplete="tel" className={inputCls} />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email"
                      autoComplete="email" className={inputCls} />
                  </div>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests (optional)"
                    className={inputCls} />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-maroon flex-shrink-0" />
                  <span className="text-[11px] text-muted leading-relaxed">
                    I agree to TRESSA World&apos;s{' '}
                    <a href="/terms" target="_blank" rel="noopener" className="text-maroon underline hover:text-gold">Terms &amp; Policy</a>{' '}
                    and understand the full stay amount is charged now to confirm this room.
                  </span>
                </label>

                {err && (
                  <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 px-3 py-2">{err}</p>
                )}

                <button type="submit" disabled={sending || !agreed || nights < 1}
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

/* ------------------------------------------------------- confirmation */
function ConfirmationView({ confirmed, onClose }: { confirmed: Confirmed; onClose: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-14 h-14 mx-auto rounded-full border-2 border-gold flex items-center justify-center text-gold">
        <Check size={26} />
      </div>
      <h3 className="font-serif text-2xl md:text-3xl mt-5 font-light text-maroon">Booking Confirmed</h3>
      <p className="text-[13px] text-muted mt-1">Your premium room is reserved.</p>

      <div className="mt-6 bg-white border border-maroon/10 p-5 text-left space-y-2.5">
        <InfoRow k="Booking code" v={<span className="font-mono tracking-[0.2em] text-maroon">{confirmed.booking_code}</span>} />
        <InfoRow k="Room" v={`${confirmed.room_name} · #${confirmed.room_number}`} />
        <InfoRow k="Check-in" v={prettyDate(confirmed.check_in)} />
        <InfoRow k="Check-out" v={prettyDate(confirmed.check_out)} />
        <InfoRow k="Nights" v={String(confirmed.nights)} />
        <InfoRow k="Paid" v={<span className="font-medium text-maroon">{inr(Number(confirmed.total_amount))}</span>} />
      </div>

      <p className="mt-4 text-[12px] text-muted">
        Please save your booking code. Show it at reception on arrival.
      </p>
      <button onClick={onClose}
        className="mt-6 w-full py-3.5 text-[11px] tracking-[0.3em] uppercase bg-maroon text-cream">
        Done
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- atoms */
const inputCls =
  'w-full bg-white border border-maroon/15 text-ink text-sm px-3 py-2.5 focus:outline-none focus:border-gold transition-colors';

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] tracking-[0.25em] uppercase text-maroon mb-1.5 flex items-center gap-1.5">{icon} {label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted' : 'text-ink'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted">{k}</span>
      <span className="text-ink text-right">{v}</span>
    </div>
  );
}
