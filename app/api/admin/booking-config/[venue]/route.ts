import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBookingConfig } from '@/lib/bookingConfigDb';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VENUES = ['bar', 'restaurant', 'rooftop', 'suite'] as const;
const HHMM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const STEPS = [5, 10, 15, 20, 30, 60];

function bad(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

function validateWindows(raw: unknown):
  | { ok: true; value: { label: string; start: string; end: string }[] }
  | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'priority_windows must be an array' };
  const out: { label: string; start: string; end: string }[] = [];
  for (const w of raw) {
    if (!w || typeof w !== 'object') return { ok: false, error: 'each priority window must be an object' };
    const start = (w as any).start;
    const end = (w as any).end;
    if (typeof start !== 'string' || typeof end !== 'string') {
      return { ok: false, error: 'priority window needs string start/end' };
    }
    if (!HHMM_RE.test(start) || !HHMM_RE.test(end)) {
      return { ok: false, error: 'priority window start/end must be HH:MM' };
    }
    const label = String((w as any).label ?? `${start}–${end}`).slice(0, 80);
    out.push({ label, start, end });
  }
  return { ok: true, value: out };
}

// PATCH /api/admin/booking-config/[venue] — partial update.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { venue: string } },
) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  if (!VENUES.includes(params.venue as any)) return bad('Invalid venue');

  let body: any;
  try { body = await req.json(); } catch { return bad('Invalid JSON'); }

  const sets: string[] = [];
  const vals: any[] = [];
  const push = (col: string, v: any) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  if (body.booking_fee_inr != null) {
    const n = Number(body.booking_fee_inr);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return bad('booking_fee_inr out of range');
    push('booking_fee_inr', Math.round(n));
  }
  if (body.discount_percent != null) {
    const n = Number(body.discount_percent);
    if (!Number.isFinite(n) || n < 0 || n > 100) return bad('discount_percent must be 0-100');
    push('discount_percent', Math.round(n));
  }
  if (body.start_hhmm != null) {
    if (typeof body.start_hhmm !== 'string' || !HHMM_RE.test(body.start_hhmm)) return bad('start_hhmm must be HH:MM');
    push('start_hhmm', body.start_hhmm);
  }
  if (body.end_hhmm != null) {
    if (typeof body.end_hhmm !== 'string' || !HHMM_RE.test(body.end_hhmm)) return bad('end_hhmm must be HH:MM');
    push('end_hhmm', body.end_hhmm);
  }
  if (body.step_min != null) {
    const n = Number(body.step_min);
    if (!STEPS.includes(n)) return bad(`step_min must be one of ${STEPS.join(', ')}`);
    push('step_min', n);
  }
  if (body.code_grace_min != null) {
    const n = Number(body.code_grace_min);
    if (!Number.isFinite(n) || n < 0 || n > 360) return bad('code_grace_min must be 0-360');
    push('code_grace_min', Math.round(n));
  }
  if (body.enabled != null) push('enabled', !!body.enabled);
  if (body.disabled_reason !== undefined) {
    push('disabled_reason', body.disabled_reason ? String(body.disabled_reason).slice(0, 500) : null);
  }
  if (body.priority_windows !== undefined) {
    const v = validateWindows(body.priority_windows);
    if (!v.ok) return bad(v.error);
    push('priority_windows', JSON.stringify(v.value));
  }

  if (sets.length === 0) return bad('No fields to update');

  try {
    vals.push(params.venue);
    const { rowCount } = await pool.query(
      `UPDATE booking_config SET ${sets.join(', ')} WHERE venue = $${vals.length}`,
      vals,
    );
    if (rowCount === 0) return NextResponse.json({ success: false, error: 'Venue row not found — run sql/011_booking_config.sql' }, { status: 404 });
    const cfg = await getBookingConfig(params.venue as any);
    return NextResponse.json({ success: true, data: cfg });
  } catch (e) {
    return jsonError(e);
  }
}
