"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * The DOTM desktop wallpaper: one `object-cover` layer drifting with the
 * cursor, filling the screen edge to edge at all times.
 *
 * The coverage is guaranteed by geometry, not by a lucky zoom value. The
 * image sits in a box inset by a negative OVERHANG on every side, so it
 * always extends past the viewport by that many pixels. Any translation
 * smaller than OVERHANG therefore cannot expose an edge — the wallpaper reads
 * as endless however far the cursor pushes it.
 *
 * This replaces a `scale()`-based approach that could and did fail: at a
 * 663px-tall desktop, `scale(1.18)` left only 59.7px of headroom per side,
 * which the 70px upward shift overran and opened a 10px black band along the
 * bottom. OVERHANG is derived from the shift and the parallax range instead
 * of guessed, so the margin holds at every viewport size.
 */

const PARALLAX_RANGE = 60;
/**
 * Negative lifts the artwork up the screen. Tune here.
 *
 * ZERO, AND THAT IS A CONSEQUENCE OF THE FILE CHANGING. This was -70 while
 * the wallpaper was a 3000×3000 square whose subject sat low in the frame and
 * needed lifting into the middle of a landscape screen. `wallpaper-0001.jpg`
 * is a 3840×2160 composition already built for a 16:9 screen — the face and
 * the torn-paper bar across it are on the centre line — so any lift now takes
 * the artwork *off* its own centre. It also more than halves OVERHANG below,
 * which is how the crop got smaller rather than larger.
 */
const VERTICAL_SHIFT = 0;
/** Worst-case excursion, plus a margin so anti-aliasing never bites. */
const OVERHANG = Math.abs(VERTICAL_SHIFT) + PARALLAX_RANGE + 30;

/**
 * FULL BLEED — 1, where the square artwork before it needed 0.7.
 *
 * That 0.7 was not a taste decision, it was a repair. `object-cover` crops to
 * whichever axis binds, and a 3000×3000 square on a 1440-wide desktop was
 * already showing ~82% of its own width; pulling back 30% was the only way to
 * see the rest of it, and it cost two blurred bands down the sides.
 *
 * This file has no such problem. It is 16:9, which is the shape of the screen
 * it is going on, so cover crops almost nothing and the whole composition —
 * the devil at the left edge, the crowned silhouette at the right — is on
 * screen at native scale. Zooming out from here would only reintroduce the
 * bands the old value was paying for.
 */
const ZOOM = 1;

export function DesktopWallpaper({ src, alt = "" }: { src: string; alt?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // Listens on window rather than the desktop div so floating windows on top
  // never swallow the mousemove hit-test.
  useEffect(() => {
    // A drift bound to a cursor is meaningless without one. On a touch screen
    // `mousemove` fires once, from the synthesised click, and leaves the
    // wallpaper parked at whatever offset that tap implied — a permanently
    // crooked wallpaper rather than a moving one. Reduced motion is the same
    // question asked by preference rather than by hardware.
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches;
    if (still) return;

    const onMouseMove = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      setParallax({
        x: Math.max(-1, Math.min(1, nx)) * PARALLAX_RANGE,
        y: Math.max(-1, Math.min(1, ny)) * PARALLAX_RANGE,
      });
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    /*
      The ground is the artwork's own red, not black.

      Measured off the file: its top edge is rgb(254,0,0) and its two sides
      average rgb(225,0,0) — a flat, saturated red almost all the way round.
      Black behind it means any hairline the compositor leaves at a fractional
      device-pixel ratio reads as a dark seam against that red. This red does
      not, because it is the same red.

      The foot is the exception, and the reason the blurred layer below stays:
      the figure's jacket runs off the bottom of the frame, so that edge
      averages rgb(143,0,0) with black in it. No one flat colour matches all
      four sides, which is what the blur is for.
    */
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-[#c50000]">
      {/* The surround. Same picture, full bleed, thrown out of focus and taken
          down a stop so it never competes with the sharp copy in front.

          AT ZOOM 1 THIS IS INSURANCE RATHER THAN DECORATION. With the square
          artwork it was visible design — two wide blurred bands either side of
          a shrunken foreground. A 16:9 file at native scale covers a 16:9
          screen outright, so on any ordinary desktop nothing of this layer is
          ever on screen. It earns its place on the shapes that are not
          ordinary: a 21:9 ultrawide, or a browser window dragged tall and
          narrow, where cover binds on the other axis and the sharp copy can no
          longer reach both edges at once.

          It is `aria-hidden` and carries no alt: there is one wallpaper here,
          and a screen reader should hear about it once — from the layer
          below. */}
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        priority
        className="scale-110 object-cover blur-2xl brightness-[0.72]"
        sizes="100vw"
      />

      <div className="absolute" style={{ inset: -OVERHANG }}>
        <Image
          src={src}
          alt={alt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
          style={{
            // TRANSLATE FIRST, THEN SCALE — the order matters and is easy to
            // get backwards. CSS composes these right to left, so the
            // right-most function acts in the element's own space and the
            // left-most in screen space. Written the other way round
            // (`scale() translate()`) the offsets would be scaled too, and a
            // 60px parallax would quietly become 42.
            transform: `translate3d(${parallax.x}px, ${parallax.y + VERTICAL_SHIFT}px, 0) scale(${ZOOM})`,
            transition: "transform 0.3s ease-out",
          }}
        />
      </div>
    </div>
  );
}
