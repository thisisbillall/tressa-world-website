'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, ChevronDown, Clock, Users, Loader2, ShieldCheck, BadgePercent } from 'lucide-react';
import {
  BOOKING_DISCOUNT_PERCENT,
  BOOKING_FEE_INR,
  isPriorityTime,
  listBookingTimes,
  PRIORITY_WINDOWS,
} from '@/lib/venueConfig';
import {
  type BookingConfig,
  isPriorityTimeFor,
  listBookingTimesFor,
} from '@/lib/bookingConfig';
import type { VenueId } from '@/lib/venueTypes';
import { sky, soul, unwind } from '@/lib/brandImages';
import { apiFetch } from '@/lib/apiClient';
import { broadcastTables } from '@/utils/broadcast';

type ApiVenue = 'restaurant' | 'rooftop' | 'bar' | 'suite';

// Presentation-only metadata. The enabled flag + disabled_reason + every
// numeric setting (fee / discount / window / step / priority windows) lives
// in the booking_config table and is fetched at mount time. The fallback*
// fields are only used until /api/booking-config responds.
const VENUES_META: {
  id: VenueId;
  apiVenue: ApiVenue;
  label: string;
  tag: string;
  hero: { src: string; alt: string };
  fallbackDisabled?: boolean;
  fallbackDisabledReason?: string;
}[] = [
    {
      id: 'restaurant',
      apiVenue: 'restaurant',
      label: 'Soul',
      tag: 'Family Restaurant',
      hero: { src: soul[0]?.src ?? '', alt: soul[0]?.alt ?? 'TRESSA Soul' },
    },
    {
      id: 'bar',
      apiVenue: 'bar',
      label: 'Unwind',
      tag: 'Signature Bar',
      hero: { src: unwind[0]?.src ?? '', alt: unwind[0]?.alt ?? 'TRESSA Unwind' },
    },
    {
      id: 'rooftop',
      apiVenue: 'rooftop',
      label: 'Sky',
      tag: 'Rooftop Lounge',
      fallbackDisabled: true,
      fallbackDisabledReason: 'Sky is temporarily closed. Please check back soon.',
      hero: { src: sky[0]?.src ?? '', alt: sky[0]?.alt ?? 'TRESSA Sky' },
    },
    {
      id: 'suites',
      apiVenue: 'suite',
      label: 'Aura',
      tag: 'Luxury Suites',
      hero: { src: sky[3]?.src ?? sky[0]?.src ?? '', alt: 'TRESSA Aura — Luxury Suites' },
      fallbackDisabled: true,
      fallbackDisabledReason: 'Aura suite booking opens soon. Stay tuned.',
    },
  ];

declare global {
  interface Window { Razorpay: any }
}

let razorpayScriptPromise: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.dataset.rzpCheckout = 'true';
    s.onload = () => resolve(true);
    s.onerror = () => { razorpayScriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return razorpayScriptPromise;
}

type ConfirmedBooking = {
  id: string;
  booking_code: string;
  code_expires_at: string | null;
  reservation_time: string | null;
};

export default function BookingClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [configs, setConfigs] = useState<BookingConfig[] | null>(null);

  // Merge presentation metadata with the DB row so the per-row enabled flag
  // and disabled_reason from booking_config drive the UI. Until the fetch
  // returns, fall back to the values that ship in code.
  const venues = useMemo(() => {
    return VENUES_META.map((m) => {
      const row = configs?.find((c) => c.venue === m.apiVenue);
      const disabled = row ? !row.enabled : !!m.fallbackDisabled;
      const disabledReason = row?.disabled_reason ?? m.fallbackDisabledReason;
      return { ...m, disabled, disabledReason };
    });
  }, [configs]);

  const initialId = (() => {
    const q = searchParams.get('venue') as VenueId | null;
    return q && VENUES_META.some((v) => v.id === q) ? q : 'restaurant';
  })();

  const [venueId, setVenueId] = useState<VenueId>(initialId);
  const venue = useMemo(
    () => venues.find((v) => v.id === venueId) ?? venues[0],
    [venues, venueId],
  );

  const cfg = useMemo(
    () => configs?.find((c) => c.venue === venue.apiVenue) ?? null,
    [configs, venue],
  );

  const fee = cfg?.booking_fee_inr ?? BOOKING_FEE_INR;
  const discount = cfg?.discount_percent ?? BOOKING_DISCOUNT_PERCENT;
  const priorityWindows = cfg?.priority_windows ?? PRIORITY_WINDOWS;

  const times = useMemo(
    () => (cfg ? listBookingTimesFor(cfg) : listBookingTimes()),
    [cfg],
  );
  const exclusiveTimes = useMemo(() => times.filter((t) => t.priority), [times]);
  const premiumTimes = useMemo(() => times.filter((t) => !t.priority), [times]);
  const defaultTime = exclusiveTimes[0]?.value ?? times[0]?.value ?? '15:00';

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slotType, setSlotType] = useState<'exclusive' | 'premium'>('exclusive');
  const [time, setTime] = useState<string>(defaultTime);
  const [guests, setGuests] = useState<number>(2);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  useEffect(() => { void loadRazorpayScript(); }, []);

  useEffect(() => {
    let alive = true;
    apiFetch<BookingConfig[]>('/api/booking-config', { cache: 'no-store' })
      .then((j) => { if (alive) setConfigs(j.data); })
      .catch(() => { /* keep static fallback */ });
    return () => { alive = false; };
  }, []);

  // When cfg changes (venue switch, or DB load), keep slotType + time valid.
  // Auto-flip to whichever pool has options, and reset time if the current
  // value isn't in the active pool.
  useEffect(() => {
    let nextType = slotType;
    if (nextType === 'exclusive' && exclusiveTimes.length === 0 && premiumTimes.length > 0) nextType = 'premium';
    if (nextType === 'premium' && premiumTimes.length === 0 && exclusiveTimes.length > 0) nextType = 'exclusive';
    if (nextType !== slotType) setSlotType(nextType);
    const pool = nextType === 'exclusive' ? exclusiveTimes : premiumTimes;
    if (pool.length > 0 && !pool.some((t) => t.value === time)) setTime(pool[0]!.value);
  }, [exclusiveTimes, premiumTimes, slotType, time]);

  const switchSlotType = (next: 'exclusive' | 'premium') => {
    if (next === slotType) return;
    setSlotType(next);
    const pool = next === 'exclusive' ? exclusiveTimes : premiumTimes;
    if (!pool.some((t) => t.value === time)) {
      setTime(pool[0]?.value ?? defaultTime);
    }
  };

  const selectVenue = (id: VenueId) => {
    const v = venues.find((x) => x.id === id);
    if (!v || v.disabled) return;
    setVenueId(id);
    setErrorMsg(null);
    setConfirmed(null);
    router.replace(`/booking?venue=${id}`, { scroll: false });
  };

  const priority = cfg ? isPriorityTimeFor(cfg, time) : isPriorityTime(time);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setErrorMsg(null);

    if (venue.disabled) {
      setErrorMsg(venue.disabledReason || 'Bookings not open for this venue yet.');
      return;
    }
    if (!agreed) {
      setErrorMsg('Please accept the Terms & non-refundable reservation policy to continue.');
      return;
    }
    if (guests < 1 || guests > 20) {
      setErrorMsg('Guests must be between 1 and 20.');
      return;
    }

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const notes = String(fd.get('notes') || '').trim() || undefined;

    const payload = {
      venue: venue.apiVenue,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      reservation_date: date,
      reservation_time: time,
      guests,
      notes,
    };

    try {
      setSending(true);
      const json = await apiFetch<any>('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const booking = json.data;
      const rzpCfg = json.razorpay;
      broadcastTables(['bookings']);

      if (!rzpCfg?.order_id) {
        setConfirmed({
          id: booking.id,
          booking_code: booking.booking_code,
          code_expires_at: booking.code_expires_at,
          reservation_time: booking.reservation_time,
        });
        setSending(false);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load the payment gateway. Please retry.');

      let paid = false;
      const releaseSlot = (reason: 'dismissed' | 'failed') => {
        if (paid) return;
        broadcastTables(['bookings']);
        setErrorMsg(
          reason === 'dismissed'
            ? 'Booking cancelled. No payment was charged.'
            : 'Payment failed. Please try booking again.',
        );
        fetch(`/api/bookings/${booking.id}?order_id=${encodeURIComponent(rzpCfg.order_id)}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => { });
      };

      const rz = new window.Razorpay({
        key: rzpCfg.key_id,
        amount: rzpCfg.amount,
        currency: rzpCfg.currency,
        order_id: rzpCfg.order_id,
        name: 'TRESSA PAY',
        description: `${venue.label} · ${date} · ${time} · ${guests} guest${guests > 1 ? 's' : ''}`,
        prefill: { name, email, contact: phone },
        theme: { color: '#5E141E' },
        handler: async (response: any) => {
          paid = true;
          try {
            const vj = await apiFetch<any>('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: booking.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            broadcastTables(['bookings']);
            setConfirmed({
              id: vj.data.id,
              booking_code: vj.data.booking_code,
              code_expires_at: vj.data.code_expires_at,
              reservation_time: vj.data.reservation_time,
            });
          } catch (err: any) {
            setErrorMsg(err?.message || 'Payment verification failed.');
          } finally {
            setSending(false);
          }
        },
        modal: { ondismiss: () => { setSending(false); releaseSlot('dismissed'); } },
      });
      rz.on('payment.failed', () => { setSending(false); releaseSlot('failed'); });
      rz.open();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong.');
      setSending(false);
    }
  };

  const confirmedPriority = cfg
    ? isPriorityTimeFor(cfg, confirmed?.reservation_time?.slice(0, 5))
    : isPriorityTime(confirmed?.reservation_time?.slice(0, 5));

  return (
    <main className="min-h-screen bg-[#fdf8ea] text-ink md:h-screen md:overflow-hidden">
      <div className="md:grid md:grid-cols-2 md:h-full">
        {/* LEFT — full-bleed venue image */}
        <motion.aside
          key={venueId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative h-[55vh] md:h-full w-full overflow-hidden bg-black"
        >
          <Image
            src={venue.hero.src}
            alt={venue.hero.alt}
            fill
            priority
            quality={92}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />

          <Link
            href="/"
            className="absolute top-5 left-5 md:top-8 md:left-8 z-10 flex items-center gap-1.5 text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-cream/80 hover:text-gold transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </Link>

          <div className="absolute top-5 right-5 md:top-8 md:right-8 z-10 font-serif tracking-[0.3em] md:tracking-[0.4em] text-cream text-sm md:text-lg">
            TRESSA · BOOK
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-cream">
            <p className="text-[10px] tracking-[0.5em] uppercase text-cream/70 mb-2">Priority Booking</p>
            <h1 className="font-serif text-3xl md:text-5xl font-light leading-tight">{venue.label}</h1>
            <p className="text-[11px] md:text-xs tracking-[0.2em] uppercase mt-1.5 text-cream/80">
              {venue.tag}{venue.disabled ? ' · Temporarily Closed' : ''}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 md:gap-3 max-w-md">
              <Badge dark icon={<BadgePercent size={14} />} title={`${discount}% OFF total bill`} />
              <Badge dark icon={<ShieldCheck size={14} />} title={`₹${fee} booking charge only`} />
            </div>
          </div>
        </motion.aside>

        {/* RIGHT — form column */}
        <section className="md:h-full md:overflow-y-auto px-5 md:px-12 py-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] tracking-[0.5em] uppercase text-maroon mb-2">Reserve your time</p>
            <h2 className=" text-xl md:text-3xl font-light text-ink">
              One step.  <span className="font-extrabold">₹{fee}</span> booking charge, <span className="font-extrabold">{discount}% </span> OFF total bill.
            </h2>
            <p className="mt-2 text-sm text-muted">
              A Tressa-exclusive discount benefit beyond Zomato &amp; Swiggy.
              {priorityWindows.length > 0 && (
                <span className="block mt-1 text-[11px]">
                  <span className="font-extrabold">{discount}% </span>off applies only for bookings in {priorityWindows.map((w) => w.label).join(' or ')}.
                </span>
              )}
              <span className="block mt-1 text-[11px] text-maroon">
                <span className="font-extrabold">₹{fee}</span> is the booking charge only — it is redeemed against your total billing at the venue.
              </span>
            </p>

            <div className="flex flex-wrap gap-2 my-6">
              {venues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVenue(v.id)}
                  disabled={v.disabled}
                  title={v.disabled ? v.disabledReason : undefined}
                  className={`px-3 py-2 text-[10px] md:text-[11px] tracking-[0.25em] uppercase border transition-all ${v.disabled
                      ? 'bg-white/40 border-maroon/10 text-muted/60 cursor-not-allowed italic'
                      : venueId === v.id
                        ? 'bg-maroon text-cream border-maroon'
                        : 'bg-white border-maroon/20 text-maroon hover:border-gold hover:text-gold'
                    }`}
                >
                  {v.label}
                  {v.disabled && <span className="ml-2 text-[8px] opacity-70">closed</span>}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {confirmed ? (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border border-maroon/15 p-6 md:p-8 text-center"
                >
                  <div className="w-14 h-14 mx-auto rounded-full border-2 border-gold flex items-center justify-center text-gold text-2xl">✓</div>
                  <h3 className="font-serif text-2xl md:text-3xl mt-5 font-light text-maroon">Confirmed</h3>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold mt-2">
                    BKG-{confirmed.id.slice(0, 8).toUpperCase()}
                  </p>

                  <div className="mt-6 bg-cream/40 border border-maroon/10 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr/${encodeURIComponent(confirmed.booking_code)}?size=320`}
                      alt={`QR for ${confirmed.booking_code}`}
                      width={240}
                      height={240}
                      className="mx-auto block w-[220px] h-[220px]"
                    />
                    <p className="mt-3 font-mono text-xl tracking-[0.25em] text-maroon">
                      {confirmed.booking_code}
                    </p>
                    {confirmedPriority ? (
                      <p className="mt-2 text-[11px] text-muted">
                        Show this QR / code at the venue for{' '}
                        <strong className="text-maroon">{discount}% OFF</strong> the total bill.
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted">
                        Your Premium slot is reserved. The {discount}% bill discount is not applicable for this time.
                      </p>
                    )}
                    {confirmed.code_expires_at && (
                      <p className="mt-1 text-[10px] tracking-[0.25em] uppercase text-muted">
                        Valid till{' '}
                        {new Date(confirmed.code_expires_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
                          timeZone: 'Asia/Kolkata',
                        })}
                      </p>
                    )}
                  </div>

                  <p className="mt-5 text-xs text-muted">An SMS with the QR + PDF slip link has been sent to your phone.</p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <a
                      href={`/api/booking-pdf/${encodeURIComponent(confirmed.booking_code)}`}
                      target="_blank"
                      rel="noopener"
                      className="px-5 py-2.5 text-[11px] tracking-[0.25em] uppercase bg-gold text-maroon hover:bg-maroon hover:text-cream transition-colors"
                    >
                      Download Slip (PDF)
                    </a>
                    <a
                      href={`/booking/qr/${encodeURIComponent(confirmed.booking_code)}`}
                      target="_blank"
                      rel="noopener"
                      className="px-5 py-2.5 text-[11px] tracking-[0.25em] uppercase border border-maroon text-maroon hover:bg-maroon hover:text-cream transition-colors"
                    >
                      Open QR Page
                    </a>
                    <button
                      onClick={() => { setConfirmed(null); setAgreed(false); }}
                      className="px-5 py-2.5 text-[11px] tracking-[0.25em] uppercase bg-maroon text-cream"
                    >
                      New Booking
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={submit}
                  className="bg-white border border-maroon/15 p-5 md:p-8 space-y-5"
                >
                  {venue.disabled && (
                    <p className="text-[11px] text-maroon bg-gold/10 border border-gold/40 px-3 py-2">
                      {venue.disabledReason || 'Bookings are not open for this venue right now.'}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Date" icon={<CalendarDays size={13} />}>
                      <input
                        type="date"
                        required
                        value={date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-transparent border-b border-maroon/20 text-ink text-sm py-2 focus:outline-none focus:border-gold transition-colors"
                      />
                    </Field>
                    <Field label="Guests" icon={<Users size={13} />}>
                      <input
                        type="number"
                        required
                        min={1}
                        max={20}
                        value={guests}
                        onChange={(e) => setGuests(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                        className="w-full bg-transparent border-b border-maroon/20 text-ink text-sm py-2 focus:outline-none focus:border-gold transition-colors"
                      />
                    </Field>
                  </div>

                  <div>
                    <label className="text-[9px] tracking-[0.3em] uppercase text-maroon mb-2 flex items-center gap-1.5">
                      <Clock size={13} /> Slot type
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => switchSlotType('exclusive')}
                        disabled={exclusiveTimes.length === 0}
                        className={`px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase border transition-all ${slotType === 'exclusive'
                            ? 'bg-maroon text-cream border-maroon'
                            : 'bg-white border-maroon/20 text-maroon hover:border-gold hover:text-gold'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Exclusive · {discount}% OFF
                      </button>
                      <button
                        type="button"
                        onClick={() => switchSlotType('premium')}
                        disabled={premiumTimes.length === 0}
                        className={`px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase border transition-all ${slotType === 'premium'
                            ? 'bg-maroon text-cream border-maroon'
                            : 'bg-white border-maroon/20 text-maroon hover:border-gold hover:text-gold'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Premium
                      </button>
                    </div>
                    <Field label={`Time · ${cfg?.step_min ?? 15}-min slots`} icon={<Clock size={13} />}>
                      <TimeDropdown
                        options={slotType === 'exclusive' ? exclusiveTimes : premiumTimes}
                        value={time}
                        onChange={setTime}
                      />
                    </Field>
                  </div>

                  <div
                    className={`px-3 py-2 text-[11px] border ${priority
                        ? 'bg-gold/10 border-gold/40 text-maroon'
                        : 'bg-cream/40 border-maroon/15 text-muted'
                      }`}
                  >
                    {priority ? (
                      <>
                        <strong className="text-maroon">Exclusive slot.</strong> Get{' '}
                        <strong>{discount}% OFF</strong> on the total bill
                        via Tressa Pay.
                      </>
                    ) : (
                      <>
                        <strong className="text-maroon">Premium slot.</strong> Your reservation is held, but the {discount}% discount
                        {priorityWindows.length > 0
                          ? ` applies only during ${priorityWindows.map((w) => w.label).join(' or ')} (Exclusive).`
                          : ' is not active right now.'}
                      </>
                    )}
                  </div>

                  <TextInput label="Full Name" name="name" required autoComplete="name" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput label="Phone" name="phone" type="tel" required autoComplete="tel" />
                    <TextInput label="Email (optional)" name="email" type="email" autoComplete="email" />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-maroon flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-muted leading-relaxed">
                      I agree to TRESSA World&apos;s{' '}
                      <a href="/terms" target="_blank" rel="noopener" className="text-maroon underline hover:text-gold">
                        Terms &amp; Refund Policy
                      </a>{' '}
                      and acknowledge the ₹{fee} booking charge is redeemed on the total billing at the venue, and is non-refundable if the slot is not used. Sky bookings additionally have a cover charge that is billed with your menu at the venue.
                    </span>
                  </label>

                  {errorMsg && (
                    <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending || !agreed || venue.disabled}
                    className="w-full relative overflow-hidden py-4 text-[11px] tracking-[0.3em] uppercase bg-maroon text-cream font-medium group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative group-hover:text-maroon transition-colors flex items-center justify-center gap-2">
                      {sending && <Loader2 className="animate-spin" size={14} />}
                      {sending ? 'Processing…' : `Pay ₹${fee} Booking Charge & Confirm`}
                    </span>
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] tracking-[0.3em] uppercase text-maroon mb-2 flex items-center gap-1.5">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-[9px] tracking-[0.3em] uppercase text-maroon mb-2">{label}</label>
      <input
        {...rest}
        className="w-full bg-transparent border-b border-maroon/20 text-ink text-sm py-2 focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}

function TimeDropdown({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; priority: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full bg-transparent border-b border-maroon/20 text-ink text-[13px] py-2 flex items-center justify-between focus:outline-none focus:border-gold transition-colors"
      >
        <span>{current?.label ?? 'Select time'}</span>
        <ChevronDown size={14} className={`text-maroon/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-30 max-h-60 overflow-y-auto bg-white border border-maroon/15 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        >
          {options.map((t) => {
            const active = t.value === value;
            return (
              <li
                key={t.value}
                role="option"
                aria-selected={active}
                onClick={() => { onChange(t.value); setOpen(false); }}
                className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${active
                    ? 'bg-maroon text-cream'
                    : 'text-ink hover:bg-cream/60'
                  }`}
              >
                {t.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Badge({ icon, title, dark }: { icon: React.ReactNode; title: string; dark?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border text-[10px] tracking-[0.15em] uppercase ${dark
          ? 'border-gold/60 bg-black/30 text-cream backdrop-blur-sm'
          : 'border-gold/40 bg-gold/5 text-maroon'
        }`}
    >
      <span className="text-gold">{icon}</span>
      <span className="truncate">{title}</span>
    </div>
  );
}
