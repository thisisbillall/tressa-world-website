// Client-side venue loader. Composes static 3D layouts with live DB data.
// No mocks — layouts are scene geometry, suites pricing comes from /api/suites.

'use client';
import { SKY_LAYOUT } from '@/lib/layouts/sky';
import { UNWIND_LAYOUT } from '@/lib/layouts/unwind';
import { SOUL_LAYOUT } from '@/lib/layouts/soul';
import { AURA_LAYOUT } from '@/lib/layouts/aura';
import type { Suite, VenueData, VenueId } from '@/lib/venueTypes';

function nextDates(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function loadDbSuites(): Promise<any[]> {
  try {
    const res = await fetch('/api/suites', { cache: 'no-store' });
    const text = await res.text();
    if (!text) return [];
    const json = JSON.parse(text);
    return json?.success && Array.isArray(json.data) ? json.data : [];
  } catch (e: any) {
    console.warn('[loadDbSuites]', e?.message || e);
    return [];
  }
}

export async function fetchVenue(id: VenueId): Promise<VenueData> {
  switch (id) {
    case 'restaurant':
      return {
        id,
        name: 'Soul · Family Restaurant',
        description: 'Fine-dining family restaurant with dark marble tables, art walls, and warm walnut wood accents.',
        groundColor: SOUL_LAYOUT.groundColor,
        ambient: SOUL_LAYOUT.ambient,
        tables: SOUL_LAYOUT.tables,
        props: SOUL_LAYOUT.props,
      };
    case 'rooftop':
      return {
        id,
        name: 'The Sky · Rooftop',
        description: 'Open-air rooftop lounge — laid out from the hand-drawn TRESSA Sky floor plan.',
        groundColor: SKY_LAYOUT.groundColor,
        ambient: SKY_LAYOUT.ambient,
        tables: SKY_LAYOUT.tables,
        props: SKY_LAYOUT.props,
      };
    case 'bar':
      return {
        id,
        name: 'Unwind · Bar',
        description: 'Low-lit bar with U-shaped counter, dark marble tables, and cognac leather seating.',
        groundColor: UNWIND_LAYOUT.groundColor,
        ambient: UNWIND_LAYOUT.ambient,
        tables: UNWIND_LAYOUT.tables,
        props: UNWIND_LAYOUT.props,
      };
    case 'suites': {
      const dbSuites = await loadDbSuites();
      const bySlug = new Map<string, any>(dbSuites.map((s) => [s.slug, s]));
      const dates = nextDates(14);

      // Skip any unit whose suite type is missing/inactive in DB.
      const suites: Suite[] = AURA_LAYOUT.units
        .map((unit) => {
          const db = bySlug.get(unit.slug);
          if (!db) return null;
          return {
            id: unit.id,
            label: unit.label,
            name: db.name,
            tag: db.tag || 'Classic',
            beds: unit.beds,
            sqft: unit.sqft,
            priceNight: Number(db.price_per_night) || 0,
            position: unit.position,
            availableDates: dates,
          } as Suite;
        })
        .filter((s): s is Suite => s !== null);

      return {
        id,
        name: 'Luxury Suites',
        description: 'Curated stays — select a suite and your dates.',
        groundColor: AURA_LAYOUT.groundColor,
        ambient: AURA_LAYOUT.ambient,
        suites,
      };
    }
  }
}
