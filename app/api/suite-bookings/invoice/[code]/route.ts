import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { buildSuiteInvoicePdf } from '@/lib/suiteInvoicePdf';
import { loadGroupRows, buildInvoiceInputFromRows } from '@/lib/suiteGroup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/suite-bookings/invoice/:code
// `code` may be a group reference or any single room's booking code — either
// way we render one combined invoice for the whole group and download it.
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  try {
    const rows = await loadGroupRows(pool, params.code);
    if (!rows.length) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    const bytes = await buildSuiteInvoicePdf(buildInvoiceInputFromRows(rows));
    const ref = rows[0].group_ref || rows[0].booking_code;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="TRESSA-Suite-Invoice-${ref}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
