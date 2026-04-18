import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();

  return [
    { url: base,                                lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/booking`,                   lastModified: now, changeFrequency: 'daily',  priority: 0.95 },
    { url: `${base}/booking?venue=restaurant`,  lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${base}/booking?venue=rooftop`,     lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${base}/booking?venue=bar`,         lastModified: now, changeFrequency: 'daily',  priority: 0.9 }
  ];
}
