// Twitter / X share image. Identical canvas to the OG image — Next.js binds
// the named exports + default automatically to <meta name="twitter:image">.
//
// IMPORTANT: Next.js statically reads the `runtime`, `alt`, `size`, and
// `contentType` config values from metadata files and ONLY accepts string
// (or object) literals declared directly in the same file. Re-exporting
// them from ./opengraph-image makes Next fall back to the Node runtime and
// attempt to prerender the image at build time — which fails on Vercel
// because next/og expects the edge runtime. Hence the explicit duplication.

import OG from './opengraph-image';

export const runtime = 'edge';
export const alt = 'TRESSA World — Rooftop · Restaurant · Bar · Suites';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default OG;
