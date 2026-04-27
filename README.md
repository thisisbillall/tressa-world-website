# TRESSA World — Next.js

Rooftop · Restaurant · Bar · Suites. Cinematic, scroll-driven hospitality site.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Framer Motion (scroll-linked animations)
- GSAP (available for advanced timelines)
- Lenis (buttery smooth scroll)

## Run
```bash
npm install
npm run dev
```
Open http://localhost:3001

## SEO
- Rich metadata + OpenGraph / Twitter cards in `app/layout.tsx`
- JSON-LD `Restaurant` + `Hotel` schema injected
- `app/sitemap.ts` + `app/robots.ts`
- Semantic HTML (`section`, `article`, `nav`, `footer`) and heading hierarchy

Replace `SITE_URL` in `app/layout.tsx` and `app/sitemap.ts` with your production domain. Drop an `og.jpg` (1200×630) into `/public`.

## Structure
- `app/` — routes, metadata, global styles
- `components/` — Hero, About, Spaces, VideoSection, ParallaxQuote, Menu, Suites, Booking, Marquee, Navbar, Footer
- `public/videos/frame-20.mp4` — hero/experience video
