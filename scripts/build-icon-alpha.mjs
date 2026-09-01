#!/usr/bin/env node
/**
 * Turn the delivered icon clips into looping WebP with a real alpha channel.
 *
 *   npm run build:icons
 *
 * Both source clips are flat vector art rendered onto a solid white card. Used
 * as-is they bring that card with them: the Vault icon sat in a white square
 * on the DEV wallpaper, and the DOTM dock tile needed a white plate behind it
 * to hide the same thing.
 *
 * WHY ALPHA AND NOT A BLEND MODE. `mix-blend-mode: multiply` also hides white,
 * but by multiplying against the backdrop — so the art darkens with whatever is
 * behind it. The DEV wallpaper is a mid-blue, which drags the locker's navy
 * outlines down until the icon is gone. Keying the white into transparency once,
 * here, is independent of what it is later drawn on.
 *
 * THE TWO CLIPS ARE KEYED DIFFERENTLY, because they are different problems:
 *
 *   lockers  — keep the artwork's own colours, drop only the white card.
 *              `colorkey` at a tight tolerance, so the icon's pale blue fills
 *              survive and only the near-pure-white ground goes.
 *
 *   contact  — the dock wants one white mark, not a black handset beside a cyan
 *              envelope. Inverting turns the white ground black and the black
 *              handset white, and the inverted luminance is then used directly
 *              as the alpha channel while the colour is forced to flat white.
 *              Deriving alpha from luminance rather than keying a second colour
 *              is what keeps the antialiased edges clean.
 *
 * Output is animated WebP rather than WebM/VP9: it needs no <video> element, no
 * autoplay policy applies to it, and an `<img>` animates it everywhere. Note it
 * must be served through a plain `<img>` — `next/image` re-encodes and hands
 * back a still first frame.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const SOURCE_DIR = join(APP, "Image assets");

/** 160px covers a 46px desktop icon and a 64px magnified dock tile at 2x. */
const SIZE = 160;
/** The sources are 60fps; 25 is plenty for flat vector art and a third of the bytes. */
const FPS = 25;

const JOBS = [
  {
    source: "lockers.mp4",
    out: join(APP, "public", "images", "dev", "vault-icon.webp"),
    // Keep the artwork's colours; drop only the white card behind it.
    args: [
      "-vf",
      `colorkey=0xFFFFFF:0.10:0.02,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    // The folder buried in the constellation. Same problem as `lockers`, and the
    // same answer: flat vector art on a white card, so drop the card and keep
    // the artwork's own colours — the navy outline and the yellow fill both
    // have to survive being drawn on a near-black sky.
    source: "file.mp4",
    out: join(APP, "public", "images", "shared", "vault-folder.webp"),
    args: [
      "-vf",
      `colorkey=0xFFFFFF:0.10:0.02,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    // Live Stats, on the DOTM dock: a bar chart building itself. Same flat art
    // on the same near-white card as `lockers`, so the same treatment — its
    // orange, teal and navy all have to survive on frosted dark glass, which
    // rules out re-tinting it to one colour the way `contact` is.
    //
    // The card is #fdfdfd rather than pure white, which the 0.10 tolerance
    // covers comfortably without reaching the artwork's own pale fills.
    source: "business.mp4",
    out: join(APP, "public", "images", "dotm", "stats-icon.webp"),
    args: [
      "-vf",
      `colorkey=0xFDFDFD:0.10:0.02,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    // Live Stats, on the DEV taskbar: a rising arrow over three bars.
    //
    // FLATTENED TO BLACK, not merely keyed. The artwork is two inks — a black
    // arrow and teal bars — and `colorkey` on the white card kept both. On a
    // #c0c0c0 taskbar the teal all but vanished: pale strokes on mid grey, at
    // 24px, with the arrow beside them in solid black. Half the mark was
    // invisible, and the half that showed read as a different icon.
    //
    // ALPHA FROM DISTANCE TO WHITE, not from luminance. Inverted luminance —
    // the trick `contact` below uses — would have left the teal bars
    // semi-transparent rather than solid, because teal is a light ink: around
    // 200 of 255 in luma, so it would come through at about a fifth opacity
    // and stay just as faint. `255 - min(r,g,b)` asks how far a pixel sits
    // from white along its *weakest* channel instead — which teal fails badly
    // (its red channel is low) and the near-white card passes. The ×4 is the
    // knee: more than ~16 steps off white goes fully opaque, leaving the
    // falloff to the artwork's own antialiased edges.
    source: "outcome.mp4",
    out: join(APP, "public", "images", "dev", "stats-icon.webp"),
    args: [
      "-vf",
      "format=rgba," +
        "geq=r=0:g=0:b=0:a='clip((255-min(min(r(X,Y),g(X,Y)),b(X,Y)))*4,0,255)'," +
        `fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    source: "contact.mp4",
    out: join(APP, "public", "images", "dotm", "contact-icon.webp"),
    // Invert, then use the inverted luminance as alpha over flat white.
    args: [
      "-filter_complex",
      "[0:v]split[c][m];" +
        "[c]lutrgb=r=255:g=255:b=255[w];" +
        "[m]negate,format=gray,eq=contrast=1.25:brightness=0.04[a];" +
        `[w][a]alphamerge,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    // The key on the DOTM door, replacing the drawn obsidian seal.
    //
    // The delivered file is a 640x640 GIF, 123 frames at 20ms — a black mark
    // animating on a solid white card, sampled here as pure #000 on pure #fff.
    // The door is a black screen, so used as delivered it would be a white
    // square in the corner of it.
    //
    // EXACTLY THE `contact` TREATMENT, and for the same reason: invert, so the
    // card goes black and the mark goes white, then use that inverted
    // luminance as the alpha channel while forcing the colour to flat white.
    // What ships is a white mark on nothing. That is the requested reversal —
    // and because alpha is derived from luminance rather than keyed from a
    // second colour, the mark's antialiased edges stay clean instead of
    // fringing grey against the black behind them.
    //
    // WHY NOT `filter: invert(1)` IN CSS. It would also put a white mark on
    // screen, but on an opaque black square that only disappears against a
    // pure-black backdrop — and it would ship the full 739KB GIF to do it.
    // This is a few tens of KB, works on any ground, and loops natively via
    // the shared `-loop 0` below.
    source: "login.gif",
    out: join(APP, "public", "images", "dotm", "login-icon.webp"),
    args: [
      "-filter_complex",
      "[0:v]split[c][m];" +
        "[c]lutrgb=r=255:g=255:b=255[w];" +
        "[m]negate,format=gray,eq=contrast=1.25:brightness=0.04[a];" +
        `[w][a]alphamerge,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    // The Cluster Wall's two pane keys: an Instagram post mark that opens the
    // feed, and a clock that comes back to the wall.
    //
    // SAME PROBLEM AS `login.gif`, SAME ANSWER. Both arrive as 640px black
    // line art on a solid white card with no alpha channel at all — checked
    // before this was written: every corner of both files is opaque #FFFFFF.
    // Dropped onto the wall as delivered, each would be a white square sitting
    // on a black field, which is the exact opposite of "no bg, directly on the
    // wall".
    //
    // So the ground is inverted into the alpha channel and the mark forced to
    // flat white. What ships is a white glyph on nothing, which carries on the
    // wall's black and on the feed's near-black alike.
    //
    // IT IS ALSO 145 FRAMES AT 640px — a 2.4MB GIF for a 40px button. At
    // 160px and 25fps that is a few tens of KB, and animated WebP loops
    // natively in an `<img>` with no autoplay policy to satisfy.
    source: "instagram-post.gif",
    out: join(APP, "public", "images", "shared", "wall-feed-open.webp"),
    args: [
      "-filter_complex",
      "[0:v]split[c][m];" +
        "[c]lutrgb=r=255:g=255:b=255[w];" +
        "[m]negate,format=gray,eq=contrast=1.25:brightness=0.04[a];" +
        `[w][a]alphamerge,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    // DEV's Shows icon: the microphone with the LIVE bubble, animated.
    //
    // KEYED, NOT INVERTED — unlike the two wall marks around it. Those are
    // white glyphs bound for a black surface, so their ground becomes alpha
    // and the art is forced to flat white. This one keeps its own colours: it
    // is a black mic with a cyan LIVE tag, and it sits on the DEV wallpaper,
    // which is a bright blue sky measured at luma 124. Forcing it white would
    // erase it against the one thing it has to sit on.
    //
    // So only the white card goes, at a tight tolerance, and the mic's black
    // outline and the cyan fill both survive. What ships is the mark on
    // nothing — which is what lets the desktop icon drop its black plate.
    source: "press.gif",
    out: join(APP, "public", "images", "dev", "shows-icon.webp"),
    args: [
      "-vf",
      `colorkey=0xFFFFFF:0.10:0.02,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
  {
    source: "clock.gif",
    out: join(APP, "public", "images", "shared", "wall-feed-back.webp"),
    args: [
      "-filter_complex",
      "[0:v]split[c][m];" +
        "[c]lutrgb=r=255:g=255:b=255[w];" +
        "[m]negate,format=gray,eq=contrast=1.25:brightness=0.04[a];" +
        `[w][a]alphamerge,format=rgba,fps=${FPS},scale=${SIZE}:${SIZE}`,
    ],
  },
];

for (const job of JOBS) {
  mkdirSync(dirname(job.out), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      "-i",
      join(SOURCE_DIR, job.source),
      ...job.args,
      "-loop",
      "0",
      "-lossless",
      "0",
      "-quality",
      "80",
      "-compression_level",
      "4",
      "-c:v",
      "libwebp_anim",
      job.out,
    ],
    { stdio: "inherit" },
  );
  console.log(`${job.source}  ->  ${job.out.replace(APP, "").replace(/\\/g, "/")}`);
}
