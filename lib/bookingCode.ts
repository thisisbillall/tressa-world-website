// Generates short, human-readable booking codes SMS'd after booking and
// redeemed at the venue POS for 15% off. Alphabet skips 0/O/1/I/L to avoid
// read-aloud mistakes over the phone. Format: "TW-ABCDE3" (6 chars + prefix).

import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateBookingCode(length = 6): string {
  let out = 'TW-';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

// Discount applied by the POS when the code is redeemed. Kept as a constant
// (not env) so it matches what we promise in the SMS body and UI copy.
export const BOOKING_DISCOUNT_PERCENT = 15;
