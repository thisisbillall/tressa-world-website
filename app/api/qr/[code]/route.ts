import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/qr/[code]?size=400
// Proxies a PNG QR for the booking code via the public qrserver API. We
// proxy (rather than redirect to the third party from the SMS link) so the
// staff scan flow always hits our domain even if the external API moves.
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
  if (!code) {
    return NextResponse.json({ success: false, error: 'code required' }, { status: 400 });
  }

  const url = new URL(req.url);
  const size = Math.min(Math.max(Number(url.searchParams.get('size') || 400), 100), 800);

  const remote = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(code)}`;

  try {
    const r = await fetch(remote, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: 'qr upstream failed' }, { status: 502 });
    }
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=600',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'qr upstream unreachable' }, { status: 502 });
  }
}
