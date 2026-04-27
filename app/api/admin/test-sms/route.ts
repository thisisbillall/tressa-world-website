import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/apiError';
import {
  buildBookingSmsBody,
  isTwilioConfigured,
  sendSms,
} from '@/lib/twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/test-sms
//   { phone?: string, send?: boolean, sample?: 'table' | 'suite', overrides?: {...} }
//
// Always returns the rendered SMS body so the admin can preview the template
// without burning a Twilio message. Pass send:true (and a phone) to actually
// dispatch via Twilio.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sample: 'table' | 'suite' = body.sample === 'suite' ? 'suite' : 'table';
    const send: boolean = !!body.send;
    const phone: string | undefined = body.phone;

    const fixture =
      sample === 'suite'
        ? {
            customer_name: 'Test Customer',
            booking_code: 'TR-TEST01',
            venue: 'suite' as const,
            suite_name: 'Skyline Suite',
            check_in: '2026-05-01',
            check_out: '2026-05-03',
            amount: 18000,
          }
        : {
            customer_name: 'Test Customer',
            booking_code: 'TR-TEST01',
            venue: 'rooftop' as const,
            table_ref: 'T7',
            reservation_date: '2026-04-30',
            reservation_time: '17:00',
          };

    const message = buildBookingSmsBody({ ...fixture, ...(body.overrides ?? {}) });

    if (!send) {
      return NextResponse.json({ success: true, preview: message, sent: false });
    }

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'phone is required when send:true' },
        { status: 400 },
      );
    }
    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Twilio is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)' },
        { status: 500 },
      );
    }

    const res = await sendSms(phone, message);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Twilio send failed', preview: message },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true, preview: message, sent: true });
  } catch (e) {
    return jsonError(e);
  }
}
