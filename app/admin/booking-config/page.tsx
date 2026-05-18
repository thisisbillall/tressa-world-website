'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, LogOut, Loader2, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import type { BookingConfig, PriorityWindow } from '@/lib/bookingConfig';

const ADMIN_PASS = 'Rajat@1400'; // matches /admin/editor
const AUTH_KEY = 'tressa.admin.v1';

const VENUE_LABELS: Record<string, string> = {
  restaurant: 'Soul · Family Restaurant',
  bar: 'Unwind · Signature Bar',
  rooftop: 'Sky · Rooftop Lounge',
  suite: 'Aura · Luxury Suites',
};

const STEP_OPTIONS = [5, 10, 15, 20, 30, 60];

export default function Page() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem(AUTH_KEY) === '1'); }, []);
  if (!authed) return <Gate onPass={() => setAuthed(true)} />;
  return <Editor onLogout={() => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); }} />;
}

function Gate({ onPass }: { onPass: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_KEY, '1');
      onPass();
    } else setErr(true);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf8ea] px-6">
      <form onSubmit={submit} className="bg-white border border-maroon/15 p-8 w-full max-w-sm shadow-[0_30px_80px_rgba(94,20,30,0.1)]">
        <div className="flex items-center gap-3 text-maroon mb-6">
          <Lock size={18} />
          <p className="font-serif text-xl tracking-wider">Admin Access</p>
        </div>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          className={`w-full bg-transparent border-b py-2 text-sm focus:outline-none transition-colors ${err ? 'border-red-500' : 'border-maroon/30 focus:border-gold'}`}
        />
        {err && <p className="text-xs text-red-600 mt-2">Incorrect password.</p>}
        <button type="submit" className="btn-primary w-full mt-6 inline-block text-center"><span>Enter</span></button>
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted mt-5 text-center">Authorised access only</p>
      </form>
    </div>
  );
}

function Editor({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<BookingConfig[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const j = await apiFetch<BookingConfig[]>('/api/admin/booking-config', { cache: 'no-store' });
      setRows(j.data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="min-h-screen bg-[#0e0608] text-cream px-6 md:px-12 py-10">
      <header className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-[11px] tracking-[0.5em] uppercase text-gold">Manager</p>
          <h1 className="font-serif text-3xl md:text-4xl">Booking Configuration</h1>
          <p className="text-[11px] text-cream/50 mt-1">Per-venue: fee, discount, open hours, slot step, priority windows, enable/disable.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-[10px] tracking-[0.3em] uppercase text-cream/70 hover:text-gold flex items-center gap-1">
            <RotateCcw size={12} /> Reload
          </button>
          <button onClick={onLogout} className="text-[10px] tracking-[0.3em] uppercase text-cream/70 hover:text-gold flex items-center gap-1">
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      {loading && (
        <p className="text-cream/60 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>
      )}
      {error && (
        <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 px-4 py-2 mb-4">
          {error}. Did you run <code>sql/011_booking_config.sql</code>?
        </p>
      )}

      <div className="space-y-6">
        {rows?.map((row) => (
          <VenueCard key={row.venue} initial={row} onSaved={(updated) => {
            setRows((prev) => prev?.map((r) => (r.venue === updated.venue ? updated : r)) ?? null);
          }} />
        ))}
      </div>
    </main>
  );
}

function VenueCard({ initial, onSaved }: { initial: BookingConfig; onSaved: (cfg: BookingConfig) => void }) {
  const [draft, setDraft] = useState<BookingConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Snapshot of last server-confirmed state for diff/revert.
  const [pristine, setPristine] = useState<BookingConfig>(initial);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(pristine), [draft, pristine]);

  const patch = (p: Partial<BookingConfig>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        booking_fee_inr: draft.booking_fee_inr,
        discount_percent: draft.discount_percent,
        start_hhmm: draft.start_hhmm,
        end_hhmm: draft.end_hhmm,
        step_min: draft.step_min,
        code_grace_min: draft.code_grace_min,
        enabled: draft.enabled,
        disabled_reason: draft.disabled_reason,
        priority_windows: draft.priority_windows,
      };
      const j = await apiFetch<BookingConfig>(`/api/admin/booking-config/${encodeURIComponent(draft.venue)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setPristine(j.data);
      setDraft(j.data);
      onSaved(j.data);
      setMsg({ kind: 'ok', text: 'Saved.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const revert = () => { setDraft(pristine); setMsg(null); };

  return (
    <section className="bg-cream/5 border border-cream/10 p-5 md:p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold">{draft.venue}</p>
          <h2 className="font-serif text-xl text-cream">{VENUE_LABELS[draft.venue] ?? draft.venue}</h2>
        </div>
        <EnabledToggle value={draft.enabled} onChange={(v) => patch({ enabled: v })} />
      </div>

      {!draft.enabled && (
        <div className="mb-4">
          <Label>Disabled reason (shown on the booking page)</Label>
          <textarea
            value={draft.disabled_reason ?? ''}
            onChange={(e) => patch({ disabled_reason: e.target.value })}
            rows={2}
            placeholder="e.g. Sky is temporarily closed. Please check back soon."
            className="w-full bg-transparent border border-cream/20 px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold"
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <NumberField
          label="Booking fee (₹)"
          value={draft.booking_fee_inr}
          min={0}
          onChange={(n) => patch({ booking_fee_inr: n })}
        />
        <NumberField
          label="Discount %"
          value={draft.discount_percent}
          min={0}
          max={100}
          onChange={(n) => patch({ discount_percent: n })}
        />
        <NumberField
          label="QR grace (min after time)"
          value={draft.code_grace_min}
          min={0}
          max={360}
          onChange={(n) => patch({ code_grace_min: n })}
        />
        <HhmmField
          label="Open at (HH:MM)"
          value={draft.start_hhmm}
          onChange={(v) => patch({ start_hhmm: v })}
        />
        <HhmmField
          label="Close at (HH:MM, 24:00 ok)"
          value={draft.end_hhmm}
          allow24
          onChange={(v) => patch({ end_hhmm: v })}
        />
        <div>
          <Label>Slot step (min)</Label>
          <select
            value={draft.step_min}
            onChange={(e) => patch({ step_min: Number(e.target.value) })}
            className="w-full bg-transparent border border-cream/20 px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold"
          >
            {STEP_OPTIONS.map((n) => (
              <option key={n} value={n} className="bg-[#0e0608]">{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <Label>Priority (Exclusive) windows — discount applies inside these</Label>
          <button
            type="button"
            onClick={() => patch({ priority_windows: [...draft.priority_windows, { label: '', start: '15:00', end: '19:00' }] })}
            className="text-[10px] tracking-[0.25em] uppercase text-cream/70 hover:text-gold flex items-center gap-1"
          >
            <Plus size={12} /> Add window
          </button>
        </div>
        <div className="space-y-2">
          {draft.priority_windows.length === 0 && (
            <p className="text-[11px] text-cream/40 italic">No priority windows — the discount label still shows but no slot will be marked Exclusive.</p>
          )}
          {draft.priority_windows.map((w, i) => (
            <PriorityWindowRow
              key={i}
              window={w}
              onChange={(next) => {
                const arr = draft.priority_windows.slice();
                arr[i] = next;
                patch({ priority_windows: arr });
              }}
              onRemove={() => patch({ priority_windows: draft.priority_windows.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="px-5 py-2.5 text-[11px] tracking-[0.25em] uppercase bg-gold text-maroon hover:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={revert}
          disabled={saving || !dirty}
          className="px-5 py-2.5 text-[11px] tracking-[0.25em] uppercase border border-cream/20 text-cream/70 hover:border-cream/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RotateCcw size={12} /> Revert
        </button>
        {msg && (
          <span className={`text-xs ${msg.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</span>
        )}
      </div>
    </section>
  );
}

function PriorityWindowRow({ window, onChange, onRemove }:
  { window: PriorityWindow; onChange: (w: PriorityWindow) => void; onRemove: () => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_auto] gap-2 items-end bg-cream/5 border border-cream/10 p-3">
      <div>
        <Label>Label</Label>
        <input
          type="text"
          value={window.label}
          placeholder="e.g. 3:00 PM – 7:00 PM"
          onChange={(e) => onChange({ ...window, label: e.target.value })}
          className="w-full bg-transparent border border-cream/20 px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold"
        />
      </div>
      <HhmmField label="Start" value={window.start} onChange={(v) => onChange({ ...window, start: v })} />
      <HhmmField label="End" value={window.end} allow24 onChange={(v) => onChange({ ...window, end: v })} />
      <button
        type="button"
        onClick={onRemove}
        className="px-3 py-2 text-red-300 hover:text-red-200 self-end justify-self-end"
        aria-label="Remove window"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] tracking-[0.3em] uppercase text-cream/60 mb-1">{children}</span>;
}

function NumberField({ label, value, onChange, min, max }:
  { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => {
          let n = Number(e.target.value);
          if (!Number.isFinite(n)) n = 0;
          if (min != null && n < min) n = min;
          if (max != null && n > max) n = max;
          onChange(n);
        }}
        className="w-full bg-transparent border border-cream/20 px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold"
      />
    </div>
  );
}

function HhmmField({ label, value, onChange, allow24 }:
  { label: string; value: string; onChange: (v: string) => void; allow24?: boolean }) {
  const RE = allow24 ? /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/ : /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const invalid = !RE.test(value);
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder="HH:MM"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-transparent border px-3 py-2 text-sm text-cream focus:outline-none ${invalid ? 'border-red-400/50 focus:border-red-300' : 'border-cream/20 focus:border-gold'}`}
      />
    </div>
  );
}

function EnabledToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className={`text-[11px] tracking-[0.2em] uppercase ${value ? 'text-emerald-300' : 'text-red-300'}`}>
        {value ? 'Bookings open' : 'Closed'}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-emerald-500' : 'bg-red-500/60'}`}
      >
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : ''}`} />
      </button>
    </label>
  );
}
