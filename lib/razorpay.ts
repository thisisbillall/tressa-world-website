import crypto from 'crypto';
import Razorpay from 'razorpay';

export const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
export const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
export const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

export const isRazorpayConfigured = () => !!RZP_KEY_ID && !!RZP_KEY_SECRET;

let _rzp: Razorpay | null = null;
export function rzp(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  }
  if (!_rzp) {
    _rzp = new Razorpay({ key_id: RZP_KEY_ID, key_secret: RZP_KEY_SECRET });
  }
  return _rzp;
}

// https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration#15-verify-payment-signature
export function verifyCheckoutSignature(params: {
  order_id: string;
  payment_id: string;
  signature: string;
}): boolean {
  if (!RZP_KEY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', RZP_KEY_SECRET)
    .update(`${params.order_id}|${params.payment_id}`)
    .digest('hex');
  return expected === params.signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!RZP_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', RZP_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
