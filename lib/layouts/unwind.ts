// Hand-crafted floor plan for TRESSA Unwind (bar).
// Source: public/3d layout/unwind.jpg (sketch) + venue photos
//
// From venue photos:
//   Tables  — dark black marble, polished, white veining (#1a1a1a)
//   Chairs  — cognac/tan leather + black metal frame (#b5734a frame #1a1a1a)
//   Bar     — gold/bronze diamond-texture front, white marble top,
//             dark teal-green back wall with arched lit bottle shelves
//   Floor   — dark marble (#1e1e1e)
//   Walls   — warm beige/concrete (#d4c4a8)
//
// Coordinate: x → right, z → down. Entry top-right, Washroom bottom-right.
// Room: x ∈ [-9, 9], z ∈ [-11, 11]

import type { Table } from '@/lib/venueTypes';
import { DEFAULT_AVAILABILITY } from '@/lib/venueConfig';
import type { LayoutProp } from '@/lib/layouts/sky';

type RawTable = Omit<Table, 'availability'>;

/* ============================================================
 * SKETCH READING (top→bottom, left→right):
 *
 * ROW 1 (z≈-9, near Entry):
 *   [12P vert rect] ··· [4P sq] [4P sq] ··· [6P horiz rect]
 *   Entry door + 2 pillars at top-right corner
 *
 * ROW 2 (z≈-5.5):
 *   [4P sq] ····· {hatched fixtures} ····· [8P horiz rect]
 *
 * BAR ZONE (z≈-4 to z≈+2, center):
 *   Left of bar:  [6P vert rect]    Right above bar: —
 *   Above bar:    [4P sq]
 *   U-shaped Bar Counter in center
 *
 * ROW 4 (z≈+3, below bar):
 *   [4P sq] [4P sq] ················ [6P horiz rect]
 *
 * ROW 5 (z≈+6):
 *   [6P horiz rect] ···· {Pillar} {Pillar}
 *
 * ROW 6 (z≈+8.5, near bottom):
 *   [6P horiz rect]      {Plants area}
 *
 * BOTTOM: stairs/canvas area (left), washroom (right)
 * ============================================================ */

const TABLES: RawTable[] = [
  // ---- ROW 1 (near entry, z≈-9) ----
  { id: 'UW-01', label: 'U1', seats: 12, shape: 'rect', position: [-7.0, 0, -7.0], rotation: Math.PI / 2 },
  { id: 'UW-02', label: 'U2', seats: 4, shape: 'square', position: [-3.5, 0, -9.0] },
  { id: 'UW-03', label: 'U3', seats: 4, shape: 'square', position: [-3.5, 0, 1.5] },
  { id: 'UW-04', label: 'U4', seats: 6, shape: 'rect', position: [0.0, 0, -9.0], rotation: 0 },

  // ---- ROW 2 (z≈-5.5) ----
  { id: 'UW-05', label: 'U5', seats: 4, shape: 'square', position: [-3.5, 0, -2.0] },
  { id: 'UW-06', label: 'U6', seats: 8, shape: 'rect', position: [6.5, 0, -3.3], rotation: 0 },

  // ---- LEFT OF BAR (z≈-1.5) ----
  { id: 'UW-07', label: 'U7', seats: 6, shape: 'rect', position: [-7.0, 0, -2.0], rotation: Math.PI / 2 },

  // ---- ABOVE BAR (z≈-3.5) ----

  // ---- ROW 4 — below bar (z≈+3) ----
  { id: 'UW-10', label: 'U10', seats: 4, shape: 'square', position: [-3.5, 0, -5.5] },
  { id: 'UW-11', label: 'U11', seats: 6, shape: 'rect', position: [6.5, 0, 1.5], rotation: 0 },

  // ---- ROW 5 (z≈+6) ----
  { id: 'UW-12', label: 'U12', seats: 6, shape: 'rect', position: [-7.0, 0, 2.0], rotation: 0 },

  // ---- ROW 6 — near bottom (z≈+8.5) ----
  { id: 'UW-13', label: 'U13', seats: 6, shape: 'rect', position: [-7.0, 0, 6.0], rotation: 0 }
];

/* ============================================================
 * PROPS
 * ============================================================ */

const WALL_H = 3.0;
const beige = '#d4c4a8';
const pillarColor = '#b8a890';

export const UNWIND_PROPS: LayoutProp[] = [
  // ---- outer walls (warm beige concrete) ----
  { kind: 'wall', id: 'uw-left', position: [-9, WALL_H / 2, 0], size: [0.25, WALL_H, 22], color: beige },
  { kind: 'wall', id: 'uw-right', position: [9, WALL_H / 2, 0], size: [0.25, WALL_H, 22], color: beige },
  { kind: 'wall', id: 'uw-back', position: [-1.5, WALL_H / 2, -11], size: [15, WALL_H, 0.25], color: beige },
  { kind: 'wall', id: 'uw-front', position: [0, WALL_H / 2, 11], size: [18, WALL_H, 0.25], color: beige },

  // ---- U-SHAPED BAR COUNTER (5 segments for curvature) ----
  //
  //  Left arm     ║          ║  Right arm
  //  (kitchen)    ║   open   ║  (counter)
  //  x≈-1.5      ║  inside  ║  x≈+1.5
  //               ╚══════════╝  curved bottom
  //
  // Left arm — has drink almira/bottle display behind
  { kind: 'kitchen', id: 'bar-L', position: [-1.5, 0.5, 0.0], size: [1.0, 1.0, 5.5], label: 'Bar Counter' },
  // Right arm
  { kind: 'counter', id: 'bar-R', position: [1.5, 0.5, 0.0], size: [1.0, 1.0, 5.5] },
  // Smooth curved top — 12 segments along a semicircular arc (entry side)
  // Arc center: (0, 0.5, -2.75), radius 1.5, sweeps from left arm to right arm
  ...Array.from({ length: 12 }, (_, i) => {
    const angle = Math.PI - (i + 0.5) * (Math.PI / 12);
    return {
      kind: 'counter' as const,
      id: `bar-C${i}`,
      position: [
        Math.cos(angle) * 1.5,
        0.5,
        -2.75 - Math.sin(angle) * 1.5
      ] as [number, number, number],
      size: [0.5, 1.0, 0.9] as [number, number, number],
      rotation: angle - Math.PI / 2
    };
  }),

  // ---- PILLARS (from sketch — 2 near entry, 2 in lower area) ----
  // Near entry (top-right corner, flanking the entrance)
  { kind: 'pillar', id: 'pil-1', position: [6.5, WALL_H / 2, -6.0], size: [0.7, WALL_H, 0.5], color: pillarColor },
  { kind: 'pillar', id: 'pil-2', position: [6.5, WALL_H / 2, -1.0], size: [0.7, WALL_H, 0.5], color: pillarColor },
  // Hatched fixtures between row 1 & bar (structural, center area)
  { kind: 'pillar', id: 'pil-3', position: [-1.5, WALL_H / 2, -5.5], size: [0.7, WALL_H, 0.5], color: pillarColor },
  { kind: 'pillar', id: 'pil-4', position: [6.5, WALL_H / 2, 4.0], size: [0.7, WALL_H, 0.5], color: pillarColor },
  // Lower area (labelled "Pillar" in sketch)

  // ---- PLANTS (lower-right, circles in sketch) ----
  // { kind: 'wall', id: 'plt-1', position: [5.0, 0.35, 7.0], size: [0.5, 0.7, 0.5], color: '#2d5a1e' },
  // { kind: 'wall', id: 'plt-2', position: [6.5, 0.35, 7.0], size: [0.5, 0.7, 0.5], color: '#3a7a28' },
  // { kind: 'wall', id: 'plt-3', position: [8.0, 0.35, 7.0], size: [0.5, 0.7, 0.5], color: '#4a8a38' },
  // { kind: 'wall', id: 'plt-4', position: [5.5, 0.35, 8.2], size: [0.5, 0.7, 0.5], color: '#356b22' },
  // { kind: 'wall', id: 'plt-5', position: [7.0, 0.35, 8.2], size: [0.5, 0.7, 0.5], color: '#2d5a1e' },

  // ---- WASHROOM (bottom-right corner) ----
  { kind: 'wall', id: 'uw-wc-f', position: [6.0, WALL_H / 2, 9.5], size: [6, WALL_H, 0.25], color: beige, label: 'Washroom' },
  { kind: 'wall', id: 'uw-wc-s', position: [3.0, WALL_H / 2, 10.2], size: [0.25, WALL_H, 1.5], color: beige },

  // ---- CANVAS / STAIRS area wall (bottom-left) ----
  // { kind: 'wall', id: 'uw-canvas', position: [-5.0, WALL_H / 2, 9.5], size: [8, WALL_H, 0.25], color: beige },

  // ---- ENTRY door (top-right corner) ----
];

// Availability comes from the bookings table via /api/availability.
// BookingClient overlays real reservations on top of this open state.
export const UNWIND_TABLES: Table[] = TABLES.map((t) => ({
  ...t,
  availability: { ...DEFAULT_AVAILABILITY },
  tableColor: '#1a1a1a',
  chairColor: '#b5734a'
}));

export const UNWIND_LAYOUT = {
  tables: UNWIND_TABLES,
  props: UNWIND_PROPS,
  groundColor: '#FDF5E6',  // light cream floor
  ambient: '#f5ead0'
};
