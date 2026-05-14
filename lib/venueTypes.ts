// Shared types for the booking 3D scene and panel.
// Extracted from the retired `lib/mockApi.ts` — types only, no mock data.

export type VenueId = 'restaurant' | 'rooftop' | 'bar' | 'suites';

export type SlotId = 'evening' | 'late';

export type Slot = {
  id: SlotId;
  label: string;     // "12:00 PM – 3:00 PM"
  start: string;     // "12:00"
  end: string;       // "15:00"
};

export type Table = {
  id: string;
  label: string;
  seats: number;
  shape: 'round' | 'square' | 'rect';
  position: [number, number, number];
  rotation?: number;
  availability: Record<SlotId, boolean>;
  tableColor?: string;
  chairColor?: string;
  chairStyle?: 'sofa';
};

export type Suite = {
  id: string;
  label: string;
  name: string;
  tag: string;
  beds: number;
  sqft: number;
  priceNight: number;
  position: [number, number, number];
  availableDates: string[];
};

export type VenueProp =
  | { kind: 'wall'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string }
  | { kind: 'counter'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'projector'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'door'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'rock'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string }
  | { kind: 'glass'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'kitchen'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; label?: string }
  | { kind: 'pillar'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string }
  | { kind: 'sofa'; id: string; position: [number, number, number]; size: [number, number, number]; rotation?: number; color?: string; label?: string };

export type VenueData = {
  id: VenueId;
  name: string;
  description: string;
  tables?: Table[];
  suites?: Suite[];
  props?: VenueProp[];
  groundColor: string;
  ambient: string;
};
