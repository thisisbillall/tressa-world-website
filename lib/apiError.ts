import { NextResponse } from 'next/server';

// Convert any thrown error into a proper JSON 500. Keeps the DB's underlying
// message (e.g. "relation \"bookings\" does not exist") visible to the client
// instead of the framework returning an empty 500 body.
export function jsonError(err: unknown, status = 500) {
  const e = err as any;
  // Razorpay SDK throws { statusCode, error: { code, description } } with no top-level message.
  const rzpDesc = e?.error?.description;
  const message =
    e?.message ||
    rzpDesc ||
    (typeof e === 'string' ? e : null) ||
    'Internal server error';
  const code = e?.code || e?.error?.code || undefined; // pg error codes (42P01, 28P01, ECONNREFUSED) or Razorpay codes (BAD_REQUEST_ERROR)
  const effectiveStatus = e?.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : status;
  // eslint-disable-next-line no-console
  console.error('[api]', effectiveStatus, code ? `${code} ` : '', message);
  return NextResponse.json(
    { success: false, error: message, code },
    { status: effectiveStatus },
  );
}

export function guardDbConfigured(): NextResponse | null {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: 'DATABASE_URL is not set. Add it to .env.local and restart the dev server.' },
      { status: 500 },
    );
  }
  return null;
}
