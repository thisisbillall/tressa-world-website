// Static 3D floor plan for the Aura suites venue.
// Unit geometry (position, beds, sqft) lives here; pricing, name and tag
// come from the `suites` table in the DB via /api/suites.

export type AuraUnit = {
  id: string;        // scene-unique physical unit id
  label: string;     // short display label ("RS-01")
  slug: string;      // links to suites.slug in DB
  beds: number;
  sqft: number;
  position: [number, number, number];
};

export const AURA_UNITS: AuraUnit[] = [
  { id: 'AU-RS-01', label: 'RS-01', slug: 'royal',    beds: 1, sqft: 1200, position: [-8, 0,  0] },
  { id: 'AU-RS-02', label: 'RS-02', slug: 'royal',    beds: 1, sqft: 1200, position: [ 8, 0,  0] },
  { id: 'AU-GS-01', label: 'GS-01', slug: 'garden',   beds: 1, sqft:  850, position: [-8, 0,  7] },
  { id: 'AU-GS-02', label: 'GS-02', slug: 'garden',   beds: 2, sqft:  900, position: [ 8, 0,  7] },
  { id: 'AU-HS-01', label: 'HS-01', slug: 'heritage', beds: 1, sqft:  700, position: [-8, 0, -7] },
  { id: 'AU-HS-02', label: 'HS-02', slug: 'heritage', beds: 2, sqft:  720, position: [ 8, 0, -7] },
];

export const AURA_LAYOUT = {
  units: AURA_UNITS,
  groundColor: '#f3e8d0',
  ambient: '#fbf3dc',
};
