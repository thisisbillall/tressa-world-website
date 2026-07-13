'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// Public pay page for a staff-created ("pay by SMS link") booking. It re-opens
// the SAME Razorpay order the internal-book endpoint created, then calls the
// existing /verify — so confirmation rides entirely on the existing, tested
// flow. Nothing new touches the webhook.

type PayInfo = {
  group_ref: string;
  customer_name: string;
  room_name: string;
  room_numbers: string[];
  check_in: string;
  check_out: string;
  nights: number;
  quantity: number;
  total_amount: number;
  payment_status: string;
  status: string;
  razorpay: { order_id: string; amount: number; currency: string; key_id: string } | null;
};

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

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PayPage() {
  const params = useParams();
  const code = decodeURIComponent(String(params?.code || '')).toUpperCase();

  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/suite-bookings/pay-info?ref=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.success) {
        setInfo(j.data);
        if (j.data.payment_status === 'paid') setDone(true);
        setErr(null);
      } else {
        setErr(j.error || 'Booking not found');
      }
    } catch {
      setErr('Could not load booking');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { void load(); }, [load]);

  const pay = async () => {
    if (!info?.razorpay?.order_id) return;
    setPaying(true);
    setErr(null);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Could not load the payment gateway. Please retry.');
      const rz = new (window as any).Razorpay({
        key: info.razorpay.key_id,
        amount: info.razorpay.amount,
        currency: info.razorpay.currency,
        order_id: info.razorpay.order_id,
        name: 'TRESSA · Aura Suites',
        description: `${info.quantity} × ${info.room_name} · ${info.nights} night${info.nights > 1 ? 's' : ''}`,
        prefill: { name: info.customer_name },
        theme: { color: '#5E141E' },
        handler: async (resp: any) => {
          try {
            const vr = await fetch('/api/suite-bookings/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const vj = await vr.json();
            if (vj.success) setDone(true);
            else setErr(vj.error || 'Payment verification failed. If charged, contact us with your payment ID.');
          } catch {
            setErr('Payment verification failed. If charged, contact us with your payment ID.');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => { setPaying(false); setErr('Payment cancelled. No amount was charged.'); } },
      });
      rz.on('payment.failed', () => { setPaying(false); setErr('Payment failed. Please try again.'); });
      rz.open();
    } catch (e: any) {
      setPaying(false);
      setErr(e?.message || 'Something went wrong. Please retry.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf8ea] px-5 py-10">
      <div className="w-full max-w-md bg-white border border-[#5E141E]/15 rounded-2xl shadow-[0_30px_80px_rgba(94,20,30,0.1)] p-6">
        <p className="font-serif text-2xl text-[#5E141E] tracking-wide">TRESSA</p>
        <p className="text-xs uppercase tracking-[0.25em] text-stone-400 mb-5">Aura Suites · Payment</p>

        {loading ? (
          <p className="text-stone-500 text-sm py-8 text-center">Loading…</p>
        ) : err && !info ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-3 text-sm">{err}</div>
        ) : done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-lg text-stone-900">Booking confirmed!</p>
            <p className="text-sm text-stone-500 mt-1">
              {info?.group_ref} · {info?.quantity} {info?.room_name}
            </p>
            <p className="text-sm text-stone-500 mt-3">A confirmation SMS with your invoice is on its way.</p>
          </div>
        ) : info ? (
          <>
            <div className="space-y-2 text-sm text-stone-700 border border-stone-100 rounded-xl p-4 bg-stone-50/50">
              <Row k="Guest" v={info.customer_name} />
              <Row k="Rooms" v={`${info.quantity} × ${info.room_name} (${info.room_numbers.join(', ')})`} />
              <Row k="Stay" v={`${fmtDate(info.check_in)} → ${fmtDate(info.check_out)} · ${info.nights} night${info.nights > 1 ? 's' : ''}`} />
              <div className="border-t border-stone-200 pt-2 mt-2 flex items-center justify-between">
                <span className="font-semibold text-stone-900">Total (incl. GST)</span>
                <span className="font-bold text-lg text-[#5E141E]">{money(info.total_amount)}</span>
              </div>
            </div>

            {err && (
              <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</p>
            )}

            <button
              onClick={pay}
              disabled={paying}
              className="mt-5 w-full rounded-xl bg-[#5E141E] text-white font-semibold py-3.5 hover:bg-[#4a0f18] transition-colors disabled:opacity-60"
            >
              {paying ? 'Opening payment…' : `Pay ${money(info.total_amount)}`}
            </button>
            <p className="text-[11px] text-stone-400 text-center mt-3">
              Secure payment via Razorpay. Your room is held for 20 minutes.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-stone-400">{k}</span>
      <span className="text-right font-medium text-stone-800">{v}</span>
    </div>
  );
}
