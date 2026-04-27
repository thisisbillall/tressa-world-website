'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Users, Calendar, Clock, Bed } from 'lucide-react';
import { TIME_SLOTS } from '@/lib/venueConfig';
import type { SlotId, Suite, Table, VenueId } from '@/lib/venueTypes';
import { useRealtime } from '@/hooks/useRealtime';
import { broadcastTables } from '@/utils/broadcast';
import { apiFetch } from '@/lib/apiClient';

type Props = {
  open: boolean;
  venue: VenueId;
  selectedTable: Table | null;
  selectedSuite: Suite | null;
  slot: SlotId;
  date: string;
  onClose: () => void;
};

type Result = { id: string; message: string; reference?: string; bookingCode?: string };

declare global {
  interface Window { Razorpay: any }
}

// Singleton promise so a prefetch + post-POST call don't start two requests.
let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-rzp-checkout]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.dataset.rzpCheckout = 'true';
    s.onload = () => resolve(true);
    s.onerror = () => {
      razorpayScriptPromise = null; // allow retry on next submit
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return razorpayScriptPromise;
}

export default function BookingPanel({ open, venue, selectedTable, selectedSuite, slot, date, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSuite = !!selectedSuite;
  const slotLabel = TIME_SLOTS.find((s) => s.id === slot)?.label;
  const slotStart = TIME_SLOTS.find((s) => s.id === slot)?.start ?? '19:00';

  // Warm up the Razorpay checkout script the instant the panel opens.
  // Fetching it in parallel with the user filling in the form means the
  // modal opens instantly after the booking POST returns, instead of waiting
  // for a 50-100 KB download to complete.
  useEffect(() => {
    if (open) void loadRazorpayScript();
  }, [open]);

  // Live suite pricing — fetched fresh from /api/suites each time a suite is
  // selected, re-fetched whenever the suites table changes via SSE.
  const [livePriceNight, setLivePriceNight] = useState<number | null>(null);

  const refreshSuitePrice = useCallback(async () => {
    if (!selectedSuite) { setLivePriceNight(null); return; }
    try {
      const j = await apiFetch<any[]>('/api/suites', { cache: 'no-store' });
      const match = (j.data || []).find(
        (s: any) => s.name?.toLowerCase() === selectedSuite.name.toLowerCase(),
      );
      if (match) setLivePriceNight(Number(match.price_per_night));
    } catch {}
  }, [selectedSuite]);

  useEffect(() => { refreshSuitePrice(); }, [refreshSuitePrice]);

  useRealtime({
    tables: ['suites'],
    onInsert: refreshSuitePrice,
    onUpdate: refreshSuitePrice,
    onDelete: refreshSuitePrice,
  });

  const priceNight = livePriceNight ?? selectedSuite?.priceNight ?? 0;

  // Live per-person table charge, pulled from venue_charges + auto-synced via SSE.
  const [venueCharge, setVenueCharge] = useState<number>(0);

  const refreshVenueCharge = useCallback(async () => {
    if (isSuite) { setVenueCharge(0); return; }
    try {
      const j = await apiFetch<any[]>('/api/venue-charges', { cache: 'no-store' });
      const match = (j.data || []).find((c: any) => c.venue === venue);
      setVenueCharge(match ? Number(match.price_per_person) || 0 : 0);
    } catch {
      setVenueCharge(0);
    }
  }, [isSuite, venue]);

  useEffect(() => { refreshVenueCharge(); }, [refreshVenueCharge]);

  useRealtime({
    tables: ['venue_charges'],
    onInsert: refreshVenueCharge,
    onUpdate: refreshVenueCharge,
    onDelete: refreshVenueCharge,
  });

  // Seat-aware guest range. For a 6-seat table: default 5, min 5, no hard max.
  // Anything above the seat count is accepted but flagged as a special booking
  // (server double-checks via findTableSeats — client can't forge the flag).
  const tableSeats = selectedTable?.seats ?? 0;
  const minGuests = isSuite ? 1 : Math.max(1, tableSeats - 1);
  const defaultGuests = isSuite ? 2 : minGuests;

  const [guestCount, setGuestCount] = useState<number>(defaultGuests);

  // Re-seed whenever the selected table changes (opening a different table
  // panel shouldn't keep the stale guest count from a previous one).
  useEffect(() => { setGuestCount(defaultGuests); }, [defaultGuests]);

  const isSpecial = !isSuite && tableSeats > 0 && guestCount > tableSeats;
  const tableTotal = isSuite ? 0 : venueCharge * guestCount;

  // Guest must explicitly accept the T&C before payment / confirmation runs.
  // Reset whenever the panel opens for a fresh booking, otherwise a previous
  // session's "agreed" state would silently carry over.
  const [agreedTerms, setAgreedTerms] = useState(false);
  useEffect(() => {
    if (open) {
      setAgreedTerms(false);
      setErrorMsg(null);
    }
  }, [open, selectedTable, selectedSuite]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setErrorMsg(null);

    if (!agreedTerms) {
      setErrorMsg('Please accept the Terms & Conditions to continue.');
      return;
    }

    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    const email = String(f.get('email') || '').trim();
    const guests = Number(f.get('guests') || 2);
    const notes = String(f.get('notes') || '').trim() || undefined;

    // Venue mapping: BookingClient uses 'suites' (plural); API expects 'suite'.
    const payload: any = {
      venue: isSuite ? 'suite' : venue,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      notes,
    };

    if (isSuite) {
      payload.suite_name = selectedSuite!.name;
      payload.check_in = String(f.get('checkin') || '');
      payload.check_out = String(f.get('checkout') || '');
      payload.guests = guests;
    } else {
      payload.reservation_date = date;
      payload.reservation_time = slotStart;
      payload.slot_id = slot;
      payload.table_ref = selectedTable!.label;
      payload.guests = guests;
    }

    try {
      setSending(true);

      const json = await apiFetch<any>('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const booking = json.data;
      broadcastTables(['bookings']);

      const rzpCfg = json.razorpay;

      // No payment needed (charge is 0) — confirmation immediately.
      if (!rzpCfg?.order_id) {
        const msg = isSuite
          ? `${selectedSuite!.name} reserved from ${payload.check_in} to ${payload.check_out}.`
          : `Table ${selectedTable!.label} reserved at the ${venue}, ${date} · ${slotLabel}.`;
        setResult({
          id: booking.id,
          reference: `BKG-${String(booking.id).slice(0, 8).toUpperCase()}`,
          message: msg,
          bookingCode: booking.booking_code,
        });
        setSending(false);
        return;
      }

      // Payment required — open Razorpay checkout (tables & suites both).
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load payment gateway');

      const description = isSuite
        ? `${selectedSuite!.name} · ${booking.nights} night${booking.nights > 1 ? 's' : ''}`
        : `Table ${selectedTable!.label} · ${guests} guest${guests > 1 ? 's' : ''} · ${slotLabel}`;

      // If the user closes the Razorpay modal or payment fails, release the
      // slot so the table becomes available again. To avoid a perceived delay
      // we do this optimistically: broadcast locally + paint the UI now, and
      // send the DELETE as fire-and-forget with `keepalive: true` so it still
      // completes even if the user navigates away or closes the tab.
      //
      // Server-side: webhook (payment.failed) and TTL sweep are the backstop
      // if the DELETE never lands.
      let paid = false;
      const releaseSlot = (reason: string) => {
        if (paid) return;
        // 1. Optimistic UI — instant.
        broadcastTables(['bookings']);
        setErrorMsg(
          reason === 'dismissed'
            ? 'Booking cancelled. The table is available again.'
            : 'Payment failed. The table is available again — please try booking again.',
        );
        // 2. Fire-and-forget network call. `keepalive` lets it finish after
        // the page unloads; no await means the UI never waits on it.
        fetch(`/api/bookings/${booking.id}?order_id=${encodeURIComponent(rzpCfg.order_id)}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => {});
      };

      const rz = new window.Razorpay({
        key: rzpCfg.key_id,
        amount: rzpCfg.amount,
        currency: rzpCfg.currency,
        order_id: rzpCfg.order_id,
        name: 'TRESSA World',
        description,
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
            const paidAmt = Number(vj.data.amount || 0).toLocaleString('en-IN');
            const msg = isSuite
              ? `${selectedSuite!.name} booked from ${payload.check_in} to ${payload.check_out}. Payment of ₹ ${paidAmt} confirmed.`
              : `Table ${selectedTable!.label} confirmed at the ${venue}, ${date} · ${slotLabel}. Payment of ₹ ${paidAmt} confirmed.`;
            setResult({
              id: vj.data.id,
              reference: `BKG-${String(vj.data.id).slice(0, 8).toUpperCase()}`,
              message: msg,
              bookingCode: vj.data.booking_code,
            });
          } catch (err: any) {
            setErrorMsg(err?.message || 'Payment verification failed');
          } finally {
            setSending(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSending(false);
            releaseSlot('dismissed');
          },
        },
      });
      rz.on('payment.failed', () => {
        setSending(false);
        releaseSlot('failed');
      });
      rz.open();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong');
      setSending(false);
    }
  };

  const close = () => {
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  const nights = useMemo(() => {
    if (!isSuite || !selectedSuite) return 0;
    const dates = selectedSuite.availableDates ?? [];
    if (dates.length < 2) return 0;
    const a = new Date(dates[0]);
    const b = new Date(dates[1]);
    const ms = b.getTime() - a.getTime();
    return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : 1;
  }, [isSuite, selectedSuite]);

  return (
    <AnimatePresence>
      {open && (selectedTable || selectedSuite) && (
        <motion.aside
          key="panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.55, ease: [0.77, 0, 0.175, 1] }}
          className="fixed top-0 right-0 h-full z-50 w-full sm:w-[480px] bg-white text-ink shadow-[0_0_80px_rgba(94,20,30,0.18)] overflow-y-auto border-l border-maroon/10"
        >
          <div className="relative min-h-full">
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center border border-maroon/20 text-maroon hover:border-gold hover:text-gold transition-colors"
            >
              <X size={16} />
            </button>

            <div className="p-8 pt-20">
              {result ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-gold flex items-center justify-center text-gold text-3xl">✓</div>
                  <h3 className="font-serif text-3xl mt-6 font-light text-maroon">Confirmed</h3>
                  {result.reference && (
                    <p className="text-[10px] tracking-[0.3em] uppercase text-gold mt-2">{result.reference}</p>
                  )}
                  <p className="mt-6 text-sm text-muted leading-relaxed">{result.message}</p>

                  {result.bookingCode && (
                    <div className="mt-8 bg-gold/10 border border-gold px-5 py-5 text-left">
                      <p className="text-[9px] tracking-[0.35em] uppercase text-maroon">
                        Instant 15% off · Show at visit
                      </p>
                      <p className="mt-3 font-mono text-2xl tracking-[0.25em] text-maroon text-center">
                        {result.bookingCode}
                      </p>
                      <p className="mt-3 text-[11px] text-muted/80 leading-relaxed">
                        Present this code at our in-venue app when billing to unlock 15% off your total bill.
                      </p>
                    </div>
                  )}

                  <p className="mt-6 text-xs text-muted/70">A confirmation SMS has been sent to your phone.</p>
                  <button onClick={close} className="btn-primary mt-10"><span>Done</span></button>
                </motion.div>
              ) : (
                <>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-maroon">{isSuite ? 'Suite Booking' : 'Table Reservation'}</p>
                  <h3 className="font-serif text-3xl md:text-4xl font-light mt-2 text-ink">
                    {isSuite ? selectedSuite!.name : `Table ${selectedTable!.label}`}
                  </h3>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] tracking-[0.15em] uppercase">
                    {isSuite ? (
                      <>
                        <Info icon={<Bed size={12} />} label={`${selectedSuite!.beds} Bed${selectedSuite!.beds > 1 ? 's' : ''}`} />
                        <Info label={`${selectedSuite!.sqft} sq.ft`} />
                        <Info label={selectedSuite!.tag} />
                        <Info label={`₹ ${priceNight.toLocaleString('en-IN')}/nt`} highlight />
                      </>
                    ) : (
                      <>
                        <Info icon={<Users size={12} />} label={`${selectedTable!.seats} Seats`} />
                        <Info label={selectedTable!.shape} />
                        <Info icon={<Clock size={12} />} label={slotLabel ?? ''} />
                        <Info icon={<Calendar size={12} />} label={date} />
                      </>
                    )}
                  </div>

                  <form onSubmit={submit} className="mt-8 space-y-5">
                    <TextInput label="Full Name" name="name" required />
                    <TextInput label="Phone" name="phone" type="tel" required />
                    <TextInput label="Email" name="email" type="email" required />

                    {isSuite ? (
                      <div className="grid grid-cols-2 gap-4">
                        <TextInput label="Check-In" name="checkin" type="date" required defaultValue={selectedSuite!.availableDates[0]} />
                        <TextInput label="Check-Out" name="checkout" type="date" required defaultValue={selectedSuite!.availableDates[1]} />
                      </div>
                    ) : null}

                    <TextInput
                      label={
                        isSuite
                          ? 'Guests'
                          : `Guests · min ${minGuests} · ${tableSeats}+ seats`
                      }
                      name="guests"
                      type="number"
                      min={minGuests}
                      max={isSuite ? 8 : undefined}
                      value={guestCount}
                      required
                      onChange={(e: any) => {
                        const n = Number(e.target.value || 0);
                        if (Number.isFinite(n) && n > 0) setGuestCount(n);
                      }}
                    />

                    {isSpecial && (
                      <p className="text-[11px] tracking-[0.15em] text-maroon bg-gold/10 border border-gold/30 px-3 py-2 leading-relaxed">
                        This table seats {tableSeats}. Booking for {guestCount} will be
                        marked a <strong>special booking</strong> — our team will
                        arrange extra seating. Per-guest charge is unchanged.
                      </p>
                    )}

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-maroon mb-2">Special Requests</label>
                      <textarea
                        name="notes"
                        rows={2}
                        className="w-full bg-transparent border-b border-maroon/20 text-ink text-sm py-2 focus:outline-none focus:border-gold transition-colors resize-none"
                      />
                    </div>

                    {isSuite && nights > 0 && priceNight > 0 && (
                      <div className="flex items-center justify-between bg-gold/5 border border-gold/20 px-4 py-3">
                        <span className="text-[10px] tracking-[0.25em] uppercase text-muted">
                          Est. {nights} night{nights > 1 ? 's' : ''}
                        </span>
                        <span className="font-serif text-lg text-maroon">
                          ₹ {(priceNight * nights).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {!isSuite && venueCharge > 0 && (
                      <div className="flex items-center justify-between bg-gold/5 border border-gold/20 px-4 py-3">
                        <span className="text-[10px] tracking-[0.25em] uppercase text-muted">
                          ₹ {venueCharge.toLocaleString('en-IN')} × {guestCount} guest{guestCount > 1 ? 's' : ''}
                        </span>
                        <span className="font-serif text-lg text-maroon">
                          ₹ {tableTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3 border border-gold/40 bg-gold/[0.06] px-4 py-3">
                      <span className="text-gold font-serif text-lg leading-none pt-0.5">%</span>
                      <div>
                        <p className="text-[10px] tracking-[0.25em] uppercase text-maroon font-medium">
                          GET UPTO 15% off at the venue
                        </p>
                        {/* <p className="text-[11px] text-muted leading-relaxed mt-1">
                          We'll SMS you a unique code after booking — show it at our
                          in-venue app when billing and get upto 15% off your total bill.
                        </p> */}
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-maroon flex-shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] text-muted leading-relaxed">
                        I agree to TRESSA World&apos;s{' '}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener"
                          className="text-maroon underline hover:text-gold"
                        >
                          Terms &amp; Refund Policy
                        </a>
                        {(isSuite || tableTotal > 0) && (
                          <>, including the cancellation and refund rules that apply to this booking</>
                        )}
                        .
                      </span>
                    </label>

                    {errorMsg && (
                      <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={sending || !agreedTerms}
                      className="w-full relative overflow-hidden py-4 text-[11px] tracking-[0.3em] uppercase bg-maroon text-cream font-medium group disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                      <span className="relative group-hover:text-maroon transition-colors">
                        {sending
                          ? (tableTotal > 0 || isSuite ? 'Processing…' : 'Confirming…')
                          : (isSuite
                              ? 'Pay & Confirm'
                              : tableTotal > 0
                                ? `Pay ₹${tableTotal.toLocaleString('en-IN')} & Confirm`
                                : 'Confirm Booking')}
                      </span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Info({ icon, label, highlight }: { icon?: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border px-3 py-2 ${highlight ? 'border-gold text-maroon bg-gold/10' : 'border-maroon/15 text-muted'}`}>
      {icon}
      <span className="truncate">{label}</span>
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
