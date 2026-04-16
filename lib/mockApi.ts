// Dummy API layer — swap `fetchVenue`/`submitBooking` with your real HTTP calls later.
// Response shapes are kept the same as the expected backend contract.

export type VenueId = 'restaurant' | 'rooftop' | 'bar' | 'suites';

export type SlotId = 'lunch' | 'tea' | 'dinner' | 'night';

export type Slot = {
  id: SlotId;
  label: string;     // "12:00 PM – 3:00 PM"
  start: string;     // "12:00"
  end: string;       // "15:00"
};

export const TIME_SLOTS: Slot[] = [
  { id: 'lunch',  label: '12:00 PM – 3:00 PM',  start: '12:00', end: '15:00' },
  { id: 'tea',    label: '3:00 PM – 5:00 PM',   start: '15:00', end: '17:00' },
  { id: 'dinner', label: '5:00 PM – 8:00 PM',   start: '17:00', end: '20:00' },
  { id: 'night',  label: '8:00 PM – 12:00 AM',  start: '20:00', end: '00:00' }
];

export type Table = {
  id: string;
  label: string;           // "T-01"
  seats: number;
  shape: 'round' | 'square' | 'rect';
  position: [number, number, number];  // x,y,z in scene units
  rotation?: number;        // radians, Y-axis
  availability: Record<SlotId, boolean>;
};

export type Suite = {
  id: string;
  label: string;
  name: string;
  tag: 'Royal' | 'Premium' | 'Classic';
  beds: number;
  sqft: number;
  priceNight: number;
  position: [number, number, number];
  availableDates: string[];   // ISO dates available in next 30 days
};

export type VenueData = {
  id: VenueId;
  name: string;
  description: string;
  tables?: Table[];
  suites?: Suite[];
  groundColor: string;
  ambient: string;
};

// ---------- DUMMY DATA ----------

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const buildTables = (prefix: string, count: number, seed: number): Table[] => {
  const r = rng(seed);
  const tables: Table[] = [];
  const cols = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const shapes: Table['shape'][] = ['round', 'square', 'rect'];
    tables.push({
      id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
      label: `${prefix}${i + 1}`,
      seats: [2, 2, 4, 4, 6, 8][Math.floor(r() * 6)],
      shape: shapes[Math.floor(r() * 3)],
      position: [(col - (cols - 1) / 2) * 3.2, 0, (row - 1.2) * 3.2],
      rotation: r() > 0.7 ? Math.PI / 4 : 0,
      availability: {
        lunch:  r() > 0.25,
        tea:    r() > 0.2,
        dinner: r() > 0.4,
        night:  r() > 0.35
      }
    });
  }
  return tables;
};

const futureDates = (count: number, skip = 0): string[] => {
  const out: string[] = [];
  const today = new Date();
  for (let i = skip; i < skip + count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

const SUITES: Suite[] = [
  { id: 'ste-royal-01',    label: 'RS-01', name: 'The Royal Suite',    tag: 'Royal',   beds: 1, sqft: 1200, priceNight: 28000, position: [-8, 0,  0], availableDates: futureDates(20, 2) },
  { id: 'ste-royal-02',    label: 'RS-02', name: 'The Royal Suite',    tag: 'Royal',   beds: 1, sqft: 1200, priceNight: 28000, position: [ 8, 0,  0], availableDates: futureDates(18, 0) },
  { id: 'ste-garden-01',   label: 'GS-01', name: 'Garden Suite',       tag: 'Premium', beds: 1, sqft:  850, priceNight: 18500, position: [-8, 0,  7], availableDates: futureDates(25, 1) },
  { id: 'ste-garden-02',   label: 'GS-02', name: 'Garden Suite',       tag: 'Premium', beds: 2, sqft:  900, priceNight: 19500, position: [ 8, 0,  7], availableDates: futureDates(22, 0) },
  { id: 'ste-heritage-01', label: 'HS-01', name: 'Heritage Suite',     tag: 'Classic', beds: 1, sqft:  700, priceNight: 14200, position: [-8, 0, -7], availableDates: futureDates(28, 0) },
  { id: 'ste-heritage-02', label: 'HS-02', name: 'Heritage Suite',     tag: 'Classic', beds: 2, sqft:  720, priceNight: 14800, position: [ 8, 0, -7], availableDates: futureDates(26, 3) }
];

const DB: Record<VenueId, VenueData> = {
  restaurant: {
    id: 'restaurant',
    name: 'Family Restaurant',
    description: 'Indoor fine-dining hall with warm ambient light.',
    groundColor: '#f5ead0',
    ambient: '#FCF1D6',
    tables: buildTables('R', 12, 7)
  },
  rooftop: {
    id: 'rooftop',
    name: 'Rooftop Lounge',
    description: 'Open-air rooftop under the stars.',
    groundColor: '#eaf0ea',
    ambient: '#e6f0ec',
    tables: buildTables('F', 10, 42)
  },
  bar: {
    id: 'bar',
    name: 'Signature Bar',
    description: 'Low-lit bar with high-tops and cocktail service.',
    groundColor: '#efe5d0',
    ambient: '#f5ead0',
    tables: buildTables('B', 8, 17)
  },
  suites: {
    id: 'suites',
    name: 'Luxury Suites',
    description: 'Curated stays — select a suite and your dates.',
    groundColor: '#f3e8d0',
    ambient: '#fbf3dc',
    suites: SUITES
  }
};

// ---------- "API" ----------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchVenue(id: VenueId): Promise<VenueData> {
  await delay(400);
  return JSON.parse(JSON.stringify(DB[id]));
}

export async function fetchTimeSlots(): Promise<Slot[]> {
  await delay(150);
  return TIME_SLOTS;
}

export type BookingPayload =
  | {
      kind: 'table';
      venue: VenueId;
      tableId: string;
      slot: SlotId;
      date: string;
      guests: number;
      name: string;
      phone: string;
      email: string;
      notes?: string;
    }
  | {
      kind: 'suite';
      suiteId: string;
      checkIn: string;
      checkOut: string;
      guests: number;
      name: string;
      phone: string;
      email: string;
      notes?: string;
    };

export type BookingResult = {
  success: boolean;
  confirmationId: string;
  message: string;
};

export async function submitBooking(payload: BookingPayload): Promise<BookingResult> {
  await delay(900);
  return {
    success: true,
    confirmationId: 'BKG-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 900000 + 100000),
    message:
      payload.kind === 'table'
        ? `Table ${payload.tableId} reserved for ${payload.guests} guest(s).`
        : `Suite ${payload.suiteId} booked from ${payload.checkIn} to ${payload.checkOut}.`
  };
}
