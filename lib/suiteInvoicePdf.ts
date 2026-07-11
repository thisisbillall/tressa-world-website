// One-page A4 tax invoice for a suite booking (one or many rooms), rendered
// with pdf-lib. Every booking belongs to a group (a group of one for a single
// room), so this always renders a room table + grand total.

import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// QR PNG for the booking reference — scannable by the check-in app.
async function fetchQrPng(data: string): Promise<Uint8Array | null> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=6&data=${encodeURIComponent(data)}`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch { return null; }
}

export type SuiteInvoiceLine = {
  room_number: string;
  room_name: string;
  guests: number;
  base_amount: string | number;
  discount_amount: string | number;
  gst_rate: string | number;
  gst_amount: string | number;
  total_amount: string | number;
};

export type SuiteInvoiceInput = {
  group_ref: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD
  nights: number;
  payment_status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string | Date;
  items: SuiteInvoiceLine[];
};

const MAROON = rgb(94 / 255, 20 / 255, 30 / 255);
const GOLD = rgb(227 / 255, 171 / 255, 50 / 255);
const INK = rgb(0.13, 0.12, 0.12);
const MUTED = rgb(0.42, 0.4, 0.4);
const CREAM = rgb(253 / 255, 248 / 255, 234 / 255);
const RULE = rgb(0.85, 0.83, 0.78);

const num = (v: string | number) => Number(v) || 0;
const money = (v: string | number) => num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtDate(d: string): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
}
function fmtDateTime(value: string | Date): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    });
  } catch { return String(value); }
}

export async function buildSuiteInvoicePdf(b: SuiteInvoiceInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`TRESSA Suite Invoice ${b.group_ref}`);
  pdf.setAuthor('TRESSA PAY');
  pdf.setSubject('Suite booking tax invoice');

  const page: PDFPage = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Brand mark (self-hosted read; skipped gracefully if unavailable) + QR.
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    const bytes = await readFile(join(process.cwd(), 'public', 'brand', 'tressa-logo-mark.png'));
    logo = await pdf.embedPng(bytes);
  } catch { /* no logo — header falls back to text only */ }
  let qr: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  const qrBytes = await fetchQrPng(b.group_ref);
  if (qrBytes) { try { qr = await pdf.embedPng(qrBytes); } catch { /* ignore */ } }

  const margin = 40;
  const contentW = width - margin * 2;

  // Header
  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: MAROON });
  let titleX = margin;
  if (logo) {
    const lh = 52;
    const lw = lh * (logo.width / logo.height);
    page.drawImage(logo, { x: margin, y: height - 92 + (92 - lh) / 2, width: lw, height: lh });
    titleX = margin + lw + 12;
  }
  page.drawText('TRESSA SUITES', { x: titleX, y: height - 46, size: 22, font: serifBold, color: CREAM });
  page.drawText('PREMIUM SUITE — TAX INVOICE', { x: titleX, y: height - 70, size: 9, font: sansBold, color: GOLD });
  const ref = `REF ${b.group_ref}`;
  page.drawText(ref, { x: width - margin - sansBold.widthOfTextAtSize(ref, 9), y: height - 46, size: 9, font: sansBold, color: GOLD });
  const issued = `Issued ${fmtDateTime(b.created_at)} IST`;
  page.drawText(issued, { x: width - margin - sans.widthOfTextAtSize(issued, 8), y: height - 64, size: 8, font: sans, color: rgb(1, 1, 1) });

  // Guest + stay
  let y = height - 126;
  const roomCount = b.items.length;
  page.drawText(`${roomCount} Room${roomCount > 1 ? 's' : ''} · ${b.nights} Night${b.nights > 1 ? 's' : ''}`, { x: margin, y, size: 20, font: serif, color: INK });

  // Check-in QR (encodes the booking reference) — top-right of the body.
  if (qr) {
    const qs = 92;
    const qx = width - margin - qs;
    const qy = height - 92 - 14 - qs;
    page.drawRectangle({ x: qx - 5, y: qy - 5, width: qs + 10, height: qs + 10, color: rgb(1, 1, 1), borderColor: RULE, borderWidth: 0.6 });
    page.drawImage(qr, { x: qx, y: qy, width: qs, height: qs });
    const lbl = 'SCAN AT CHECK-IN';
    page.drawText(lbl, { x: qx + (qs - sansBold.widthOfTextAtSize(lbl, 7)) / 2, y: qy - 14, size: 7, font: sansBold, color: MAROON });
  }
  y -= 30;
  const col = contentW / 2;
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    page.drawText(label.toUpperCase(), { x, y: yy, size: 7, font: sansBold, color: MUTED });
    page.drawText(value || '—', { x, y: yy - 13, size: 12, font: serif, color: INK });
  };
  drawKV('Guest', b.customer_name, margin, y);
  drawKV('Check-In', fmtDate(b.check_in), margin + col, y);
  y -= 34;
  drawKV('Phone', b.customer_phone, margin, y);
  drawKV('Check-Out', fmtDate(b.check_out), margin + col, y);
  y -= 34;
  drawKV('Email', b.customer_email || '—', margin, y);
  drawKV('Booking Reference', b.group_ref, margin + col, y);

  // Room table
  y -= 44;
  const cX = { room: margin, guests: margin + 250, base: margin + 320, disc: margin + 400, total: width - margin };
  page.drawText('ROOM', { x: cX.room, y, size: 7.5, font: sansBold, color: MAROON });
  page.drawText('GUESTS', { x: cX.guests, y, size: 7.5, font: sansBold, color: MAROON });
  page.drawText('TARIFF', { x: cX.base, y, size: 7.5, font: sansBold, color: MAROON });
  page.drawText('OFFER', { x: cX.disc, y, size: 7.5, font: sansBold, color: MAROON });
  const thT = 'LINE TOTAL';
  page.drawText(thT, { x: cX.total - sansBold.widthOfTextAtSize(thT, 7.5), y, size: 7.5, font: sansBold, color: MAROON });
  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.8, color: RULE });
  y -= 16;

  let gBase = 0, gDisc = 0, gGst = 0, gTotal = 0;
  for (const it of b.items) {
    gBase += num(it.base_amount); gDisc += num(it.discount_amount); gGst += num(it.gst_amount); gTotal += num(it.total_amount);
    page.drawText(`${it.room_name} · #${it.room_number}`, { x: cX.room, y, size: 9.5, font: serif, color: INK });
    page.drawText(String(it.guests), { x: cX.guests + 8, y, size: 9.5, font: sans, color: INK });
    page.drawText(money(it.base_amount), { x: cX.base, y, size: 9.5, font: sans, color: INK });
    page.drawText(num(it.discount_amount) > 0 ? `-${money(it.discount_amount)}` : '—', { x: cX.disc, y, size: 9.5, font: sans, color: num(it.discount_amount) > 0 ? MAROON : MUTED });
    const lt = money(num(it.base_amount) - num(it.discount_amount) + num(it.gst_amount));
    page.drawText(lt, { x: cX.total - sans.widthOfTextAtSize(lt, 9.5), y, size: 9.5, font: sans, color: INK });
    y -= 20;
  }

  y -= 2;
  page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: width - margin, y: y + 8 }, thickness: 0.8, color: RULE });
  y -= 6;

  const totalRow = (label: string, value: string, opts?: { bold?: boolean; color?: ReturnType<typeof rgb> }) => {
    const f = opts?.bold ? sansBold : sans;
    page.drawText(label, { x: cX.base, y, size: 10, font: f, color: opts?.color ?? INK });
    page.drawText(value, { x: cX.total - f.widthOfTextAtSize(value, 10), y, size: 10, font: f, color: opts?.color ?? INK });
    y -= 18;
  };
  totalRow('Subtotal', `INR ${money(gBase)}`);
  if (gDisc > 0) totalRow('Offer discount', `- INR ${money(gDisc)}`, { color: MAROON });
  totalRow('GST', `INR ${money(gGst)}`);
  y -= 2;
  totalRow('TOTAL PAID', `INR ${money(gTotal)}`, { bold: true, color: MAROON });

  // Payment refs
  y -= 16;
  page.drawRectangle({ x: margin, y: y - 60, width: contentW, height: 64, color: rgb(0.985, 0.975, 0.95), borderColor: RULE, borderWidth: 0.6 });
  const payRows = [
    ['Payment Status', (b.payment_status || '').toUpperCase() || '—'],
    ['Razorpay Payment ID', b.razorpay_payment_id || '—'],
    ['Razorpay Order ID', b.razorpay_order_id || '—'],
  ];
  let py = y - 12;
  for (const [k, v] of payRows) {
    page.drawText(k.toUpperCase(), { x: margin + 12, y: py, size: 7, font: sansBold, color: MUTED });
    page.drawText(v, { x: width - margin - 12 - sans.widthOfTextAtSize(v, 9), y: py, size: 9, font: sans, color: INK });
    py -= 18;
  }

  // Footer
  page.drawLine({ start: { x: margin, y: 78 }, end: { x: width - margin, y: 78 }, thickness: 0.6, color: RULE });
  page.drawText('Terms & policy: tressaworld.com/terms', { x: margin, y: 58, size: 8, font: sans, color: MUTED });
  page.drawText('Reservations: operationstressa@gmail.com', { x: margin, y: 45, size: 8, font: sans, color: MUTED });
  const thanks = 'Thank you for choosing TRESSA.';
  page.drawText(thanks, { x: width - margin - sansBold.widthOfTextAtSize(thanks, 9), y: 58, size: 9, font: sansBold, color: MAROON });

  return pdf.save();
}

export async function uploadSuiteInvoicePdf(b: SuiteInvoiceInput): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  const bytes = await buildSuiteInvoicePdf(b);
  const blob = await put(`suite-invoices/tressa-suite-${b.group_ref}.pdf`, Buffer.from(bytes), {
    access: 'public',
    contentType: 'application/pdf',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}
