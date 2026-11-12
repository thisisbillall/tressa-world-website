import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/menu/:space — the published guest menu for one space, as set from
// the Live Menu tab of the management app (table guest_menus). Public: it holds
// only what guests already see. The CDN keeps each answer for 15 seconds, so
// a full restaurant polling it costs the database about one query per space
// every 15 seconds. { published: false } means the page keeps its built-in menu.
const SPACES = new Set(['soul', 'unwind', 'sky', 'aura']);
const CACHED = { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' };

export async function GET(_req: Request, { params }: { params: { venue: string } }) {
  const venue = String(params.venue || '').toLowerCase();
  if (!SPACES.has(venue)) {
    return NextResponse.json({ published: false, error: 'Unknown space' }, { status: 404, headers: CACHED });
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ published: false }, { headers: CACHED });
  try {
    const { rows } = await pool.query(
      `SELECT published, published_version, published_at
         FROM guest_menus
        WHERE venue = $1 AND published IS NOT NULL`,
      [venue],
    );
    const r = rows[0];
    if (!r) return NextResponse.json({ published: false }, { headers: CACHED });
    return NextResponse.json(
      { published: true, version: r.published_version, publishedAt: r.published_at, doc: r.published },
      { headers: CACHED },
    );
  } catch (err) {
    const e = err as { code?: string; message?: string };
    // Table not created yet (the management app's migration hasn't run).
    if (e?.code === '42P01') return NextResponse.json({ published: false }, { headers: CACHED });
    // eslint-disable-next-line no-console
    console.error('[menu]', venue, e?.code || '', e?.message || err);
    return NextResponse.json({ published: false, error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
