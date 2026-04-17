// Hand-crafted floor plan for TRESSA Sky (rooftop).
// Source: `public/3d layout/Sky (RoofTop).jpg`
//
// Coordinate system (top-down):
//   x → right, z → toward bottom of sketch.
//   Origin at the room centre. Room spans roughly x ∈ [-9, 9], z ∈ [-11, 11].
//   Rotations are radians around the Y axis (Math.PI / 2 = 90° turn).
//
// Pure data file — edit table positions, seats, shape, or rotation here and the
// 3D scene updates automatically (consumed by `lib/mockApi.ts`).

import type { Table, SlotId } from '@/lib/mockApi';

export type LayoutProp =
  | { kind: 'wall'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string }
  | { kind: 'counter'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string }
  | { kind: 'projector'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'door'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'rock'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string }
  | { kind: 'glass'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'kitchen'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string };

/* ============================================================
 * TABLES — 14 total, arranged to match the hand-drawn floor plan
 * ============================================================
 *
 * sketch row → world z
 *   row 1 (top right, near projector wall)   → z ≈ -7.5    | 1 × 4P square
 *   row 2 (upper)                            → z ≈ -3.5    | 1 × 6P round + 1 × 4P square
 *   row 3 (middle)                           → z ≈  0      | 6P rect + 4P rect (left, horizontal) + 6P round + 4P square
 *   row 4 (mid-lower)                        → z ≈  3.8    | 1 × 4P square (right column)
 *   row 5 (lower)                            → z ≈  5.5    | 6P + 6P (left, vertical) + 6P (centre, horizontal)
 *   row 6 (bottom, beneath the divider bar)  → z ≈  9      | 3 × 4P squares
 */

type RawTable = Omit<Table, 'availability'>;

const TABLES: RawTable[] = [
  // -------- Row 1 — top of room, right side near entry --------
  { id: 'SKY-01', label: 'S1', seats: 4, shape: 'square', position: [7, 2.0, -7.5] },

  // -------- Row 2 — first round + right square --------
  { id: 'SKY-02', label: 'S2', seats: 6, shape: 'round', position: [3.5, 0, -5.5] },
  { id: 'SKY-03', label: 'S3', seats: 4, shape: 'square', position: [7, 0, -4.0] },

  // -------- Row 3 — upper-left pair (HORIZONTAL rects) + second round + right square --------
  { id: 'SKY-04', label: 'S4', seats: 6, shape: 'rect', position: [-6.5, 0, 1.0], rotation: 0 }, // 6P horizontal
  { id: 'SKY-05', label: 'S5', seats: 4, shape: 'rect', position: [-3.5, 0, 1.0], rotation: 0 }, // 4P horizontal


  { id: 'SKY-06', label: 'S6', seats: 6, shape: 'round', position: [3.5, 0, -1.5] },
  { id: 'SKY-07', label: 'S7', seats: 4, shape: 'square', position: [7, 0, -0.5] },

  // -------- Row 4 — single right-column square --------
  { id: 'SKY-08', label: 'S8', seats: 4, shape: 'square', position: [7, 0, 2.8] },

  // -------- Row 5 — lower-left pair (VERTICAL rects) + centre horizontal rect --------
  { id: 'SKY-09', label: 'S9', seats: 6, shape: 'rect', position: [-7.0, 0, 5.5], rotation: Math.PI / 2 }, // 6P vertical
  { id: 'SKY-10', label: 'S10', seats: 6, shape: 'rect', position: [-3.5, 0, 5.5], rotation: Math.PI / 2 }, // 6P vertical
  { id: 'SKY-11', label: 'S11', seats: 6, shape: 'rect', position: [3.5, 0, 2.5], rotation: 0 },           // 6P horizontal

  // -------- Row 6 — three 4P squares along the bottom --------
  { id: 'SKY-12', label: 'S12', seats: 4, shape: 'square', position: [-6.0, 0, 9.0] },
  { id: 'SKY-13', label: 'S13', seats: 4, shape: 'square', position: [-3.0, 0, 9.0] },
  { id: 'SKY-14', label: 'S14', seats: 4, shape: 'square', position: [1.0, 0, 9.0] }
];

/* ============================================================
 * PROPS — fixtures that aren't tables
 * ============================================================
 *  • Outer walls (gap on the upper-right for the entry doorway)
 *  • Counter along the upper-left edge
 *  • Projector wall recessed into the back wall
 *  • Inner projector / divider near the upper-left counter
 *  • Two pillars (the hatched squares in the sketch)
 *  • Washroom block, bottom-right corner
 *  • Cross-room divider bar between Row 5 and Row 6 (the heavy hatched bar in the sketch)
 *  • Entry doorway marker
 */

const WALL_H = 3.0;
const WALL_T = 0.25;

export const SKY_PROPS: LayoutProp[] = [
  // ---- outer walls (all rock, width 0.25) ----
  { kind: 'rock', id: 'w-left',        position: [-9, WALL_H / 2, 0],    size: [0.25, WALL_H, 22],   color: '#c9a07c' },
  { kind: 'glass', id: 'w-right-glass', position: [9, WALL_H / 2, -2],   size: [WALL_T, WALL_H, 15.3] }, // glass — unchanged
  { kind: 'rock', id: 'w-right-b',     position: [9, WALL_H / 2, 8],     size: [0.25, WALL_H, 6],    color: '#c9a07c' },
  { kind: 'rock', id: 'w-back',        position: [-2, WALL_H / 2, -11],  size: [14, WALL_H, 0.25],   color: '#c9a07c' },
  // Front wall — left half glass, right half rock (washroom side)
  { kind: 'glass', id: 'w-front-glass', position: [-2.6, WALL_H / 2, 11], size: [12.8, WALL_H, WALL_T] }, // glass — unchanged
  { kind: 'rock',  id: 'w-front-solid', position: [ 6.4, WALL_H / 2, 11], size: [5.2, WALL_H, 0.25],  color: '#c9a07c' },

  // ---- open bar counter with kitchen ----
  { kind: 'kitchen', id: 'kitchen-L', position: [-8, 0.5, -7], size: [1.8, 1.0, 8], label: 'Bar Counter' },
  // ---- serving table in front of bar (customer-facing, black, table structure) ----
  { kind: 'counter', id: 'serving-front', position: [-5, 0.4, -7], size: [1.2, 0.8, 8], color: '#1a1a1a' },

  // ---- top projector wall ----
  { kind: 'projector', id: 'proj-top', position: [2.0, 1.5, -10.55], size: [5.0, 1.9, 0.12], label: 'Projector' },

  // ---- inner projector / wall divider ----
  { kind: 'projector', id: 'proj-inner', position: [-4.5, 1.3, -2.5], size: [3.0, 1.6, 0.10], label: 'Projector' },
  { kind: 'rock', id: 'divider-bar',    position: [-5.5, 1.3, -2.7],  size: [7, WALL_H, 0.25],   color: '#c9a07c' },

  // ---- two rock pillars near the projector wall ----
  { kind: 'rock', id: 'pillar-1', position: [-2.0, WALL_H / 2, -8.5], size: [0.7, WALL_H, 0.7], color: '#c9a07c' },
  { kind: 'rock', id: 'pillar-2', position: [-2.0, WALL_H / 2, -6.0], size: [0.7, WALL_H, 0.7], color: '#c9a07c' },

  // ---- washroom block (bottom-right corner) ----
  { kind: 'rock', id: 'washroom-front', position: [5, WALL_H / 2, 4.5],   size: [8, WALL_H, 0.25],    color: '#c9a07c', label: 'Washroom' },
  { kind: 'rock', id: 'washroom-side',  position: [3.8, WALL_H / 2, 9.0], size: [0.25, WALL_H, 4],     color: '#c9a07c' },

  // ---- cross-room rock divider ----
  { kind: 'rock', id: 'divider-rock', position: [1.30, WALL_H / 2, 7.3], size: [5.5, WALL_H, 0.25], color: '#c9a07c' }
];

/* ============================================================
 * Availability — deterministic per-table so reloads don't shuffle
 * ============================================================ */

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const availabilityFor = (id: string): Record<SlotId, boolean> => {
  const h = hash(id);
  return {
    lunch: (h & 0b1000) === 0 ? true : (h % 13) > 3,
    tea: (h & 0b0100) === 0 ? true : (h % 11) > 2,
    dinner: (h & 0b0010) === 0 ? true : (h % 17) > 4,
    night: (h & 0b0001) === 0 ? true : (h % 19) > 5
  };
};

export const SKY_TABLES: Table[] = TABLES.map((t) => ({
  ...t,
  availability: availabilityFor(t.id),
  tableColor: '#1a1a1a',   // black tables
  chairColor: '#6b6b6b'    // gray sofa chairs
}));

export const SKY_LAYOUT = {
  tables: SKY_TABLES,
  props: SKY_PROPS,
  groundColor: '#eaf0ea',
  ambient: '#e6f0ec'
};
