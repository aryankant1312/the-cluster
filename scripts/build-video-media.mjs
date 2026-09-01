#!/usr/bin/env node
/**
 * Turn the two delivered clips into the assets the intro and the Drops window
 * actually play.
 *
 *   npm run build:video
 *
 * Both sources live in `Image assets/`, which is a drop folder and is not
 * served. Neither can be used as delivered, for opposite reasons: one carries
 * artwork belonging to somebody else, and the other hides its own artwork in a
 * channel most decoders throw away.
 *
 *
 * ── 1. THE DOTM INTRO ────────────────────────────────────────────────────
 *
 * `Scene.mp4` is a stock motion-graphics clip: blue concentric rings pulsing
 * on black, with "Available in Spatial Audio" across the middle, an Apple
 * Music lockup beneath it and a `jitter.video` watermark in the corner. The
 * rings are the only part wanted and all three marks have to go.
 *
 * WHY A CHROMA-DIFFERENCE KEY AND NOT `delogo`. Every mark is white — that is,
 * achromatic, its three channels equal. The rings are saturated blue. So
 * `blue − red` is large everywhere the rings are and zero everywhere the type
 * is, and one expression separates artwork from branding without a single
 * hand-placed rectangle. `delogo` would have needed three of them, and it
 * interpolates inward from a box's edges — which across type the size of that
 * headline smears rather than removes.
 *
 * The same expression recolours in the same pass: the difference *is* the ring
 * intensity, so writing it into red and a little into green and blue lands on
 * DOTM's #ff2244, rather than hue-rotating Apple's blue and hoping.
 *
 * `MARK` is the second half of the removal. H.264 leaves chroma noise around
 * hard white type, so a few pixels along each letter edge carry a small
 * blue-over-red difference and survive the key as faint ghosts. Those pixels
 * are found by their own achromatic-ness, dilated to cover the fringe, and
 * subtracted to black. Measured on a strip of pure rings the brightest
 * min-channel value is 60, so a floor of 95 catches the type and cannot reach
 * the artwork.
 *
 * WHY THE CLIP IS RE-CUT TO LOOP. The source is a one-shot reveal: it opens on
 * black and the rings bloom outward, so its last frame looks nothing like its
 * first (17 dB PSNR between them) and `<video loop>` would cut visibly on
 * every pass. The fix is the standard seamless re-cut — cross-dissolve the
 * tail into the head, then follow that with the middle — which yields a clip
 * whose end frame *is* its start frame. It is slowed first, because rings that
 * bloom in two seconds read as an alert, and this is a screen someone waits
 * in front of.
 *
 * THE HEADLINE IS BURNED IN, at the artist's request, in Anton — the typeface
 * the screen was designed in, vendored under the OFL at `assets/fonts/`.
 *
 *
 * ── 2. COMING SOON, FOR BOTH DROPS WINDOWS ───────────────────────────────
 *
 * `Coming Soon.webm` looks like a broken export: 150x112, every frame
 * near-black, peak luma 64 of 255. It is not broken. The stream is tagged
 * `alpha_mode=1` — VP8 with an alpha channel, the artwork living in that
 * channel, the colour planes black because the thing was always meant to be
 * composited. ffmpeg's default VP8 decoder drops the alpha side-data silently,
 * which is why this has to be decoded with `-vcodec libvpx` explicitly. Miss
 * that and you conclude the asset is unusable, which is exactly backwards.
 *
 * That alpha is a clean mask of the words "COMING SOON" typing themselves
 * inside a drawn box, so it can be painted in either persona's ink and scaled
 * up without dragging compression noise along — there is no colour in it to go
 * blocky. 4x through a smooth filter reads as soft type, not as stretched
 * video.
 *
 * Output is animated WebP, like the icon pipeline: no `<video>` element, no
 * autoplay policy, and an `<img>` loops it everywhere. It must be served
 * through a plain `<img>` — `next/image` re-encodes and hands back a still
 * first frame.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const SRC = join(APP, "Image assets");
const PUB = join(APP, "public");
const FONT = join(APP, "assets", "fonts", "Anton-Regular.ttf");

const rel = (p) => p.replace(APP, "").replace(/\\/g, "/");
const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;

function out(...parts) {
  const p = join(PUB, ...parts);
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

/**
 * A path as ffmpeg's *filter* parser wants it.
 *
 * Filter arguments are parsed by ffmpeg itself and not by a shell, and inside
 * one a colon separates options — so `C:/…` on Windows reads as an option
 * boundary and the filter graph fails to build. Backslashes become forward
 * slashes and the drive colon is escaped.
 */
const filterPath = (p) => p.replace(/\\/g, "/").replace(/:/g, "\\:");

function run(args) {
  execFileSync("ffmpeg", ["-y", "-v", "error", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

/* ───────────────────────────────────────────────────── 1. The DOTM intro */

/** Red ring intensity: how far blue runs ahead of red, past a noise floor. */
const RING = "clip((b(X,Y)-r(X,Y)-30)*3.6,0,255)";

/**
 * DOTM red, mixed from that intensity. 0.13 of it into green and 0.27 into
 * blue lands on #ff2244 at full strength — the accent the rest of this persona
 * is drawn in — rather than on a pure primary, which reads as a warning light.
 */
const RING_RGB = { r: RING, g: `${RING}*0.13`, b: `${RING}*0.27` };

/** Anything this achromatic and this bright is type, not artwork. */
const MARK = "if(gt(min(min(r(X,Y),g(X,Y)),b(X,Y)),95),255,0)";

const SOURCE_SECONDS = 64 / 30;
/** Rings that bloom in two seconds read as an alert. */
const SLOWDOWN = 2.2;
const SLOWED = SOURCE_SECONDS * SLOWDOWN;
/** Length of the cross-dissolve that closes the loop. */
const FADE = 0.9;

const HEADLINE = ["CURIOSITY BUILDS", "CLUSTER"];

/**
 * The type, on the 1280x720 canvas.
 *
 * Two `drawtext` filters rather than one holding a newline: a multi-line
 * `drawtext` centres the block and then left-aligns the lines within it, which
 * with a short second line leaves the whole thing hanging off to one side.
 *
 * White with a red edge and a dropped shadow — the treatment the previous
 * version of this screen wore in CSS. The red is #b4001a, a stop darker than
 * the rings, so the letterforms hold an edge against them.
 */
function headlineFilters() {
  const font = filterPath(FONT);
  return HEADLINE.map((line, i) =>
    [
      `drawtext=fontfile='${font}'`,
      `text='${line}'`,
      "fontsize=96",
      "fontcolor=0xF5F5F5",
      "borderw=2",
      "bordercolor=0xB4001A@0.95",
      "shadowcolor=0x000000@0.85",
      "shadowx=0",
      "shadowy=6",
      "x=(w-text_w)/2",
      // Either side of the vertical centre, inside the dark well the innermost
      // ring encloses.
      `y=${i === 0 ? 300 : 410}`,
    ].join(":"),
  );
}

function buildIntro() {
  const source = join(SRC, "Scene.mp4");
  const target = out("videos", "dotm", "intro-rings.mp4");

  const body = SLOWED - FADE;

  const graph = [
    // Key the rings red; find the branding; subtract it.
    `[0:v]format=gbrp,split[k][m]`,
    `[k]geq=r='${RING_RGB.r}':g='${RING_RGB.g}':b='${RING_RGB.b}'[keyed]`,
    `[m]geq=r='${MARK}':g='${MARK}':b='${MARK}',dilation,dilation,dilation,boxblur=3:1[mask]`,
    `[keyed][mask]blend=all_mode=subtract[clean]`,

    // Slow it, then re-time to a constant 30fps so the trims below land on
    // frame boundaries rather than between them.
    `[clean]setpts=${SLOWDOWN}*PTS,fps=30,split[s1][s2]`,

    // The seamless re-cut. `mid` picks up exactly where the dissolve leaves
    // off, and the clip ends on the frame the dissolve began from.
    `[s1]trim=${body}:${SLOWED},setpts=PTS-STARTPTS[tail]`,
    `[s2]split[h][d]`,
    `[h]trim=0:${FADE},setpts=PTS-STARTPTS[head]`,
    `[d]trim=${FADE}:${body},setpts=PTS-STARTPTS[mid]`,
    `[tail][head]xfade=transition=fade:duration=${FADE}:offset=0[join]`,
    `[join][mid]concat=n=2:v=1:a=0[loop]`,

    // 1152x720 is 1.6:1. Padding to 1280x720 makes it 16:9 exactly, and the
    // pad is invisible because the clip's ground is already black. It is also
    // why the headline can be laid out across the full width with no risk of a
    // `cover` crop taking the ends off it.
    `[loop]pad=1280:720:(ow-iw)/2:0:black[canvas]`,
    `[canvas]${headlineFilters().join(",")}[out]`,
  ].join(";");

  run([
    "-i", source,
    "-filter_complex", graph,
    "-map", "[out]",
    "-an",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "20",
    "-preset", "slow",
    // A keyframe a second, so a looping <video> does not drift on its seek
    // back to zero.
    "-g", "30",
    "-movflags", "+faststart",
    target,
  ]);

  console.log(`Scene.mp4  ->  ${rel(target)}  (${kb(target)})`);
}

/* ──────────────────────────────────────────── 2. Coming Soon, per persona */

/** 4x the source's 150x112. Smooth, because the mask has no noise to sharpen. */
const CS_SIZE = "600:448";

const COMING_SOON = [
  {
    // DOTM: the persona's own #f5f5f5 headline ink rather than pure white,
    // which glares against a black surface.
    out: ["images", "shared", "coming-soon-dotm.webp"],
    ink: "F5F5F5",
  },
  {
    // DEV: near-black, because this one is drawn on a Win98 dialog's light
    // grey. A white mark would vanish there — same reasoning as the taskbar's
    // stats icon.
    out: ["images", "shared", "coming-soon-dev.webp"],
    ink: "111111",
  },
];

function buildComingSoon() {
  const source = join(SRC, "Coming Soon.webm");

  for (const job of COMING_SOON) {
    const target = out(...job.out);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(job.ink.slice(i, i + 2), 16));

    run([
      // Without this the alpha side-data is dropped and every frame decodes
      // black. See the note at the top of this file.
      "-vcodec", "libvpx",
      "-i", source,
      "-filter_complex",
      [
        "[0:v]format=rgba",
        // Repaint the mark in the persona's ink and keep the delivered alpha
        // untouched — the alpha *is* the artwork.
        `geq=r=${r}:g=${g}:b=${b}:a='alpha(X,Y)'`,
        `scale=${CS_SIZE}:flags=lanczos`,
        "fps=25",
      ].join(","),
      "-loop", "0",
      "-c:v", "libwebp_anim",
      "-lossless", "0",
      "-quality", "82",
      target,
    ]);

    console.log(`Coming Soon.webm  ->  ${rel(target)}  (${kb(target)})`);
  }
}

/* ──────────────────────────────────────────────────────────────── Driver */

if (!existsSync(FONT)) {
  throw new Error(
    `Anton is missing at ${rel(FONT)}. It is vendored under the OFL — the ` +
      `licence sits beside it. Re-fetch from github.com/google/fonts/ofl/anton.`,
  );
}

buildIntro();
buildComingSoon();
