// Regenerate favicons from the source logo so the crest fills each canvas
// edge-to-edge (no transparent or whitespace border). This is what fixes the
// "tiny logo with padding" look in Chrome's quick-access card and Google
// search favicons.
//
// Run with:  node scripts/regen-favicons.mjs
//
// Pipeline:
//   1. Load /public/brand/tressa-logo-mark.png
//   2. .trim() any transparent / near-uniform border pixels around the crest
//   3. Re-pad to a perfect square (transparent), then resize to each target
//   4. Write favicon.ico (32x32), icon-192.png, icon-512.png, apple-touch-icon.png

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'public', 'brand', 'tressa-logo-mark.png');
const PUBLIC = join(ROOT, 'public');

async function loadTrimmedSquare() {
  const trimmed = await sharp(SOURCE)
    // trim removes outer pixels that match the corner colour (or are
    // transparent). threshold=10 tolerates JPEG-ish near-edges.
    .trim({ threshold: 10 })
    .toBuffer({ resolveWithObject: true });

  const { data, info } = trimmed;
  const size = Math.max(info.width, info.height);
  const padX = Math.floor((size - info.width) / 2);
  const padY = Math.floor((size - info.height) / 2);

  // Re-pad to a perfect square so downstream resize doesn't distort.
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: data, left: padX, top: padY }])
    .png()
    .toBuffer();
}

async function emitPng(buf, size, outPath) {
  await sharp(buf).resize(size, size, { fit: 'contain' }).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`  · ${outPath.replace(ROOT, '')}  (${size}x${size})`);
}

async function emitIco(buf, outPath) {
  // Multi-size ICO: 16, 32, 48 (Windows / classic favicon).
  // sharp can't directly write ICO, but a PNG renamed to .ico works in all
  // modern browsers (Chrome / Firefox / Safari / Edge accept PNG-bytes
  // served as image/x-icon). For maximum compatibility we emit at 48x48.
  await sharp(buf).resize(48, 48).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`  · ${outPath.replace(ROOT, '')}  (48x48 PNG-in-ICO)`);
}

async function main() {
  console.log('Regenerating favicons from', SOURCE.replace(ROOT, ''));
  const square = await loadTrimmedSquare();

  await mkdir(PUBLIC, { recursive: true });

  await emitPng(square, 192, join(PUBLIC, 'icon-192.png'));
  await emitPng(square, 512, join(PUBLIC, 'icon-512.png'));
  await emitPng(square, 180, join(PUBLIC, 'apple-touch-icon.png'));
  await emitIco(square, join(PUBLIC, 'favicon.ico'));

  console.log('\nDone. Hard-refresh the browser (Ctrl+Shift+R) and clear the favicon cache to see updated icons.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
