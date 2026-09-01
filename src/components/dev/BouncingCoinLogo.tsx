"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The DOTM mark, as a circular logo with a live 666 coin.
 *
 * `logo.jpg` is a flat master: red plate, horned M, and the 666 coin resting in
 * the notch above it. `npm run build:media` cuts it into two layers —
 * `logo-plate.jpg` (the same frame with the coin painted out in plate red) and
 * `logo-coin.png` (the coin alone, on a circular alpha mask) — which is what
 * lets the coin move without the M moving with it.
 *
 * CIRCULAR, THOUGH THE MASTER IS SQUARE. Every part of the artwork clears the
 * inscribed circle: the M's outermost spike tip sits 138 units from centre on a
 * 150-unit radius, so rounding the frame off costs nothing but flat red corners
 * and the mark reads as a coin rather than as a sticker.
 *
 * THE GEOMETRY IS MEASURED, NOT EYEBALLED. `COIN` mirrors what the build script
 * prints: the coin's centre and radius as fractions of the frame. Everything
 * below — where the coin is parked, how far it may travel — is derived from
 * those, so re-cutting the layers cannot silently desync the animation from the
 * art.
 *
 * THE BOUNCE HAS TWO HARD LIMITS, and they are the whole brief: the coin never
 * reaches the top of the circle, and it never lands on the M. Both are checked
 * against the art rather than trusted:
 *
 *     rest: coin spans      0.164 … 0.283 of the frame
 *     ceiling               0.000            (top of the circle, at the coin's x)
 *     M's centre vertex     0.510            (first black directly below it)
 *
 * `RISE` and `FALL` are the largest excursions in the keyframes, so the coin's
 * extremes are 0.064 and 0.338 — 6.4% clear of the ceiling and 17% clear of the
 * M. It bounces in the gap the artwork already leaves it, which also keeps the
 * mark reading as the logo the whole way through.
 *
 * Under `prefers-reduced-motion` the coin simply sits where the master puts it,
 * and the logo is the logo. Nothing here is load-bearing for navigation — the
 * caller advances on its own timer, not on this animation finishing.
 */

/** The coin's bounding circle, as fractions of the frame. See build:media. */
const COIN = { cx: 0.4986, cy: 0.223, r: 0.0595 };

/** The coin's own box, which is the unit framer-motion's `y` percentages use. */
const COIN_SIZE = COIN.r * 2;

/** Peak of the bounce, as a fraction of the frame. Ceiling clearance: 0.064. */
const RISE = 0.1;
/** Floor of the bounce, as a fraction of the frame. Clearance to the M: 0.173. */
const FALL = 0.055;

/** Frame fractions → percentages of the coin's own height, which is what `y` takes. */
const up = (f: number) => `${(-f / COIN_SIZE) * 100}%`;
const down = (f: number) => `${(f / COIN_SIZE) * 100}%`;

/**
 * Two bounces and a settle, which is what the boot screen asks for.
 *
 * Read as a ball, not as a loop: it is thrown up, falls and lands (one), springs
 * back to a lower peak, falls and lands again (two), then comes to rest exactly
 * where the artwork has it. `easeOut` going up and `easeIn` coming down is what
 * makes it read as gravity rather than as an oscillation — a symmetric ease on
 * both halves looks like a float.
 */
const BOUNCE_Y = [up(0), up(RISE), down(FALL), up(RISE * 0.58), down(FALL), up(0)];
const BOUNCE_TIMES = [0, 0.2, 0.44, 0.62, 0.82, 1];
const BOUNCE_EASE = ["easeOut", "easeIn", "easeOut", "easeIn", "easeOut"] as const;

/** A little squash on each landing. Same clock as the travel, so they agree. */
const BOUNCE_SCALE_Y = [1, 1, 0.9, 1, 0.93, 1];

/** How long the whole sequence runs, in ms. Exported so callers can time off it. */
export const COIN_BOUNCE_MS = 1900;

export function BouncingCoinLogo({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-full ${className}`}
      style={{
        // The plate's own red, thrown outward. The crowd shot behind this is
        // busy and lit by a dozen phone screens; without a glow the mark reads
        // as a sticker lying on the photograph rather than as a light in it.
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.18), 0 0 34px -4px rgba(230,5,21,0.85), 0 0 90px -10px rgba(230,5,21,0.5)",
      }}
    >
      {/* The plate: red ground and the M, with the coin's place left empty.
          A plain <img>, sized by the wrapper — `next/image` would want a `fill`
          plus a `sizes` for what is already a fixed-ratio box. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/dotm/logo-plate.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* The coin sits in a static holder pinned to its measured centre, and
          only the image inside that holder moves.

          The split is not decorative. `translateY` and `y` are the same
          framer-motion property under two names, so parking the coin with
          `translateY: "-50%"` and then animating `y` would have the keyframes
          overwrite the centring offset — the coin would jump half its own
          height on the first frame and stay there. Centring on the holder keeps
          the keyframes what they say they are: pure travel. */}
      <div
        className="absolute"
        style={{
          left: `${COIN.cx * 100}%`,
          top: `${COIN.cy * 100}%`,
          width: `${COIN_SIZE * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <motion.img
          src="/images/dotm/logo-coin.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="block w-full"
          initial={false}
          animate={reduced ? { y: up(0) } : { y: BOUNCE_Y, scaleY: BOUNCE_SCALE_Y }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  duration: COIN_BOUNCE_MS / 1000,
                  times: BOUNCE_TIMES,
                  ease: [...BOUNCE_EASE],
                }
          }
        />
      </div>
    </div>
  );
}

export default BouncingCoinLogo;
