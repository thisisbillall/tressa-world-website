# Aura Suites — Webapp Integration Reference

Everything your existing TRESSA webapp needs to **manage suite pricing/offers**
and **read suite bookings**. The suites feature uses **two dedicated tables**,
completely separate from the dining `bookings` table. Your webapp and this
website share the **same Postgres database**, so the webapp just reads/writes
these tables directly.

- **Currency:** INR. All money columns are **rupees** (NUMERIC), *not* paise.
- **`base_price` and `base_amount` are PRE-GST.** GST is added on top.
- **`check_in` / `check_out` are `DATE`** (no clock time — see "Check-in times").

---

## 1. `suite_rooms` — the room master (YOU manage this)

One row per physical room. This is where the webapp sets price, GST, offers,
images and amenities. 10 rows today (101–105, 201–205).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | auto |
| `room_number` | text (unique) | e.g. `201` |
| `name` | text | **This is the "type"** the website groups by. e.g. `Aura - Grand Suite` |
| `subtitle` | text | e.g. `Deluxe King` |
| `description` | text | shown in the booking modal |
| `floor` | text | e.g. `Floor 2` |
| `bed_type` | text | e.g. `King` |
| `size_sqft` | int | optional |
| `max_guests` | int | default 2 |
| `base_price` | numeric(12,2) | **per night, PRE-GST**. Set the tariff here. |
| `gst_rate` | numeric(5,2) | percent. Currently `12`. |
| `offer_active` | boolean | turn an offer on/off |
| `offer_percent` | numeric(5,2) | 0–100, % off the pre-GST subtotal |
| `offer_label` | text | badge text, e.g. `Delight Offer · 10% Off` |
| `amenities` | text[] | chips shown on the card |
| `images` | text[] | image URLs (first = card image; all = modal carousel) |
| `is_active` | boolean | **`false` hides the room and makes it unbookable** |
| `sort_order` | int | display order (lower first) |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-bumps on change |

### Room → Type grouping
The website shows **3 types**, grouped by `name`:
| Type (`name`) | Rooms |
|---|---|
| `Aura - Grand Suite` | 201 |
| `Aura - Celebration Suite` | 101, 205 |
| `Aura - Delight Suite` | 102, 103, 104, 105, 202, 203, 204 |

---

## 2. Setting prices & offers from the webapp

**Change a room's nightly tariff:**
```sql
UPDATE suite_rooms SET base_price = 4500 WHERE room_number = '201';
```

**Set an offer for a whole type** (recommended — keep it uniform across the type):
```sql
UPDATE suite_rooms
   SET offer_active = TRUE, offer_percent = 15, offer_label = 'Diwali · 15% Off'
 WHERE name = 'Aura - Delight Suite';
```

**Turn an offer off:**
```sql
UPDATE suite_rooms SET offer_active = FALSE, offer_percent = 0, offer_label = NULL
 WHERE name = 'Aura - Celebration Suite';
```

**Take a room offline / bring it back:**
```sql
UPDATE suite_rooms SET is_active = FALSE WHERE room_number = '204';  -- hide
UPDATE suite_rooms SET is_active = TRUE  WHERE room_number = '204';  -- restore
```
> ⚠️ **Do not `DELETE` a room** that has bookings — `suite_bookings.room_id`
> references it. Use `is_active = false` instead.

### ‼️ Important: how the website applies a TYPE offer
The site is **type-based**. For a given type it uses the **highest `offer_percent`
among that type's active-offer rooms**, and charges that same offer to **every
room booked of that type**. So:
- To offer 10% on Delight → set `offer_active/offer_percent=10` on the Delight rooms.
- **Keep the offer identical on all rooms of a type.** If rooms in one type have
  *different* offers, the site uses the biggest one for the whole type.
- `base_price` should also be **the same for all rooms in a type** (the site
  prices a type from a representative room).

---

## 3. Pricing formula (so the webapp shows the same numbers)

Per room, per booking:
```
subtotal (base_amount) = base_price × nights
discount               = offer_active ? subtotal × offer_percent/100 : 0
taxable                = subtotal − discount
gst_amount             = taxable × gst_rate/100
total_amount           = taxable + gst_amount        ← what the guest pays
```
Example — Delight, 1 night, 10% offer, 12% GST:
`4000 − 400 = 3600`, `+12% GST = 432`, **total = ₹4,032**.
A booking of N rooms = N × that total, all in one payment.

---

## 4. `suite_bookings` — the reservations (YOU read this)

One row **per room**. Rooms booked together share a `group_id` / `group_ref`
and **one Razorpay payment**.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `booking_code` | text (unique) | per-room code, e.g. `TW-KCYK3N` |
| `group_id` | uuid | ties rooms booked together |
| `group_ref` | text | guest-facing reference, e.g. `TW-68C4S3` (on invoice/SMS/QR) |
| `room_id` | uuid (FK) | → `suite_rooms.id` |
| `room_number` / `room_name` | text | snapshot at booking time |
| `customer_name` | text | |
| `customer_phone` | text | 10-digit |
| `customer_email` | text | nullable |
| `check_in` / `check_out` | date | |
| `nights` | int | |
| `guests` | int | |
| `base_amount` | numeric | subtotal (pre-discount, pre-GST) |
| `discount_amount` | numeric | offer amount |
| `gst_rate` | numeric | % snapshot |
| `gst_amount` | numeric | |
| `total_amount` | numeric | **charged amount (incl. GST)** |
| `payment_status` | text | `pending` / `paid` / `failed` / `refunded` |
| `razorpay_order_id` / `razorpay_payment_id` / `razorpay_signature` | text | |
| `status` | text | `pending` / `confirmed` / `cancelled` / `completed` |
| `notes` | text | guest special requests |
| `sms_sent_at` | timestamptz | confirmation SMS timestamp (null = not sent) |
| `invoice_url` | text | hosted PDF invoice (Vercel Blob) |
| `checked_in_at` | timestamptz | **you set this** when the guest arrives (null = not arrived) |
| `checked_out_at` | timestamptz | **you set this** when the guest leaves (null = still in) |
| `created_at` / `updated_at` | timestamptz | |

### What the statuses mean
- **A real, confirmed, paid booking** = `status = 'confirmed'` AND `payment_status = 'paid'`.
- `status = 'pending'` + `payment_status = 'pending'` = a **checkout in progress or
  abandoned hold**. These auto-delete after ~15 min if never paid — don't treat them as sales.
- `cancelled` / `failed` = payment didn't complete. `refunded` = money returned.
- `completed` is free for you to set from the webapp (e.g. after checkout/stay ends).

---

## 5. Reading bookings — ready-to-use queries

**All confirmed bookings (newest first), grouped:**
```sql
SELECT group_ref, customer_name, customer_phone,
       array_agg(room_number ORDER BY room_number) AS rooms,
       min(check_in) AS check_in, min(check_out) AS check_out,
       sum(total_amount) AS total_paid, min(created_at) AS booked_at
  FROM suite_bookings
 WHERE status = 'confirmed' AND payment_status = 'paid'
 GROUP BY group_ref, customer_name, customer_phone
 ORDER BY booked_at DESC;
```

**Today's arrivals (check-ins):**
```sql
SELECT room_number, room_name, customer_name, customer_phone, guests, group_ref
  FROM suite_bookings
 WHERE status = 'confirmed' AND check_in = CURRENT_DATE
 ORDER BY room_number;
```

**Today's departures (check-outs):**
```sql
SELECT room_number, customer_name, group_ref
  FROM suite_bookings
 WHERE status = 'confirmed' AND check_out = CURRENT_DATE;
```

**Which rooms are occupied on a given date:**
```sql
SELECT room_number, room_name, customer_name
  FROM suite_bookings
 WHERE status IN ('confirmed','completed')
   AND $1::date >= check_in AND $1::date < check_out;   -- half-open range
```

**Revenue for a period:**
```sql
SELECT sum(total_amount) AS revenue, sum(gst_amount) AS gst_collected, count(*) AS room_nights
  FROM suite_bookings
 WHERE payment_status = 'paid'
   AND created_at >= $1 AND created_at < $2;
```

**Look up a booking by the QR / reference scanned at check-in:**
```sql
SELECT * FROM suite_bookings WHERE group_ref = $1;   -- $1 = scanned code, e.g. TW-68C4S3
```
> The invoice QR encodes the **`group_ref`** as plain text. Scan → query by it.

**Mark a group checked-in / checked-out** (from the webapp, after scanning the QR):
```sql
-- arrival (all rooms of the group)
UPDATE suite_bookings SET checked_in_at = NOW()
 WHERE group_ref = $1 AND checked_in_at IS NULL;

-- departure
UPDATE suite_bookings SET checked_out_at = NOW(), status = 'completed'
 WHERE group_ref = $1 AND checked_out_at IS NULL;
```

**Currently in-house (arrived, not yet departed):**
```sql
SELECT room_number, customer_name, group_ref, checked_in_at
  FROM suite_bookings
 WHERE checked_in_at IS NOT NULL AND checked_out_at IS NULL
 ORDER BY room_number;
```

---

## 6. Availability (matches what the website shows)

A room is **free** for `[check_in, check_out)` when no active booking overlaps.
Count free rooms per type like this:
```sql
SELECT r.name AS type, count(*) AS available
  FROM suite_rooms r
 WHERE r.is_active
   AND NOT EXISTS (
     SELECT 1 FROM suite_bookings b
      WHERE b.room_id = r.id
        AND b.status IN ('pending','confirmed')
        AND daterange(b.check_in, b.check_out, '[)') && daterange($1, $2, '[)')
   )
 GROUP BY r.name;
```
Double-booking is **impossible** — enforced by a DB GIST exclusion constraint
(`suite_bookings_nooverlap`), not just app logic.

---

## 7. Live updates (realtime)

Both tables fire the shared `notify_db_changes()` trigger on every
INSERT/UPDATE/DELETE, sending Postgres `NOTIFY` on channel **`db_changes`**:
```json
{ "table": "suite_bookings", "action": "INSERT", "id": "<uuid>" }
```
Your webapp can `LISTEN db_changes` and refresh when `table` is
`suite_rooms` or `suite_bookings` — the same mechanism the dining side already uses.

---

## 8. Gotchas checklist
- Money is **rupees**, pre-GST for `base_*`. Don't multiply by 100 (that's only Razorpay-internal).
- Keep `base_price` and the offer **uniform within a type** (the site prices per type).
- Never `DELETE` a room with bookings — use `is_active = false`.
- `pending` rows are holds, not sales — filter to `status='confirmed' AND payment_status='paid'`.
- `check_in`/`check_out` are dates only; clock times are hotel policy (add your own if needed).
- `updated_at` auto-bumps; you don't set it.
