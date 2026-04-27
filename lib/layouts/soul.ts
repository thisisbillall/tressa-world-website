// Hand-crafted floor plan for TRESSA Soul (family restaurant).
// Source: public/3d layout/Soul.jpg (sketch) + public/Soul/*.JPG (venue photos)
//
// From venue photos:
//   Tables  — dark green-black marble, polished (#1a2018)
//   Chairs  — cognac/tan leather + black metal frame (#b5734a)
//   Floor   — white/cream polished tile (#f5efe6)
//   Walls   — cream/white base (#f0e8d8)
//   Decor   — colorful abstract art wall, black niche wall with amber spotlights,
//             dark walnut wood panels with amber LED strips, tropical plants in
//             white pots, cream curtains, wooden slat partition at entry,
//             flower display, buffet/serving counter, cash counter
//
// Coordinate: x → right, z → down. Entry bottom-left, Cash counter bottom.
// Room: x ∈ [-9, 9], z ∈ [-11, 11]

import type { Table } from '@/lib/venueTypes';
import { DEFAULT_AVAILABILITY } from '@/lib/venueConfig';
import type { LayoutProp } from '@/lib/layouts/sky';

type RawTable = Omit<Table, 'availability'>;

/* ============================================================
 * SKETCH READING (top→bottom, left→right):
 *
 * TOP-LEFT:   "Empty" area (art wall + plants, no tables)
 * ROW 1 (z≈-9, right of empty):  [4P sq] [4P sq] [6P rect]
 * ROW 2 (z≈-5.5):   [8P rect (left)] ··· [4P sq] ··· [6P rect]
 * ROW 3 (z≈-2):     [4P sq (left)] ··· [4P sq] ··· [6P rect]
 * ROW 4 (z≈+1.5):   [4P sq (left)] ················· [6P rect]
 * ROW 5 (z≈+5):     {stairs} {sofa} ··· [4P sq] [6P rect]
 * ROW 6 (z≈+8.5):   {entry} ············ [4P sq] [6P rect]
 * BOTTOM:            {cash counter}
 * ============================================================ */

const TABLES: RawTable[] = [
  // ---- ROW 1 (z≈-9, right side of "Empty" area) ----
  { id: 'SL-01', label: 'F-1', seats: 4, shape: 'square', position: [-1.6, 0, -9.0] },
  { id: 'SL-02', label: 'F-2', seats: 4, shape: 'square', position: [1.5, 0, -9.0] },
  { id: 'SL-03', label: 'F-3', seats: 6, shape: 'rect', position: [6.5, 0, -9.0], rotation: 0 },

  // ---- ROW 2 (z≈-5.5) ----
  { id: 'SL-04', label: 'F-4', seats: 8, shape: 'rect', position: [-5.5, 0, -5.5], rotation: 0 },
  { id: 'SL-05', label: 'F-5', seats: 4, shape: 'square', position: [1.5, 0, 1.5] },
  { id: 'SL-06', label: 'F-6', seats: 6, shape: 'rect', position: [6.5, 0, -5.5], rotation: 0 },

  // ---- ROW 3 (z≈-2) ----
  { id: 'SL-07', label: 'F-7', seats: 4, shape: 'square', position: [-5.5, 0, -2.0] },
  { id: 'SL-08', label: 'F-8', seats: 4, shape: 'square', position: [1.5, 0, -2.0] },
  { id: 'SL-09', label: 'F-9', seats: 4, shape: 'square', position: [-1.5, 0, -2.0] },
  { id: 'SL-10', label: 'F-10', seats: 6, shape: 'rect', position: [6.5, 0, -2.0], rotation: 0 },

  // ---- ROW 4 (z≈+1.5) ----
  { id: 'SL-11', label: 'F-11', seats: 4, shape: 'square', position: [-5.5, 0, 1.5] },
  { id: 'SL-12', label: 'F-12', seats: 6, shape: 'rect', position: [6.5, 0, 1.5], rotation: 0 },

  // ---- ROW 5 (z≈+5) ----
  { id: 'SL-12b', label: 'F-12b', seats: 4, shape: 'square', position: [1.5, 0, 5.0] },
  { id: 'SL-13', label: 'F-13', seats: 6, shape: 'rect', position: [6.5, 0, 5.0], rotation: 0 },
  { id: 'SL-14', label: 'F-14', seats: 4, shape: 'square', position: [1.5, 0, 8.5] },
  { id: 'SL-15', label: 'F-15', seats: 6, shape: 'rect', position: [6.5, 0, 8.5], rotation: 0 },

  // ---- ROW 6 (z≈+8.5, near entry) ----
];

/* ============================================================
 * PROPS — walls, decorations, fixtures
 * ============================================================ */

const WALL_H = 3.2;
const cream = '#f0e8d8';
const walnut = '#3a2418';
const black = '#0a0a0a';

export const SOUL_PROPS: LayoutProp[] = [
  // ======== OUTER WALLS (cream/white) ========
  { kind: 'wall', id: 'sl-left', position: [-9, WALL_H / 2, 0], size: [0.25, WALL_H, 22], color: cream },
  { kind: 'wall', id: 'sl-right', position: [9, WALL_H / 2, 0], size: [0.25, WALL_H, 22], color: cream },
  { kind: 'wall', id: 'sl-back', position: [0, WALL_H / 2, -11], size: [18, WALL_H, 0.25], color: cream },
  { kind: 'wall', id: 'sl-front', position: [0, WALL_H / 2, 11], size: [18, WALL_H, 0.25], color: cream },

  // ======== COLORFUL ABSTRACT ART WALL (top-left "Empty" area) ========
  // Back wall section behind the art area — multicolored accent
  { kind: 'wall', id: 'art-wall', position: [-5.5, WALL_H / 2, -8.0], size: [5, WALL_H, 0.15], color: '#e8d8c0' },
  // Colorful art panels (simplified as colored wall strips)
  { kind: 'wall', id: 'art-1', position: [-7.0, 1.8, -7.8], size: [1.0, 0.8, 0.08], color: '#2a8a4a' },
  { kind: 'wall', id: 'art-2', position: [-5.5, 2.2, -7.8], size: [0.8, 0.6, 0.08], color: '#c44a2a' },
  { kind: 'wall', id: 'art-3', position: [-4.5, 1.5, -7.8], size: [0.7, 0.9, 0.08], color: '#3a6ac4' },
  { kind: 'wall', id: 'art-4', position: [-6.2, 1.0, -7.8], size: [0.9, 0.7, 0.08], color: '#e4a832' },
  { kind: 'wall', id: 'art-5', position: [-3.8, 2.5, -7.8], size: [0.6, 0.5, 0.08], color: '#8a3a8a' },
  { kind: 'wall', id: 'art-6', position: [-5.0, 0.8, -7.8], size: [0.8, 0.6, 0.08], color: '#4ac4a0' },

  // ======== BLACK DECORATIVE NICHE WALL (left wall, mid section) ========
  // Dark display wall with niches for figurines/bottles (from photos DSC08030, DSC08104)
  { kind: 'wall', id: 'niche-wall', position: [-8.7, WALL_H / 2, -3.0], size: [0.15, WALL_H, 6], color: black },
  // Amber spotlight dots on the niche wall (emissive accents)
  { kind: 'wall', id: 'niche-light-1', position: [-8.55, 2.2, -4.5], size: [0.06, 0.06, 0.06], color: '#E3AB32' },
  { kind: 'wall', id: 'niche-light-2', position: [-8.55, 1.5, -3.5], size: [0.06, 0.06, 0.06], color: '#E3AB32' },
  { kind: 'wall', id: 'niche-light-3', position: [-8.55, 2.2, -2.5], size: [0.06, 0.06, 0.06], color: '#E3AB32' },
  { kind: 'wall', id: 'niche-light-4', position: [-8.55, 1.5, -1.5], size: [0.06, 0.06, 0.06], color: '#E3AB32' },
  { kind: 'wall', id: 'niche-light-5', position: [-8.55, 2.2, -0.5], size: [0.06, 0.06, 0.06], color: '#E3AB32' },

  // ======== DARK WALNUT WOOD PANELS with amber LED strips (right wall) ========
  // From photos: dark brown wood panels with vertical amber light strips between them
  { kind: 'wall', id: 'wood-panel-1', position: [8.7, WALL_H / 2, -8.0], size: [0.12, WALL_H, 2.5], color: walnut },
  { kind: 'wall', id: 'wood-panel-2', position: [8.7, WALL_H / 2, -4.5], size: [0.12, WALL_H, 2.5], color: walnut },
  { kind: 'wall', id: 'wood-panel-3', position: [8.7, WALL_H / 2, -1.0], size: [0.12, WALL_H, 2.5], color: walnut },
  { kind: 'wall', id: 'wood-panel-4', position: [8.7, WALL_H / 2, 2.5], size: [0.12, WALL_H, 2.5], color: walnut },
  // Amber LED strips between wood panels
  { kind: 'wall', id: 'led-strip-1', position: [8.75, WALL_H / 2, -6.3], size: [0.03, WALL_H * 0.8, 0.05], color: '#E3AB32' },
  { kind: 'wall', id: 'led-strip-2', position: [8.75, WALL_H / 2, -2.8], size: [0.03, WALL_H * 0.8, 0.05], color: '#E3AB32' },
  { kind: 'wall', id: 'led-strip-3', position: [8.75, WALL_H / 2, 0.7], size: [0.03, WALL_H * 0.8, 0.05], color: '#E3AB32' },

  // ======== CREAM CURTAINS (near windows, left wall upper area) ========
  { kind: 'wall', id: 'curtain-L1', position: [-8.6, WALL_H / 2, -8.5], size: [0.08, WALL_H, 1.5], color: '#d8ccb8' },
  { kind: 'wall', id: 'curtain-L2', position: [-8.6, WALL_H / 2, 3.0], size: [0.08, WALL_H, 1.5], color: '#d8ccb8' },
  // Right wall curtains
  { kind: 'wall', id: 'curtain-R1', position: [8.6, WALL_H / 2, 6.0], size: [0.08, WALL_H, 2.0], color: '#d8ccb8' },

  // ======== WHITE PILLARS (structural columns from photos) ========
  { kind: 'pillar', id: 'sl-pil-1', position: [0.0, WALL_H / 2, -6.0], size: [0.5, WALL_H, 1.0], color: '#f0ece4' },
  { kind: 'pillar', id: 'sl-pil-2', position: [0.0, WALL_H / 2, -2.0], size: [0.5, WALL_H, 1.0], color: '#f0ece4' },
  // { kind: 'pillar', id: 'sl-pil-2', position: [-2.0, WALL_H / 2, -2.0], size: [0.5, WALL_H, 0.5], color: '#f0ece4' },
  // { kind: 'pillar', id: 'sl-pil-3', position: [-2.0, WALL_H / 2, 3.0], size: [0.5, WALL_H, 0.5], color: '#f0ece4' },

  // ======== TROPICAL PLANTS in white pots (from photos — scattered) ========
  { kind: 'wall', id: 'plant-1', position: [-7.5, 0.5, -7.5], size: [0.5, 1.0, 0.5], color: '#2d6a1e' },
  { kind: 'wall', id: 'plant-2', position: [-3.5, 0.5, -7.5], size: [0.5, 1.0, 0.5], color: '#3a8a28' },
  { kind: 'wall', id: 'plant-3', position: [-7.5, 0.5, 0.0], size: [0.5, 1.0, 0.5], color: '#2d6a1e' },
  // { kind: 'wall', id: 'plant-4', position: [-2.5, 0.5, 5.0], size: [0.5, 1.0, 0.5], color: '#4a9a38' },
  { kind: 'wall', id: 'plant-5', position: [0.5, 0.5, 7.0], size: [0.5, 1.0, 0.5], color: '#3a8a28' },

  // ======== WOODEN SLAT PARTITION (entry area, vertical bars — from DSC08074) ========
  // Series of dark walnut vertical bars forming a divider near entry
  ...Array.from({ length: 8 }, (_, i) => ({
    kind: 'wall' as const,
    id: `slat-${i}`,
    position: [0.0, WALL_H / 2, 6.0 + i * 0.5] as [number, number, number],
    size: [0.08, WALL_H * 0.85, 0.08] as [number, number, number],
    color: walnut
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    kind: 'wall' as const,
    id: `slat-b-${i}`,
    position: [0.0, WALL_H / 2, -1.2 + i * 0.5] as [number, number, number],
    size: [0.08, WALL_H * 0.85, 0.08] as [number, number, number],
    color: walnut
  })),

  
  { kind: 'wall', id: 'partition', position: [-3.0, WALL_H / 2, -9.5], size: [0.15, WALL_H, 3.0], color: cream },

  // ======== CURVED GRAY SOFA (left-center, near entry) ========
  // Solid curved sofa: thick base + thick backrest, both curved with 14 segments
  // Base (seat cushion)
  // ...Array.from({ length: 14 }, (_, i) => {
  //   const angle = -Math.PI / 2.5 + (i + 0.5) * (Math.PI / 2.5 * 2 / 14);
  //   return {
  //     kind: 'counter' as const,
  //     id: `sofa-seat-${i}`,
  //     position: [
  //       -4.0 + Math.cos(angle) * 1.0,
  //       0.22,
  //       7.0 + Math.sin(angle) * 1.0
  //     ] as [number, number, number],
  //     size: [0.35, 0.44, 0.7] as [number, number, number],
  //     color: '#888888',
  //     rotation: angle
  //   };
  // }),
  // // Backrest (taller, on the outer edge of the curve)
  // ...Array.from({ length: 14 }, (_, i) => {
  //   const angle = -Math.PI / 2.5 + (i + 0.5) * (Math.PI / 2.5 * 2 / 14);
  //   return {
  //     kind: 'sofa' as const,
  //     id: `sofa-back-${i}`,
  //     position: [
  //       -4.0 + Math.cos(angle) * 1.4,
  //       0.4,
  //       7.0 + Math.sin(angle) * 1.4
  //     ] as [number, number, number],
  //     size: [0.35, 0.8, 0.25] as [number, number, number],
  //     color: '#7a7a7a',
  //     rotation: angle
  //   };
  // }),

  // ======== PARTITION WALL (vertical, center, separating rows 5-6 from sofa/entry) ========
  { kind: 'wall', id: 'partition-2', position: [0.0, WALL_H / 2, 5.2], size: [0.2, WALL_H, 1.0], color: cream },

  // ======== CASH COUNTER — L-shaped box with glowing LED edges ========
  // Back bar body (horizontal)
  { kind: 'wall', id: 'cc-back', position: [-4.0, 0.5, 8.0], size: [4.5, 2, 1.0], color: '#1a2018', label: 'Cash wall' },
  // Front arm body (extends forward)
  { kind: 'wall', id: 'cc-arm', position: [-6.5, 0.5, 8.99], size: [1.0, 2, 3.0], color: '#1a2018' },

  // ---- Glowing LED strips on ALL counter edges ----
  // Back bar — top front edge
  { kind: 'wall', id: 'cc-glow-1', position: [-4.0, 1.05, 7.48], size: [4.6, 0.03, 0.03], color: '#E3AB32' },
  // Back bar — top back edge
  { kind: 'wall', id: 'cc-glow-2', position: [-4.0, 1.05, 8.52], size: [4.6, 0.03, 0.03], color: '#E3AB32' },
  // Back bar — bottom front edge
  { kind: 'wall', id: 'cc-glow-3', position: [-4.0, 0.0, 7.48], size: [4.6, 0.03, 0.03], color: '#E3AB32' },
  // Back bar — bottom back edge
  { kind: 'wall', id: 'cc-glow-4', position: [-4.0, 0.0, 8.52], size: [4.6, 0.03, 0.03], color: '#E3AB32' },
  // Back bar — vertical left edge
  { kind: 'wall', id: 'cc-glow-5', position: [-6.27, 0.5, 7.48], size: [0.03, 1.0, 0.03], color: '#E3AB32' },
  // Back bar — vertical right edge
  { kind: 'wall', id: 'cc-glow-6', position: [-1.73, 0.5, 7.48], size: [0.03, 1.0, 0.03], color: '#E3AB32' },

  // Front arm — top inner edge (room-facing)
  { kind: 'wall', id: 'cc-glow-7', position: [-5.98, 1.05, 8.99], size: [0.03, 0.03, 2.6], color: '#E3AB32' },
  // Front arm — top outer edge
  { kind: 'wall', id: 'cc-glow-8', position: [-7.02, 1.05, 8.99], size: [0.03, 0.03, 2.6], color: '#E3AB32' },
  // Front arm — bottom inner edge
  { kind: 'wall', id: 'cc-glow-9', position: [-5.98, 0.0, 8.99], size: [0.03, 0.03, 2.6], color: '#E3AB32' },
  // Front arm — bottom outer edge
  { kind: 'wall', id: 'cc-glow-10', position: [-7.02, 0.0, 8.99], size: [0.03, 0.03, 2.6], color: '#E3AB32' },
  // Front arm — top front tip edge
  { kind: 'wall', id: 'cc-glow-11', position: [-6.5, 1.05, 7.72], size: [1.1, 0.03, 0.03], color: '#E3AB32' },
  // Front arm — bottom front tip edge
  { kind: 'wall', id: 'cc-glow-12', position: [-6.5, 0.0, 7.72], size: [1.1, 0.03, 0.03], color: '#E3AB32' },

  // Back wall panel with wavy LED
  { kind: 'wall', id: 'cc-backwall', position: [-5.0, WALL_H / 2, 10.7], size: [4.8, WALL_H, 0.1], color: '#f0ece4' },
  { kind: 'wall', id: 'cc-wave-1', position: [-5.0, 1.8, 10.6], size: [4.3, 0.02, 0.02], color: '#E3AB32' },
  { kind: 'wall', id: 'cc-wave-2', position: [-6.8, 2.3, 10.6], size: [3.8, 0.02, 0.02], color: '#E3AB32' },
  // Walnut wood side panel
  { kind: 'wall', id: 'cc-wood-R', position: [0.0, WALL_H / 2, 9.5], size: [0.12, WALL_H, 0.8], color: walnut },

  // ======== STAIRS / HATCHED AREA (bottom-left, from sketch) ========
  // { kind: 'wall', id: 'stairs-wall', position: [-7.5, WALL_H / 2, 8.0], size: [3, WALL_H, 0.25], color: cream },

  // ======== ENTRY door (bottom-left) ========

  // ======== ENTRY CURTAINS (flanking the door — from photos) ========
  { kind: 'wall', id: 'entry-curtain-L', position: [-8.6, WALL_H / 2, 8.5], size: [0.08, WALL_H, 1.5], color: '#d8ccb8' },
  { kind: 'wall', id: 'entry-curtain-R', position: [-8.6, WALL_H / 2, 10.5], size: [0.08, WALL_H, 1.5], color: '#d8ccb8' }
];

// Availability comes from the bookings table via /api/availability.
// BookingClient overlays real reservations on top of this open state.
export const SOUL_TABLES: Table[] = TABLES.map((t) => ({
  ...t,
  availability: { ...DEFAULT_AVAILABILITY },
  tableColor: '#1a2018',
  chairColor: '#b5734a'
}));

export const SOUL_LAYOUT = {
  tables: SOUL_TABLES,
  props: SOUL_PROPS,
  groundColor: '#f5efe6',  // white/cream polished tile floor
  ambient: '#FCF1D6'
};
