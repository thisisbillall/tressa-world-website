// Renders a one-page A4 booking slip PDF using pdf-lib (pure-JS, no native
// deps). The slip carries venue + slot + guest + payment details, the
// embedded QR, and the discount note for the priority window.

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { put } from '@vercel/blob';
import {
  BOOKING_CODE_GRACE_MIN,
  BOOKING_DISCOUNT_PERCENT,
  formatBookingTime,
  isPriorityTime,
  PRIORITY_WINDOWS,
} from './venueConfig';

export type BookingPdfInput = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  venue: 'bar' | 'restaurant' | 'rooftop' | 'suite';
  reservation_date: string | null;
  reservation_time: string | null;
  guests: number | null;
  suite_name: string | null;
  check_in: string | null;
  check_out: string | null;
  booking_code: string;
  code_expires_at: string | Date | null;
  amount: string | number;
  payment_status: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string | Date;
};

const VENUE_LABEL: Record<BookingPdfInput['venue'], string> = {
  bar: 'Unwind · Bar',
  restaurant: 'Soul · Family Restaurant',
  rooftop: 'Sky · Rooftop',
  suite: 'Aura · Luxury Suite',
};

const MAROON = rgb(94 / 255, 20 / 255, 30 / 255);
const GOLD = rgb(227 / 255, 171 / 255, 50 / 255);
const INK = rgb(0.13, 0.12, 0.12);
const MUTED = rgb(0.42, 0.4, 0.4);
const CREAM = rgb(253 / 255, 248 / 255, 234 / 255);
const RULE = rgb(0.85, 0.83, 0.78);

function fmtDate(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return d; }
}

function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch { return String(value); }
}

async function fetchQrPng(bookingCode: string): Promise<Uint8Array | null> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${encodeURIComponent(bookingCode)}`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    return new Uint8Array(buf);
  } catch { return null; }
}

// Wrap text on width — pdf-lib has no built-in wrapping for drawText.
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(probe, size) <= maxWidth) {
      cur = probe;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size: number; maxWidth: number; lineHeight?: number; color?: ReturnType<typeof rgb> },
): number {
  const lh = opts.lineHeight ?? opts.size * 1.35;
  const lines = wrap(text, opts.font, opts.size, opts.maxWidth);
  let cy = y;
  for (const ln of lines) {
    page.drawText(ln, { x, y: cy, size: opts.size, font: opts.font, color: opts.color ?? INK });
    cy -= lh;
  }
  return cy;
}

export async function buildBookingPdf(b: BookingPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`TRESSA Booking ${b.booking_code}`);
  pdf.setAuthor('TRESSA PAY');
  pdf.setSubject('Booking confirmation slip');

  // A4 portrait — 595 × 842 pt.
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const contentW = width - margin * 2;

  // --- Header band --------------------------------------------------------
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: MAROON });
  page.drawText('TRESSA PAY', {
    x: margin, y: height - 45, size: 22, font: serifBold, color: CREAM,
  });
  page.drawText('PRIORITY BOOKING SLIP', {
    x: margin, y: height - 68, size: 9, font: sansBold, color: GOLD,
  });
  const refText = `BKG-${b.id.slice(0, 8).toUpperCase()}`;
  const refW = sansBold.widthOfTextAtSize(refText, 9);
  page.drawText(refText, {
    x: width - margin - refW, y: height - 45, size: 9, font: sansBold, color: GOLD,
  });
  const issuedText = `Issued ${fmtDateTime(b.created_at)} IST`;
  const issuedW = sans.widthOfTextAtSize(issuedText, 8);
  page.drawText(issuedText, {
    x: width - margin - issuedW, y: height - 62, size: 8, font: sans, color: rgb(1, 1, 1),
  });

  // --- Title --------------------------------------------------------------
  let y = height - 130;
  page.drawText(VENUE_LABEL[b.venue], {
    x: margin, y, size: 22, font: serif, color: INK,
  });
  y -= 18;
  page.drawText('Your slot is confirmed.', {
    x: margin, y, size: 11, font: sans, color: MUTED,
  });

  // --- Guest details + QR side-by-side ------------------------------------
  y -= 30;
  const isSuite = b.venue === 'suite';
  const reservationHHMM = b.reservation_time ? b.reservation_time.slice(0, 5) : null;
  const priority = !isSuite && isPriorityTime(reservationHHMM);
  const timeLabel = reservationHHMM ? formatBookingTime(reservationHHMM) : '';

  const leftX = margin;
  const leftW = contentW - 200;
  const detailGap = 22;
  const rows: { label: string; value: string }[] = [
    { label: 'Guest', value: b.customer_name },
    { label: 'Phone', value: b.customer_phone },
    { label: 'Email', value: b.customer_email },
  ];
  if (isSuite) {
    rows.push({ label: 'Suite', value: b.suite_name ?? '' });
    rows.push({ label: 'Check-In', value: fmtDate(b.check_in) });
    rows.push({ label: 'Check-Out', value: fmtDate(b.check_out) });
  } else {
    rows.push({ label: 'Date', value: fmtDate(b.reservation_date) });
    rows.push({ label: 'Time', value: timeLabel });
    rows.push({ label: 'Guests', value: String(b.guests ?? '—') });
  }

  let ry = y;
  for (const r of rows) {
    page.drawText(r.label.toUpperCase(), {
      x: leftX, y: ry, size: 7, font: sansBold, color: MUTED,
    });
    drawWrapped(page, r.value || '—', leftX, ry - 12, {
      font: serif, size: 13, maxWidth: leftW, color: INK,
    });
    ry -= detailGap + 5;
  }

  // QR block on the right.
  const qrSize = 170;
  const qrX = width - margin - qrSize;
  const qrY = y - qrSize + 10;
  page.drawRectangle({
    x: qrX - 6, y: qrY - 6, width: qrSize + 12, height: qrSize + 12, color: rgb(1, 1, 1),
    borderColor: RULE, borderWidth: 0.7,
  });

  const qrPng = await fetchQrPng(b.booking_code);
  if (qrPng) {
    const img = await pdf.embedPng(qrPng);
    page.drawImage(img, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  } else {
    page.drawText('QR unavailable', { x: qrX + 30, y: qrY + qrSize / 2, size: 10, font: sans, color: MUTED });
  }
  const codeSize = serifBold.widthOfTextAtSize(b.booking_code, 17);
  page.drawText('SCAN OR SHOW CODE BELOW', {
    x: qrX + (qrSize - codeSize) / 2, y: qrY - 22, size: 7, font: sansBold, color: MUTED,
  });
  page.drawText(b.booking_code, {
    x: qrX + (qrSize - codeSize) / 2, y: qrY - 42, size: 17, font: serifBold, color: MAROON,
  });

  // Expiry callout under the QR — must be visually loud since arriving past
  // this window forfeits the discount.
  const expireBoxH = 28;
  page.drawRectangle({
    x: qrX - 6, y: qrY - 42 - 8 - expireBoxH, width: qrSize + 12, height: expireBoxH,
    color: rgb(0.99, 0.92, 0.92),
    borderColor: rgb(0.78, 0.18, 0.18), borderWidth: 0.8,
  });
  const expiresHeadline = `EXPIRES ${BOOKING_CODE_GRACE_MIN} MIN AFTER BOOKING TIME`;
  const eh = sansBold.widthOfTextAtSize(expiresHeadline, 8);
  page.drawText(expiresHeadline, {
    x: qrX + (qrSize - eh) / 2,
    y: qrY - 42 - 8 - expireBoxH + 16,
    size: 8, font: sansBold, color: rgb(0.62, 0.1, 0.1),
  });
  if (!isSuite && b.code_expires_at) {
    const expSub = `Not honored after ${fmtDateTime(b.code_expires_at)} IST`;
    const ew = sans.widthOfTextAtSize(expSub, 7);
    page.drawText(expSub, {
      x: qrX + (qrSize - ew) / 2,
      y: qrY - 42 - 8 - expireBoxH + 5,
      size: 7, font: sans, color: rgb(0.4, 0.1, 0.1),
    });
  }

  // --- Payment box --------------------------------------------------------
  let py = qrY - 42 - 8 - expireBoxH - 28;
  page.drawLine({
    start: { x: margin, y: py + 18 }, end: { x: width - margin, y: py + 18 },
    thickness: 0.6, color: RULE,
  });

  const amount = Number(b.amount) || 0;
  const payRows: { label: string; value: string }[] = [
    { label: 'Amount Paid', value: `INR ${amount.toLocaleString('en-IN')}.00` },
    { label: 'Status', value: (b.payment_status || '').toUpperCase() || '—' },
    { label: 'Razorpay Payment ID', value: b.razorpay_payment_id || '—' },
    { label: 'Razorpay Order ID', value: b.razorpay_order_id || '—' },
    {
      label: `Validity (${BOOKING_CODE_GRACE_MIN} min after booking time)`,
      value: b.code_expires_at ? `${fmtDateTime(b.code_expires_at)} IST` : 'See booking time',
    },
  ];

  for (const r of payRows) {
    page.drawText(r.label.toUpperCase(), {
      x: margin, y: py, size: 7, font: sansBold, color: MUTED,
    });
    const v = r.value || '—';
    const vw = sans.widthOfTextAtSize(v, 10);
    page.drawText(v, {
      x: width - margin - vw, y: py, size: 10, font: sans, color: INK,
    });
    py -= 18;
  }
  page.drawLine({
    start: { x: margin, y: py + 6 }, end: { x: width - margin, y: py + 6 },
    thickness: 0.6, color: RULE,
  });

  // --- Discount benefit panel --------------------------------------------
  py -= 18;
  const panelHeight = 90;
  page.drawRectangle({
    x: margin, y: py - panelHeight, width: contentW, height: panelHeight,
    color: priority ? rgb(0.99, 0.95, 0.84) : CREAM,
    borderColor: priority ? GOLD : RULE, borderWidth: priority ? 1 : 0.6,
  });
  page.drawText(priority ? 'TRESSA PRIORITY BENEFIT' : 'STANDARD BOOKING', {
    x: margin + 14, y: py - 22, size: 9, font: sansBold, color: MAROON,
  });
  const benefit = priority
    ? `Show this slip / QR / code at the venue billing to get ${BOOKING_DISCOUNT_PERCENT}% OFF on your total bill via Tressa Pay — better than Zomato or Swiggy. Reservation fee of INR ${amount.toLocaleString('en-IN')} is non-refundable.`
    : `Your slot is reserved. The ${BOOKING_DISCOUNT_PERCENT}% Tressa Pay discount applies only for bookings in ${PRIORITY_WINDOWS.map((w) => w.label).join(' or ')}. Reservation fee of INR ${amount.toLocaleString('en-IN')} is non-refundable.`;
  drawWrapped(page, benefit, margin + 14, py - 40, {
    font: sans, size: 9.5, maxWidth: contentW - 28, lineHeight: 13, color: INK,
  });

  // --- Footer -------------------------------------------------------------
  page.drawLine({
    start: { x: margin, y: 80 }, end: { x: width - margin, y: 80 },
    thickness: 0.6, color: RULE,
  });
  page.drawText('Terms & refund policy: tressaworld.com/terms', {
    x: margin, y: 60, size: 8, font: sans, color: MUTED,
  });
  page.drawText('Reservations: operationstressa@gmail.com', {
    x: margin, y: 46, size: 8, font: sans, color: MUTED,
  });
  const thanks = 'Thank you for choosing TRESSA.';
  const tw = sansBold.widthOfTextAtSize(thanks, 9);
  page.drawText(thanks, {
    x: width - margin - tw, y: 60, size: 9, font: sansBold, color: MAROON,
  });

  return pdf.save();
}

// Build the PDF and upload it to Vercel Blob. Returns the public CDN URL.
// Caller is expected to persist the URL on the booking row. Throws if
// BLOB_READ_WRITE_TOKEN isn't configured — caller handles the fallback.
export async function uploadBookingPdf(b: BookingPdfInput): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }
  const bytes = await buildBookingPdf(b);
  // `addRandomSuffix: false` would risk a 409 if the same code re-uploads;
  // we leave the default on so a fresh booking always gets a fresh URL.
  const blob = await put(
    `bookings/tressa-${b.booking_code}.pdf`,
    Buffer.from(bytes),
    {
      access: 'public',
      contentType: 'application/pdf',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
  );
  return blob.url;
}
