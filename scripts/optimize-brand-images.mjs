#!/usr/bin/env node
/**
 * Optimize brand image folders → web-ready WebP with SEO slugs + blur placeholders.
 *
 * Input:
 *   public/Sky/*.JPG        →   public/images/venues/sky/tressa-sky-XX.webp
 *   public/Soul/*.JPG       →   public/images/venues/soul/tressa-soul-XX.webp
 *   public/Unwind/*.JPG     →   public/images/venues/unwind/tressa-unwind-XX.webp
 *
 * Output:
 *   Resized (max 2000px) WebP at quality 85, stripped of EXIF, sorted by filename.
 *   Also writes public/images/venues/manifest.json (paths + blurDataURL + alt).
 *
 * Run:
 *   npm install --save-dev sharp
 *   npm run optimize:images
 */

import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(process.cwd());
const PUBLIC_DIR = join(ROOT, 'public');
const OUT_DIR = join(PUBLIC_DIR, 'images', 'venues');

const MAX_WIDTH = 2000;
const QUALITY = 85;

/** Each venue: source folder name + output slug prefix + default alt template. */
const VENUES = [
  {
    src: 'Sky',
    slug: 'sky',
    prefix: 'tressa-sky',
    altBase: 'TRESSA Sky — rooftop lounge in Pune'
  },
  {
    src: 'Soul',
    slug: 'soul',
    prefix: 'tressa-soul',
    altBase: 'TRESSA Soul — family restaurant in Pune'
  },
  {
    src: 'Unwind',
    slug: 'unwind',
    prefix: 'tressa-unwind',
    altBase: 'TRESSA Unwind — signature bar in Pune'
  }
];

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function listImages(dir) {
  try {
    const entries = await readdir(dir);
    return entries
      .filter((n) => IMG_EXT.has(extname(n).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

async function buildBlurDataURL(pipeline) {
  // Tiny 20x??px blurred base64 WebP — small enough to inline.
  const buf = await pipeline
    .clone()
    .resize({ width: 20 })
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

async function processVenue(venue) {
  const srcDir = join(PUBLIC_DIR, venue.src);
  const outDir = join(OUT_DIR, venue.slug);
  await ensureDir(outDir);

  const files = await listImages(srcDir);
  if (!files.length) {
    console.warn(`[skip] no images found in ${srcDir}`);
    return [];
  }

  console.log(`[${venue.slug}] ${files.length} images → ${outDir}`);

  const manifest = [];
  let idx = 1;
  for (const file of files) {
    const srcPath = join(srcDir, file);
    const n = String(idx).padStart(2, '0');
    const outName = `${venue.prefix}-${n}.webp`;
    const outPath = join(outDir, outName);

    try {
      const pipeline = sharp(srcPath, { failOn: 'none' })
        .rotate() // respect EXIF orientation
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 });

      await pipeline.clone().toFile(outPath);

      const metaPipeline = sharp(srcPath, { failOn: 'none' }).rotate();
      const blurDataURL = await buildBlurDataURL(metaPipeline);
      const { width, height } = await metaPipeline.metadata();

      const outStat = await stat(outPath);
      const kb = Math.round(outStat.size / 1024);

      manifest.push({
        src: `/images/venues/${venue.slug}/${outName}`,
        alt: `${venue.altBase} — scene ${idx}`,
        width: width ?? null,
        height: height ?? null,
        blurDataURL
      });

      console.log(`  ${file} → ${outName} (${kb} KB)`);
      idx += 1;
    } catch (err) {
      console.error(`  ! failed ${file}:`, err.message);
    }
  }
  return manifest;
}

async function main() {
  await ensureDir(OUT_DIR);
  const full = {};
  for (const v of VENUES) {
    full[v.slug] = await processVenue(v);
  }
  const manifestPath = join(OUT_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(full, null, 2));
  console.log(`\nmanifest → ${manifestPath}`);
  console.log('\nDone. Import via `import manifest from "@/public/images/venues/manifest.json"`');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
