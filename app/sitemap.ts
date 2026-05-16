import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();

  // The /booking?venue=... variants used to live here, but the booking page
  // sets `alternates.canonical = /booking` for all of them — listing the
  // query variants only created duplicate URLs that get canonicalized away
  // by Google. Keep the sitemap to actual canonical routes.
  return [
    { url: base,             lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/booking`, lastModified: now, changeFrequency: 'daily',  priority: 0.95 },
    { url: `${base}/terms`,   lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
