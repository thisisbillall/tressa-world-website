'use client';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Loader2, BedDouble, Check, Send } from 'lucide-react';

// Staff-only "internal booking" page. Reception is redirected here (prefilled)
// from the POS webapp's "Pay with SMS" flow. It creates the booking and SMSes
// the guest a pay link — reusing the site's existing Razorpay order. Hidden
// from the public site (not linked anywhere), gated by a staff key that is
// validated server-side by /api/suite-bookings/internal-book.

const AUTH_KEY = 'tressa.internal.key';

type SuiteType = {
  name: string;
  base_price: number;
  gst_rate: number;
  offer_percent: number;
  offer_label?: string | null;
  available_rooms: number;
  booking_enabled?: boolean;
};

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const nightsBetween = (a: string, b: string) =>
  a && b ? Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 86400000)) : 0;
const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const addDaysISO = (iso: string, d: number) => {
  const [y, m, dd] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd));
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10);
};

function InternalBooking() {
  const qp = useSearchParams();

  const [staffKey, setStaffKey] = useState('');
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem(AUTH_KEY);
    if (k) { setStaffKey(k); setAuthed(true); }
  }, []);

  // Prefilled from the webapp redirect.
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 1));
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [typeName, setTypeName] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    const ci = qp.get('check_in') || todayISO();
    setCheckIn(ci);
    setCheckOut(qp.get('check_out') || addDaysISO(ci, 1));
    setGuests(qp.get('guests') || '2');
    setName(qp.get('name') || '');
    setPhone((qp.get('phone') || '').replace(/\D/g, '').slice(-10));
    setTypeName(qp.get('type') || '');
    setQuantity(qp.get('quantity') || '1');
  }, [qp]);

  const [types, setTypes] = useState<SuiteType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ref: string; total: number; sms: boolean; url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked — link is still visible */ }
  };

  const cancelHold = async () => {
    if (!result) return;
    setCancelling(true); setErr(null);
    try {
      const r = await fetch('/api/suite-bookings/internal-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': staffKey },
        body: JSON.stringify({ group_ref: result.ref }),
      });
      const j = await r.json();
      if (j.success && j.released > 0) { setResult(null); setErr(null); void loadTypes(); }
      else if (j.success) { setErr(j.note || 'Nothing to cancel — the guest may have already paid.'); }
      else { setErr(j.error || 'Could not cancel'); }
    } catch { setErr('Could not cancel'); }
    finally { setCancelling(false); }
  };

  const nights = nightsBetween(checkIn, checkOut);

  const loadTypes = useCallback(async () => {
    if (!checkIn || !checkOut || nights < 1) { setTypes([]); return; }
    setLoadingTypes(true);
    try {
      const r = await fetch(`/api/suite-types?check_in=${checkIn}&check_out=${checkOut}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.success) {
        setTypes(j.data);
        if (typeName && !j.data.some((t: SuiteType) => t.name === typeName)) setTypeName('');
      }
    } finally {
      setLoadingTypes(false);
    }
  }, [checkIn, checkOut, nights, typeName]);

  useEffect(() => { if (authed) void loadTypes(); }, [authed, loadTypes]);

  const selType = useMemo(() => types.find((t) => t.name === typeName), [types, typeName]);
  const estTotal = useMemo(() => {
    if (!selType) return 0;
    const q = parseInt(quantity) || 1;
    const per = selType.base_price * (1 - (selType.offer_percent || 0) / 100) * (1 + selType.gst_rate / 100) * nights;
    return per * q;
  }, [selType, quantity, nights]);

  const submit = async () => {
    setErr(null);
    if (!name.trim()) return setErr('Enter guest name');
    if (phone.replace(/\D/g, '').length !== 10) return setErr('Enter a valid 10-digit phone');
    if (!typeName) return setErr('Pick a room type');
    if (nights < 1) return setErr('Check-out must be after check-in');

    setBusy(true);
    try {
      const r = await fetch('/api/suite-bookings/internal-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': staffKey },
        body: JSON.stringify({
          type_name: typeName,
          check_in: checkIn,
          check_out: checkOut,
          quantity: parseInt(quantity) || 1,
          customer_name: name.trim(),
          customer_phone: phone,
          guests: parseInt(guests) || 1,
        }),
      });
      const j = await r.json();
      if (r.status === 401) { setErr('Wrong staff key.'); setAuthed(false); localStorage.removeItem(AUTH_KEY); return; }
      if (j.success) {
        setResult({ ref: j.group.group_ref, total: j.total_amount, sms: j.sms_sent, url: j.pay_url });
      } else {
        setErr(j.error || 'Could not create booking');
      }
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  // ── Gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8ea] px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (staffKey.trim()) { localStorage.setItem(AUTH_KEY, staffKey.trim()); setAuthed(true); }
          }}
          className="bg-white border border-[#5E141E]/15 rounded-2xl p-8 w-full max-w-sm shadow-[0_30px_80px_rgba(94,20,30,0.1)]"
        >
          <div className="flex items-center gap-3 text-[#5E141E] mb-6">
            <Lock size={18} />
            <p className="font-serif text-xl tracking-wider">Staff Booking Access</p>
          </div>
          <input
            type="password"
            autoFocus
            value={staffKey}
            onChange={(e) => setStaffKey(e.target.value)}
            placeholder="Staff key"
            className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5E141E]"
          />
          <button className="mt-4 w-full rounded-xl bg-[#5E141E] text-white font-semibold py-3">Enter</button>
        </form>
      </div>
    );
  }

  // ── Success ──
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8ea] px-5 py-10">
        <div className="w-full max-w-md bg-white border border-[#5E141E]/15 rounded-2xl p-6 text-center shadow-[0_30px_80px_rgba(94,20,30,0.1)]">
          <div className="text-4xl mb-3">📩</div>
          <p className="font-semibold text-lg text-stone-900">
            Booking held · {result.ref}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {result.sms ? 'Pay link SMS sent to the guest.' : 'Booking created (SMS not sent — check Twilio).'}
          </p>
          <p className="text-sm text-stone-600 mt-3">Amount: <b>{money(result.total)}</b></p>
          <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-[#5E141E] underline break-all mt-2 block">
            {result.url}
          </a>
          <p className="text-[11px] text-stone-400 mt-4">
            The guest pays via the link. Once paid, it confirms automatically. The room is held for 20 minutes.
          </p>

          {err && <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</p>}

          <div className="mt-5 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 rounded-xl border border-[#5E141E]/30 text-[#5E141E] px-3 py-2.5 text-sm font-medium hover:bg-[#5E141E]/[0.05] transition-colors"
              >
                {copied ? 'Copied ✓' : 'Copy pay link'}
              </button>
              <button
                onClick={cancelHold}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-rose-300 text-rose-600 px-3 py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel & free room'}
              </button>
            </div>
            <button
              onClick={() => { setResult(null); setErr(null); void loadTypes(); }}
              className="rounded-xl bg-[#5E141E] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#4a0f18] transition-colors"
            >
              New booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-[#fdf8ea] px-5 py-8">
      <div className="max-w-lg mx-auto bg-white border border-[#5E141E]/15 rounded-2xl p-6 shadow-[0_30px_80px_rgba(94,20,30,0.08)]">
        <p className="font-serif text-2xl text-[#5E141E]">Internal Suite Booking</p>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-5">Reception · Pay by SMS link</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <Field label="Check-in"><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="inp" /></Field>
          <Field label="Check-out"><input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className="inp" /></Field>
          <Field label="Guests"><input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className="inp" /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Field label="Guest name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="inp" /></Field>
          <Field label="Phone *"><input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit" inputMode="numeric" className="inp" /></Field>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Room type {nights > 0 ? `· ${nights} night${nights > 1 ? 's' : ''}` : ''}
        </p>
        {loadingTypes ? (
          <p className="text-sm text-stone-400 flex items-center gap-2 py-3"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</p>
        ) : nights < 1 ? (
          <p className="text-sm text-stone-400 py-2">Pick valid dates to see availability.</p>
        ) : (
          <div className="space-y-2">
            {types.map((t) => {
              const sel = typeName === t.name;
              const paused = t.booking_enabled === false;
              const out = paused || t.available_rooms < 1;
              return (
                <button
                  key={t.name}
                  onClick={() => !out && setTypeName(t.name)}
                  disabled={out}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    out ? 'border-stone-100 bg-stone-50 opacity-60 cursor-not-allowed'
                    : sel ? 'border-[#5E141E] bg-[#5E141E]/[0.05]' : 'border-stone-200 hover:border-[#5E141E]/40'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <BedDouble className="h-4 w-4 text-[#5E141E] shrink-0" />
                    <span className="min-w-0">
                      <span className="font-medium text-stone-900">{t.name}</span>
                      {t.offer_percent > 0 && t.offer_label && (
                        <span className="block text-[11px] text-emerald-600">{t.offer_label}</span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">
                    {paused ? 'Not bookable' : out ? 'Full' : `${t.available_rooms} free`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selType && (
          <div className="mt-3">
            <Field label="Rooms of this type">
              <input
                type="number"
                min={1}
                max={selType.available_rooms}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="inp w-28"
              />
            </Field>
            <p className="text-sm text-stone-600 mt-3">
              Total: <b className="text-stone-900">{money(estTotal)}</b>{' '}
              <span className="text-stone-400 text-xs">(incl. GST, est.)</span>
            </p>
          </div>
        )}

        {err && <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</p>}

        <button
          onClick={submit}
          disabled={busy || !typeName}
          className="mt-5 w-full rounded-xl bg-[#5E141E] text-white font-semibold py-3.5 hover:bg-[#4a0f18] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Create &amp; Send pay link
        </button>
      </div>

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border: 1px solid #d6d3d1;
          border-radius: 0.6rem;
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        :global(.inp:focus) { border-color: #5e141e; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf8ea]" />}>
      <InternalBooking />
    </Suspense>
  );
}
