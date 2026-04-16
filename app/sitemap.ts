import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();

  return [
    { url: base,                            lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/booking`,               lastModified: now, changeFrequency: 'daily',   priority: 0.95 },
    { url: `${base}/booking?venue=restaurant`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${base}/booking?venue=rooftop`, lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${base}/booking?venue=bar`,     lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    // Aura (suites) under development — omit from sitemap until launch.
    { url: `${base}/#about`,                lastModified: now, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${base}/#spaces`,               lastModified: now, changeFrequency: 'monthly', priority: 0.8  },
    { url: `${base}/#experience`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7  },
    { url: `${base}/#menu`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/#contact`,              lastModified: now, changeFrequency: 'yearly',  priority: 0.5  }
  ];
}
