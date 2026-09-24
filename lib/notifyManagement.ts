// Tells the management app that a suite booking just cleared, so the desk
// hears about it immediately instead of in the next morning's digest.
//
// Two things matter here. A booking must never fail because the alert did not
// send — every error is swallowed and logged. And both confirmation paths
// (/verify from the browser, and the webhook, which Razorpay retries for 24
// hours) call this: the management app claims the alert atomically, so however
// many times it arrives, one booking sends one email.
//
// Env:
//   MANAGEMENT_ALERT_URL     https://<management app>/api/suites/new-booking-alert
//   MANAGEMENT_ALERT_SECRET  the same value as the management app's CRON_SECRET
const ALERT_URL = process.env.MANAGEMENT_ALERT_URL;
const ALERT_SECRET = process.env.MANAGEMENT_ALERT_SECRET;

export async function notifyNewSuiteBooking(
  groupId: string | null | undefined,
): Promise<void> {
  if (!groupId) return;
  if (!ALERT_URL || !ALERT_SECRET) {
    // Not configured is a normal state (local dev) — say so once, quietly.
    console.warn('[suite alert] MANAGEMENT_ALERT_URL/SECRET not set — skipping');
    return;
  }
  try {
    const res = await fetch(ALERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ALERT_SECRET}`,
      },
      body: JSON.stringify({ group_id: groupId }),
      cache: 'no-store',
      // The guest is waiting on this response; never hang the page on it.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.error('[suite alert] management app returned', res.status);
    }
  } catch (e) {
    console.error('[suite alert] could not reach the management app:', e);
  }
}
