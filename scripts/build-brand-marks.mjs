#!/usr/bin/env node
/**
 * Rebuild the two brand marks that could not be fixed in CSS.
 *
 *   npm run build:marks
 *
 * Both outputs are white artwork on real transparency, so the belt tile's own
 * colour is the only background there is. See the LOGO ARTWORK note at the top
 * of `src/content/brand-cases.ts` for why every mark is keyed rather than
 * blended.
 *
 * NOTHING / CMF — the shipped mark was mis-cropped, not mis-centred.
 *
 *   The delivered artwork is a 1333x750 orange card holding three separate
 *   pieces: a dot glyph in the top-right corner, the `cmf` wordmark, and
 *   `by NOTHING` set under it and right-aligned to it. The old mark cropped
 *   that card so the `c` was cut off at x=0 and `by NOTHING` was sliced through
 *   horizontally at the bottom edge, which is why the lockup sat low and left
 *   in its tile no matter what the CSS did. Centring a clipped crop only
 *   centres the clipping.
 *
 *   So the mark is rebuilt from the card: key the orange out, take the real
 *   lockup bounding box (wordmark plus the line under it, corner dots left
 *   behind as poster furniture rather than part of the logo), and pad it evenly
 *   so the artwork's own centre is the file's centre. `object-contain` then has
 *   something honest to centre.
 *
 *   `by NOTHING` is dot-matrix type at a fraction of the wordmark's weight, and
 *   it disappeared on the belt. It is dilated on the alpha channel — the strokes
 *   grow outward and the dots close up into letters — which is the raster
 *   equivalent of a heavier weight. Dilating alpha rather than redrawing keeps
 *   the antialiasing the key produced.
 *
 * SPOTIFY — replaced with the full wordmark, delivered as black on a near-white
 * plate. On a black tile that reads as nothing at all, so the plate is keyed to
 * transparency and the artwork is inverted to white. The tile stays black and
 * the mark sits in it rather than on a card.
 */

import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const BRANDS = join(APP, "public", "images", "brands");
const SOURCE_DIR = join(APP, "Image assets");

/** Alpha below this is treated as empty when measuring a bounding box. */
const INK = 40;

/** Read an image as flat RGBA plus its dimensions. */
async function readRGBA(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Turn a keyed alpha map into flat-white RGBA.
 *
 * The colour channels are discarded rather than carried over: both sources are
 * single-colour artwork, and forcing white means the edge pixels the ramp made
 * semi-transparent are white-at-low-alpha instead of white blended toward the
 * plate they were keyed off, which is what leaves a coloured fringe.
 */
function whiteOn(alpha, width, height) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = alpha[i];
  }
  return sharp(out, { raw: { width, height, channels: 4 } });
}

/** Bounding box of everything at or above `INK`, or null for an empty band. */
function bbox(alpha, width, height, y0 = 0, y1 = height - 1) {
  let x0 = Infinity;
  let x1 = -1;
  let top = Infinity;
  let bottom = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] < INK) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return x1 < 0 ? null : { x0, x1, y0: top, y1: bottom };
}

/** Contiguous runs of rows that hold ink, top to bottom. */
function rowBands(alpha, width, height) {
  const bands = [];
  let cur = null;
  for (let y = 0; y < height; y++) {
    let inked = false;
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] >= INK) {
        inked = true;
        break;
      }
    }
    if (inked) {
      if (!cur) cur = { y0: y, y1: y };
      else cur.y1 = y;
    } else if (cur) {
      bands.push(cur);
      cur = null;
    }
  }
  if (cur) bands.push(cur);
  return bands;
}

/**
 * Grow opaque regions by one pixel.
 *
 * A 3x3 box summed and divided by 3 saturates any pixel with three or more
 * inked neighbours, so strokes thicken outward and the gaps between dot-matrix
 * dots close. Applied to alpha alone, so colour is untouched.
 */
function dilate(image) {
  return image.convolve({
    width: 3,
    height: 3,
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    scale: 3,
    offset: 0,
  });
}

/** Linear ramp to 0-255, clamped — a soft key, so edges stay antialiased. */
const ramp = (v, lo, hi) =>
  v <= lo ? 0 : v >= hi ? 255 : Math.round(((v - lo) / (hi - lo)) * 255);

async function buildNothingCmf() {
  const src = join(BRANDS, "brand-nothing-cmf.png");
  const { data, width, height } = await readRGBA(src);

  /**
   * The card is orange (251, 91, 49) and the artwork is white, so the smaller
   * of green and blue separates them cleanly on its own: 49 on the card,
   * ~251 in the artwork. Keying on that rather than on luminance is what the
   * brand-cases note means by "keyed by distance from its orange" — the orange
   * is bright enough that a luminance key would eat the artwork's edges.
   */
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    alpha[i] = ramp(Math.min(g, b), 70, 235);
  }

  const bands = rowBands(alpha, width, height);
  if (bands.length < 2) throw new Error("CMF: expected a wordmark and a line under it");

  // The wordmark is the tallest band. Anything above it is corner furniture;
  // anything below it is the `by NOTHING` line that belongs to the lockup.
  let markIdx = 0;
  for (let i = 1; i < bands.length; i++) {
    const h = (b) => b.y1 - b.y0;
    if (h(bands[i]) > h(bands[markIdx])) markIdx = i;
  }
  const lockup = bands.slice(markIdx);
  const box = bbox(alpha, width, height, lockup[0].y0, lockup[lockup.length - 1].y1);
  if (!box) throw new Error("CMF: lockup measured empty");

  const wordmark = bands[markIdx];
  const subY0 = wordmark.y1 + 1;
  const subY1 = box.y1;
  const hasSubline = subY1 >= subY0;

  const full = whiteOn(alpha, width, height);
  const cropW = box.x1 - box.x0 + 1;
  const cropH = box.y1 - box.y0 + 1;

  let lockupImage = full.extract({
    left: box.x0,
    top: box.y0,
    width: cropW,
    height: cropH,
  });

  if (hasSubline) {
    // Dilate only the subline, twice, then drop it back where it came from.
    // Two passes at this scale is roughly a 4px stroke gain on a 364px-wide
    // line — legible on the belt without turning dot-matrix into a slab.
    const subTop = subY0 - box.y0;
    const subH = subY1 - subY0 + 1;
    const base = await lockupImage.png().toBuffer();
    const bolder = await dilate(
      dilate(sharp(base).extract({ left: 0, top: subTop, width: cropW, height: subH })),
    )
      .png()
      .toBuffer();
    lockupImage = sharp(base).composite([{ input: bolder, left: 0, top: subTop }]);
  }

  /**
   * Even padding, so the file's centre is the artwork's centre.
   *
   * `fit` sizes the mark as a square percentage of the tile and `object-contain`
   * centres whatever it is given, so a file whose ink is off-centre lands
   * off-centre however the CSS is written. Padding to a square also stops the
   * wide lockup from being scaled by its width alone and floating high.
   */
  const side = Math.max(cropW, cropH);
  const pad = Math.round(side * 0.06);
  const canvas = side + pad * 2;
  const body = await lockupImage.png().toBuffer();

  await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      {
        input: body,
        left: Math.round((canvas - cropW) / 2),
        top: Math.round((canvas - cropH) / 2),
      },
    ])
    .png()
    .toFile(join(BRANDS, "brand-nothing-cmf-mark.png"));

  console.log(
    `brand-nothing-cmf.png  ->  brand-nothing-cmf-mark.png  (${canvas}x${canvas}, lockup ${cropW}x${cropH}${hasSubline ? ", subline dilated" : ""})`,
  );
}

async function buildSpotify() {
  const src = join(SOURCE_DIR, "Screenshot 2026-08-25 144955.png");
  const { data, width, height } = await readRGBA(src);

  /**
   * Black artwork on a near-white plate, so alpha is simply how dark a pixel
   * is. The ramp starts well below the plate's own value, which keeps the JPEG-
   * ish mottling in the delivered screenshot from lifting into a grey haze
   * across the whole tile.
   */
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    alpha[i] = 255 - ramp(luma, 60, 225);
  }

  const box = bbox(alpha, width, height);
  if (!box) throw new Error("Spotify: source measured empty");

  const cropW = box.x1 - box.x0 + 1;
  const cropH = box.y1 - box.y0 + 1;
  const out = join(BRANDS, "brand-spotify-mark.png");

  await whiteOn(alpha, width, height)
    .extract({ left: box.x0, top: box.y0, width: cropW, height: cropH })
    .png()
    .toFile(out);

  console.log(
    `Screenshot 2026-08-25 144955.png  ->  brand-spotify-mark.png  (${cropW}x${cropH}, ${(cropW / cropH).toFixed(2)}:1)`,
  );
}

mkdirSync(BRANDS, { recursive: true });
await buildNothingCmf();
await buildSpotify();
