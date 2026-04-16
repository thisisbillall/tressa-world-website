// Typed wrapper around the generated manifest at public/images/venues/manifest.json.
// Regenerate with:  npm run optimize:images

import raw from '@/public/images/venues/manifest.json';

export type VenueSlug = 'sky' | 'soul' | 'unwind';

export type BrandImage = {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  blurDataURL: string;
};

const manifest = raw as Record<VenueSlug, BrandImage[]>;

export function getVenueImages(slug: VenueSlug): BrandImage[] {
  return manifest[slug] ?? [];
}

export function getVenueImage(slug: VenueSlug, index: number): BrandImage | null {
  return manifest[slug]?.[index] ?? null;
}

/** Convenience: first image per venue — used in hero positions. */
export const sky = manifest.sky;
export const soul = manifest.soul;
export const unwind = manifest.unwind;
