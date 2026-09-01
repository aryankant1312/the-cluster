#!/usr/bin/env node
/**
 * Turn the delivered stills, RAW files and the choose-face clip into the
 * web-ready assets the pages actually reference.
 *
 *   npm run build:media
 *
 * Everything here reads from `Image assets/`, which is the drop folder the
 * artist delivers into and is deliberately NOT served — the files in it are
 * camera-native (a 15 MB Pixel .dng, 2048px stills, a 4000px logo master) and
 * none of them can be handed to a browser as-is.
 *
 * FOUR JOBS, four different problems:
 *
 *   choose-face clip — copied byte for byte rather than re-encoded. It is the
 *     full-quality master on purpose; the poster frame below is what covers
 *     the gap before it starts.
 *
 *   .dng            — a Pixel RAW. `ffmpeg` can demosaic it, but it decodes
 *     linear (so the frame comes out several stops dark) and leaves a blue
 *     block artefact in the lower left. The DNG carries a fully tone-mapped
 *     JPEG preview in IFD0, which is the camera's own HDR+ render, so that is
 *     what gets pulled out instead.
 *
 *   stills          — resized and re-encoded, since a 2048px 1.1 MB JPEG behind
 *     half a window is bytes nobody sees.
 *
 *   logo            — split into two layers so the 666 coin can be animated
 *     independently of the M it bounces above. See `BALL` below.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const SRC = join(APP, "Image assets");
const PUB = join(APP, "public");

const rel = (p) => p.replace(APP, "").replace(/\\/g, "/");
const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;

function out(...parts) {
  const p = join(PUB, ...parts);
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

/* ── 1. The choose-face loop ───────────────────────────────────────────────
   The same sofa shot the silhouette masks were traced from, alive: the candle
   moves and the two of them breathe. Copied rather than transcoded — the
   master is what ships.

   The poster is frame 0 pulled out as a JPEG. Without one the screen is black
   until the first frame decodes, and on a refused autoplay it would stay that
   way; with one, a blocked video looks exactly like a paused one. */
{
  const clip = out("videos", "choose-face.mp4");
  copyFileSync(join(SRC, "Wallpapers", "background.mp4"), clip);
  console.log(`background.mp4        -> ${rel(clip)}  (${kb(clip)}, copied verbatim)`);

  const poster = out("images", "choose-face-poster.jpg");
  execFileSync(
    "ffmpeg",
    ["-y", "-v", "error", "-i", clip, "-frames:v", "1", "-q:v", "3", poster],
    { stdio: "inherit" },
  );
  console.log(`  frame 0             -> ${rel(poster)}  (${kb(poster)})`);
}

/* ── 2. Portfolio backdrop, out of the RAW ─────────────────────────────────
   IFD0 of a Pixel .dng is the camera's processed preview at 1280×964. `sharp`
   reads it as an ordinary TIFF and hands back that layer. */
{
  const dst = out("images", "dotm", "portfolio-bg.jpg");
  await sharp(join(SRC, "PXL_20250621_202040698.RAW-02.ORIGINAL.dng"))
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(dst);
  const { width, height } = await sharp(dst).metadata();
  console.log(`PXL_…ORIGINAL.dng     -> ${rel(dst)}  (${width}×${height}, ${kb(dst)})`);
}

/* ── 3. The two contact-card photographs ───────────────────────────────────
   B1 goes behind DOTM's card (the rotary phone), A2 behind DEV's (the easel).
   Both are square masters cropped by `object-cover` in the layout, so they are
   resized on the long edge only and left uncropped here. */
for (const [source, dest, width] of [
  [join(SRC, "Wallpapers", "B1.jpg"), out("images", "dotm", "contact-photo.jpg"), 1400],
  [join(SRC, "Wallpapers", "A2.jpg"), out("images", "dev", "contact-photo.jpg"), 1400],
]) {
  await sharp(source)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(dest);
  console.log(`${source.split(/[\\/]/).pop().padEnd(21)} -> ${rel(dest)}  (${kb(dest)})`);
}

/* ── 4. The logo, in two layers ────────────────────────────────────────────
   `logo.jpg` is a 4000px master: a flat red plate, the horned M, and the 666
   coin resting in the notch above it. The DEV boot screen needs the coin to
   move on its own, which a single flattened JPEG cannot do.

   So it is cut in two. The coin is extracted with a circular alpha mask — a
   rectangular crop would bring a square of red plate with it and read as a
   sticker over the logo. What it leaves behind is patched with the plate's own
   red, sampled off the master rather than guessed, so the seam is invisible.

   Geometry is measured, not eyeballed: `BALL` is the coin's bounding circle in
   the master's pixels. The React side consumes it as fractions of the frame,
   which is why they are echoed in the log — the bounce's floor and ceiling are
   derived from them. */
{
  const LOGO = join(PUB, "images", "dotm", "logo.jpg");
  const SIZE = 4000;
  /** The coin's bounding circle in master pixels. */
  const BALL = { cx: 1994.5, cy: 892, r: 238 };
  /** Enough margin that the mask's own antialiasing is not clipped. */
  const PAD = 12;
  /** The plate's flat red, sampled from a corner of the master. */
  const PLATE = "#e60515";
  /** Output edge for both layers. 1024 covers a 170px mark on a 3x display. */
  const EDGE = 1024;

  const box = Math.ceil((BALL.r + PAD) * 2);
  const left = Math.round(BALL.cx - box / 2);
  const top = Math.round(BALL.cy - box / 2);

  /**
   * A filled disc as raw RGBA bytes, antialiased over one pixel.
   *
   * Drawn arithmetically rather than handed to sharp as an `<svg>` string:
   * librsvg rasterises at the pipeline's DPI, so a `<svg width="484">` does not
   * reliably come back 484px wide, and a composite whose input is silently the
   * wrong size lands in the wrong place instead of failing. Bytes have no DPI.
   */
  function disc(size, radius, rgb) {
    const buf = Buffer.alloc(size * size * 4);
    const c = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
        const a = Math.round(255 * Math.min(1, Math.max(0, radius + 0.5 - d)));
        const i = (y * size + x) * 4;
        buf[i] = rgb[0];
        buf[i + 1] = rgb[1];
        buf[i + 2] = rgb[2];
        buf[i + 3] = a;
      }
    }
    return { input: buf, raw: { width: size, height: size, channels: 4 } };
  }

  // Two passes each, rather than one chained pipeline: sharp fixes its own
  // operation order internally, and a `composite` that lands either side of a
  // `resize` is the difference between masking the coin and masking a quarter
  // of the frame. Compositing at native size and resizing afterwards leaves
  // nothing to reason about.
  const coin = out("images", "dotm", "logo-coin.png");
  const coinFull = await sharp(LOGO)
    .extract({ left, top, width: box, height: box })
    .composite([{ ...disc(box, BALL.r - 2, [255, 255, 255]), blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(coinFull).resize(EDGE, EDGE).png().toFile(coin);
  console.log(`logo.jpg (coin)       -> ${rel(coin)}  (${kb(coin)})`);

  // The plate: the same master with the coin painted out in plate red, a hair
  // wider than the coin so no keyed edge survives.
  const plate = out("images", "dotm", "logo-plate.jpg");
  const patchR = BALL.r + 5;
  const patchBox = Math.ceil(patchR * 2) + 2;
  const rgb = [
    parseInt(PLATE.slice(1, 3), 16),
    parseInt(PLATE.slice(3, 5), 16),
    parseInt(PLATE.slice(5, 7), 16),
  ];
  const plateFull = await sharp(LOGO)
    .composite([
      {
        ...disc(patchBox, patchR, rgb),
        top: Math.round(BALL.cy - patchBox / 2),
        left: Math.round(BALL.cx - patchBox / 2),
      },
    ])
    .png()
    .toBuffer();
  await sharp(plateFull)
    .resize(EDGE, EDGE)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(plate);
  console.log(`logo.jpg (plate)      -> ${rel(plate)}  (${kb(plate)})`);

  console.log(
    `  coin geometry, as fractions of the frame: ` +
      `cx ${(BALL.cx / SIZE).toFixed(4)}  cy ${(BALL.cy / SIZE).toFixed(4)}  r ${(BALL.r / SIZE).toFixed(4)}`,
  );
}
