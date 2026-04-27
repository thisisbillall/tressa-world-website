'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { broadcastTables } from '@/utils/broadcast';
import { apiFetch } from '@/lib/apiClient';

type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  venue: 'bar' | 'restaurant' | 'rooftop' | 'suite';
  reservation_date: string | null;
  reservation_time: string | null;
  guests: number | null;
  suite_name: string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  notes: string | null;
  amount: string | number;
  payment_status: 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  is_special: boolean;
  table_ref: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  confirmed: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  cancelled: 'bg-red-500/20 text-red-200 border-red-400/40',
  completed: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
};

const PAY_COLORS: Record<string, string> = {
  not_required: 'text-cream/50',
  pending: 'text-amber-300',
  paid: 'text-emerald-300',
  failed: 'text-red-300',
  refunded: 'text-sky-300',
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Booking['status']>('all');
  const [liveFlash, setLiveFlash] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await apiFetch<Booking[]>('/api/bookings?limit=200', { cache: 'no-store' });
      setBookings(json.data);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLiveFlash(true);
    setTimeout(() => setLiveFlash(false), 600);
    debounceRef.current = setTimeout(load, 400);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  useRealtime({
    tables: ['bookings'],
    onInsert: scheduleRefresh,
    onUpdate: scheduleRefresh,
    onDelete: scheduleRefresh,
  });

  const updateStatus = async (id: string, status: Booking['status']) => {
    const prev = bookings;
    setBookings((b) => b.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await apiFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      broadcastTables(['bookings']);
    } catch (e: any) {
      setBookings(prev);
      alert(`Update failed: ${e?.message || 'unknown'}`);
    }
  };

  // ── Test SMS panel state ──
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsSample, setSmsSample] = useState<'table' | 'suite'>('table');
  const [smsPreview, setSmsPreview] = useState('');
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsMsg, setSmsMsg] = useState<string | null>(null);

  const runTestSms = async (send: boolean) => {
    setSmsBusy(true);
    setSmsMsg(null);
    try {
      const json = await apiFetch<any>('/api/admin/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: smsSample, send, phone: smsPhone }),
      });
      setSmsPreview(json.preview || '');
      setSmsMsg(send ? 'Sent! Check the phone.' : 'Preview generated.');
    } catch (e: any) {
      setSmsMsg(`Failed: ${e?.message || 'unknown error'}`);
    } finally {
      setSmsBusy(false);
    }
  };

  const visible = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
  const counts = bookings.reduce<Record<string, number>>((a, b) => {
    a[b.status] = (a[b.status] || 0) + 1;
    return a;
  }, {});

  return (
    <main className="min-h-screen bg-[#0e0608] text-cream px-6 md:px-12 py-10">
      <header className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-[11px] tracking-[0.5em] uppercase text-gold">Manager</p>
          <h1 className="font-serif text-3xl md:text-4xl">Live Bookings</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full transition ${
              liveFlash ? 'bg-emerald-300 shadow-[0_0_12px_#34d399]' : 'bg-emerald-500/70'
            }`}
          />
          <span className="text-[10px] tracking-[0.3em] uppercase text-cream/60">
            {liveFlash ? 'Updating…' : 'Live'}
          </span>
        </div>
      </header>

      <div className="mb-6 border border-cream/10">
        <button
          type="button"
          onClick={() => setSmsOpen((v) => !v)}
          className="w-full text-left px-4 py-3 text-[11px] tracking-[0.3em] uppercase text-cream/70 hover:text-gold flex items-center justify-between"
        >
          <span>Test SMS Template</span>
          <span className="text-cream/40">{smsOpen ? '−' : '+'}</span>
        </button>
        {smsOpen ? (
          <div className="border-t border-cream/10 p-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['table', 'suite'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSmsSample(s)}
                    className={`px-3 py-1.5 text-[10px] tracking-[0.25em] uppercase border transition ${
                      smsSample === s
                        ? 'border-gold text-gold bg-gold/10'
                        : 'border-cream/20 text-cream/60 hover:border-cream/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                type="tel"
                placeholder="10-digit phone (e.g. 9876543210)"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                className="w-full bg-transparent border border-cream/20 px-3 py-2 text-sm focus:border-gold outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => runTestSms(false)}
                  disabled={smsBusy}
                  className="px-4 py-2 text-[10px] tracking-[0.25em] uppercase border border-cream/30 text-cream/80 hover:border-cream/60 disabled:opacity-40"
                >
                  Preview
                </button>
                <button
                  onClick={() => runTestSms(true)}
                  disabled={smsBusy || smsPhone.replace(/\D/g, '').length < 10}
                  className="px-4 py-2 text-[10px] tracking-[0.25em] uppercase border border-gold text-gold bg-gold/10 hover:bg-gold/20 disabled:opacity-40"
                >
                  Send Test SMS
                </button>
              </div>
              {smsMsg ? (
                <p className={`text-xs ${smsMsg.startsWith('Failed') ? 'text-red-300' : 'text-emerald-300'}`}>
                  {smsMsg}
                </p>
              ) : null}
            </div>
            <pre className="text-xs whitespace-pre-wrap bg-black/40 border border-cream/10 p-3 text-cream/80 min-h-[10rem]">
              {smsPreview || 'Click Preview to render the template.'}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-[11px] tracking-[0.2em] uppercase border transition ${
              filter === s
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-cream/20 text-cream/70 hover:border-cream/40'
            }`}
          >
            {s}
            {s !== 'all' && counts[s] ? ` · ${counts[s]}` : ''}
            {s === 'all' ? ` · ${bookings.length}` : ''}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="border border-red-400/40 bg-red-950/30 text-red-200 p-4 mb-6 text-sm">
          <p className="font-semibold mb-1">Can't load bookings</p>
          <p className="text-red-200/80">{loadError}</p>
          <p className="text-red-200/60 mt-2 text-xs">
            Check <a href="/api/health" target="_blank" className="underline">/api/health</a> to diagnose (DATABASE_URL, migrations, connection).
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-cream/50">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-cream/50">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto border border-cream/10">
          <table className="w-full text-sm">
            <thead className="bg-cream/5 text-[10px] tracking-[0.2em] uppercase text-cream/50">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Venue</th>
                <th className="text-left px-4 py-3">Guest</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Details</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id} className="border-t border-cream/5 hover:bg-cream/[0.02]">
                  <td className="px-4 py-3 text-cream/70 text-xs">{formatWhen(b.created_at)}</td>
                  <td className="px-4 py-3 capitalize">{b.venue}</td>
                  <td className="px-4 py-3 font-serif">{b.customer_name}</td>
                  <td className="px-4 py-3 text-xs text-cream/70">
                    {b.customer_phone}
                    <br />
                    <span className="text-cream/50">{b.customer_email}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.venue === 'suite' ? (
                      <>
                        <div>{b.suite_name}</div>
                        <div className="text-cream/60">
                          {b.check_in} → {b.check_out} · {b.nights}n · {b.guests} guests
                        </div>
                      </>
                    ) : (
                      <div className="text-cream/70">
                        {b.table_ref ? `${b.table_ref} · ` : ''}
                        {b.reservation_date} · {b.reservation_time} · {b.guests} guests
                      </div>
                    )}
                    {b.is_special && (
                      <div className="mt-1 inline-block px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase border border-gold/50 bg-gold/10 text-gold">
                        Special · oversized party
                      </div>
                    )}
                    {b.notes && <div className="text-cream/50 italic mt-1">“{b.notes}”</div>}
                  </td>
                  <td className="px-4 py-3">
                    {Number(b.amount) > 0 ? `₹ ${Number(b.amount).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-xs ${PAY_COLORS[b.payment_status]}`}>
                    {b.payment_status.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-[10px] tracking-[0.15em] uppercase border ${
                        STATUS_COLORS[b.status]
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {b.status === 'pending' && (
                        <Action onClick={() => updateStatus(b.id, 'confirmed')} label="Confirm" />
                      )}
                      {b.status !== 'completed' && b.status !== 'cancelled' && (
                        <Action onClick={() => updateStatus(b.id, 'completed')} label="Complete" />
                      )}
                      {b.status !== 'cancelled' && (
                        <Action onClick={() => updateStatus(b.id, 'cancelled')} label="Cancel" variant="danger" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Action({
  onClick,
  label,
  variant = 'default',
}: {
  onClick: () => void;
  label: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] tracking-[0.15em] uppercase border transition ${
        variant === 'danger'
          ? 'border-red-400/40 text-red-200 hover:bg-red-500/10'
          : 'border-gold/40 text-gold hover:bg-gold/10'
      }`}
    >
      {label}
    </button>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
