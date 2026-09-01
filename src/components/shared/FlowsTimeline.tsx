"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { usePersona } from "@/components/providers/PersonaProvider";
import { FLOWS_COVER, flowAlt, flowSlides, type FlowSlide } from "@/content/flows-timeline";
import { cn } from "@/lib/utils";

/**
 * THE FOUR FLOWS — the carousel, unrolled sideways.
 *
 * The post was five squares swiped left to right, and the designer drew a
 * dashed line leaving the right edge of each one at the height it enters the
 * left edge of the next. This used to redraw that as a vertical spine you
 * scrolled down, which fought the source: a carousel travels sideways, and
 * turning it ninety degrees threw away the one piece of structure the artwork
 * already had. It runs left to right again, the way it was posted.
 *
 * BOTH SCROLL AXES DRIVE THE SAME TRAVEL. A horizontal track inside a window
 * has no scrollbar and no obvious gesture, so a wheel — which on most mice
 * only reports `deltaY` — has to mean "go on". Vertical and horizontal wheel
 * input, trackpad swipes, arrow keys, Home and End all move one number, and
 * the gesture is handed back to the page at either end rather than swallowed.
 *
 * PARALLAX IS COMPUTED, NOT OBSERVED. Every station's resting position along
 * the track is measured once; its distance from the centre of the viewport is
 * then a function of the current offset, so each sleeve can be shifted inside
 * its own frame with no per-frame measurement and no observer. Foreground and
 * background move at different rates against the same scroll, which is the
 * whole of the effect.
 *
 * GLASS NEEDS SOMETHING TO BLUR. `backdrop-filter` over flat black samples
 * flat black and renders a grey rectangle — the reason a first pass at this
 * looked like frosted plastic. `Aurora` below paints a slow, drifting colour
 * field behind the track for the stations to pick up, so the tiles read as
 * lit glass rather than as translucent boxes.
 *
 * The verses are printed *in* the images, so they are not set again as body
 * copy beside them — that would put the same words on screen twice in two
 * typefaces. They go into the alt text instead, where they do the job the
 * picture does for everyone else.
 */

/** Wheel delta to track pixels. Above 1 so one notch clears real ground. */
const WHEEL_STEP = 1.35;

/** How far a sleeve slides inside its frame, as a fraction of its travel. */
const PARALLAX_DEPTH = 0.12;

/** Extra scale on the sleeve, so parallax never exposes an edge. */
const PARALLAX_OVERSCAN = 1.18;

export function FlowsTimeline() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [viewWidth, setViewWidth] = useState(0);
  /** Each station's centre along the track, in track-space px. */
  const [cardCenters, setCardCenters] = useState<number[]>([]);

  /** A render forced from outside React, so the layout effect re-measures. */
  const [resizeTick, bumpResizeTick] = useReducer((n: number) => n + 1, 0);

  /**
   * Measure on every render, guarded.
   *
   * The two cheap box reads run always; the per-station pass only when the box
   * actually changed or nothing has been measured yet. Station positions are
   * fixed relative to the track, so they only move when the track resizes —
   * re-reading a rect per station on every scroll tick is what makes a
   * horizontal track stutter.
   */
  useLayoutEffect(() => {
    const view = viewportRef.current;
    const track = trackRef.current;
    if (!view || !track) return;

    const clientWidth = view.clientWidth;
    // `offsetWidth`, not `scrollWidth`: the track is `w-max`, exactly as wide
    // as its content, and never scrolls itself.
    const travel = Math.max(0, track.offsetWidth - clientWidth);

    setMaxOffset((prev) => (prev === travel ? prev : travel));
    setViewWidth((prev) => (prev === clientWidth ? prev : clientWidth));

    const boxChanged = travel !== maxOffset || clientWidth !== viewWidth;
    if (!boxChanged && cardCenters.length === flowSlides.length) return;

    const trackLeft = track.getBoundingClientRect().left;
    const centers = cardRefs.current.map((el) => {
      if (!el) return Number.POSITIVE_INFINITY;
      const rect = el.getBoundingClientRect();
      return rect.left - trackLeft + rect.width / 2;
    });
    setCardCenters((prev) =>
      prev.length === centers.length && prev.every((v, i) => v === centers[i])
        ? prev
        : centers,
    );
  }, [maxOffset, viewWidth, cardCenters, resizeTick]);

  useEffect(() => {
    window.addEventListener("resize", bumpResizeTick);
    return () => window.removeEventListener("resize", bumpResizeTick);
  }, []);

  const walk = useCallback(
    (delta: number) => {
      setOffset((prev) => Math.min(maxOffset, Math.max(0, prev + delta)));
    },
    [maxOffset],
  );

  /**
   * Wheel down or right walks forward. Bound non-passively so the surface
   * behind the window is not scrolled at the same time — but only while there
   * is somewhere left to go, so at either end the gesture is handed back
   * rather than swallowed.
   */
  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;

    const onWheel = (e: WheelEvent) => {
      // Whichever axis the device reports more strongly. A mouse only ever
      // reports deltaY; a trackpad swipe reports deltaX, and both mean "on".
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = raw * WHEEL_STEP;
      if (delta === 0) return;

      if ((delta < 0 && offset <= 0) || (delta > 0 && offset >= maxOffset)) return;

      e.preventDefault();
      walk(delta);
    };

    view.addEventListener("wheel", onWheel, { passive: false });
    return () => view.removeEventListener("wheel", onWheel);
  }, [walk, offset, maxOffset]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const page = (viewportRef.current?.clientWidth ?? 600) * 0.8;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") walk(page);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") walk(-page);
    else if (e.key === "Home") setOffset(0);
    else if (e.key === "End") setOffset(maxOffset);
    else return;
    e.preventDefault();
  };

  /**
   * A shrinking window must not leave the track parked past its new end.
   * Clamped on the way out rather than corrected in an effect: the stored
   * offset is only ever a request, and where the track actually sits is a
   * function of that request and the room available.
   */
  const at = Math.min(offset, maxOffset);
  const progress = maxOffset > 0 ? at / maxOffset : 1;

  const accent = isDotm ? "#ff0033" : "#7cc7ff";

  /**
   * How far a station is from the centre of the viewport, normalised so that
   * -1 is one screen to the left and +1 one screen to the right. Drives both
   * the parallax shift and the arrival fade.
   */
  const centerBias = (i: number): number => {
    const center = cardCenters[i];
    if (!Number.isFinite(center) || viewWidth === 0) return 0;
    return (center - at - viewWidth / 2) / viewWidth;
  };

  return (
    <div
      className="flows-type relative h-full w-full overflow-hidden bg-black text-white"
      style={{ containerType: "inline-size" }}
    >
      <Aurora accent={accent} progress={progress} />

      <div
        ref={viewportRef}
        role="region"
        aria-label="The Four Flows — a horizontal carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative z-10 h-full w-full overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
      >
        <div
          ref={trackRef}
          className="flex h-full w-max items-center px-[6vw]"
          style={{
            transform: `translate3d(${-at}px, 0, 0)`,
            // Long enough to glide, short enough that the track still feels
            // attached to the wheel rather than chasing it.
            transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          <Cover isDotm={isDotm} />

          {flowSlides.map((slide, i) => (
            <div key={slide.id} className="flex shrink-0 items-center">
              <Connector accent={accent} lit={centerBias(i) < 0.5} flip={i % 2 === 1} />
              <Station
                slide={slide}
                accent={accent}
                isDotm={isDotm}
                bias={centerBias(i)}
                flip={i % 2 === 1}
                innerRef={(el) => {
                  cardRefs.current[i] = el;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <Rail progress={progress} accent={accent} atEnd={at >= maxOffset - 1} />
    </div>
  );
}

/**
 * The drifting colour field behind the track.
 *
 * Three wide, heavily blurred blooms on black. They exist so the stations'
 * `backdrop-filter` has real colour to pick up — glass over a flat ground is
 * indistinguishable from a grey box — and they drift with the scroll, so
 * moving along the track changes what the glass is sampling.
 *
 * `screen` compositing, because light adds: drawn normally these would be
 * three visible discs, screened they read as gas.
 */
function Aurora({ accent, progress }: { accent: string; progress: number }) {
  const drift = progress * 22;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(60% 70% at ${18 - drift}% 30%, ${accent}2e 0%, transparent 62%)`,
            `radial-gradient(55% 65% at ${62 - drift}% 76%, #6d28d92b 0%, transparent 64%)`,
            `radial-gradient(48% 60% at ${104 - drift}% 24%, #0ea5e926 0%, transparent 62%)`,
          ].join(", "),
          mixBlendMode: "screen",
          transition: "background 420ms linear",
        }}
      />
      {/* A fine grain over the blooms. Flat gradients on a dark screen band
          into visible steps; noise is what breaks the banding up. */}
      <div className="flows-grain absolute inset-0 opacity-[0.18]" />
    </div>
  );
}

/**
 * THE TITLE, AS A LOCKUP.
 *
 * One oversized F does the work of both capitals: "our" and "lows" stack
 * against its right side, so the two words read down the same stem.
 *
 * Built out of a grid rather than absolute offsets so it survives a font
 * swap: the F spans both rows and is sized in `em` off the block's own font
 * size, and the two syllables are ordinary grid children.
 *
 * A screen reader gets "The Four Flows" as one string from the `sr-only`
 * heading; everything visible is `aria-hidden`, because "F our lows" read
 * aloud is not the title.
 */
function Cover({ isDotm }: { isDotm: boolean }) {
  return (
    <div className="flex shrink-0 flex-col justify-center pr-[4vw]">
      <h2 className="sr-only">{FLOWS_COVER.title}</h2>

      <p
        aria-hidden="true"
        className="font-chrome text-[11px] uppercase tracking-[0.42em] text-white/45"
      >
        The
      </p>

      <div
        aria-hidden="true"
        className={cn(
          "mt-1.5 grid grid-cols-[auto_auto] items-center gap-x-[0.06em] font-headline uppercase leading-[0.86]",
          isDotm && "font-bold",
        )}
        style={{
          fontSize: "clamp(2.4rem, 7cqi, 4.6rem)",
          textShadow: "0 2px 26px rgba(0,0,0,0.9)",
        }}
      >
        <span
          className="row-span-2 block self-center leading-[0.78]"
          style={{ fontSize: "1.95em" }}
        >
          F
        </span>
        <span className="block text-left">our</span>
        <span className="block text-left">lows</span>
      </div>

      {/* "Scroll to travel" used to sit here, under the title card, and it is
          gone for the same reason it went from the wall's footer: it narrated
          the one gesture a vertical timeline already invites. */}
    </div>
  );
}

/**
 * The line between two stations, with the arrowhead the post printed.
 *
 * Long on purpose — this is the travel between two pieces, not a tick
 * separating them — and it steps up or down to meet whichever height the next
 * station sits at, which is exactly what the dashed line in the artwork does.
 */
function Connector({
  accent,
  lit,
  flip,
}: {
  accent: string;
  lit: boolean;
  flip: boolean;
}) {
  // Rises to meet a lifted station, falls to meet a dropped one.
  const path = flip ? "M2 22 C 62 22, 78 62, 150 62" : "M2 62 C 62 62, 78 22, 150 22";
  const head = flip ? "M146 53 L166 62 L146 71 Z" : "M146 13 L166 22 L146 31 Z";

  return (
    <svg
      aria-hidden="true"
      width="176"
      height="84"
      viewBox="0 0 176 84"
      fill="none"
      className="w-[104px] shrink-0 sm:w-[168px]"
      style={{ opacity: lit ? 1 : 0.25, transition: "opacity 500ms ease-out" }}
    >
      <path
        d={path}
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="7 9"
        opacity={0.75}
      />
      <path d={head} fill={accent} opacity={0.9} />
    </svg>
  );
}

/** One station: the numeral, the title, and the sleeve on glass. */
function Station({
  slide,
  accent,
  isDotm,
  bias,
  flip,
  innerRef,
}: {
  slide: FlowSlide;
  accent: string;
  isDotm: boolean;
  /** Distance from viewport centre, in screens. 0 is dead centre. */
  bias: number;
  flip: boolean;
  innerRef: (el: HTMLElement | null) => void;
}) {
  // Clamped so a station parked far off screen does not shear its own art.
  const clamped = Math.max(-1.4, Math.min(1.4, bias));
  const near = Math.abs(clamped) < 0.85;

  return (
    <figure
      ref={innerRef}
      className={cn(
        "relative flex shrink-0 flex-col",
        // Sized off the pane's height as well as its width: this is a
        // horizontal track in a full-screen window, so height runs out first.
        "w-[min(52vh,clamp(220px,30cqi,400px))]",
      )}
      style={{ transform: `translateY(${flip ? 34 : -34}px)` }}
    >
      <div
        className="mb-3 flex items-baseline gap-3"
        style={{
          opacity: near ? 1 : 0.35,
          transition: "opacity 500ms ease-out",
        }}
      >
        <span
          className="font-headline text-[clamp(1.4rem,3.4cqi,2.1rem)] leading-none"
          style={{ color: accent }}
        >
          {String(slide.order).padStart(2, "0")}
        </span>
        <h3
          className={cn(
            "font-headline text-[clamp(1.3rem,3.8cqi,2.2rem)] leading-none text-white",
            isDotm && "font-bold",
          )}
        >
          {slide.title}
        </h3>
      </div>

      {/* The glass tile. `overflow-hidden` is what lets the sleeve inside
          travel without escaping its frame — the parallax depends on it. */}
      <div
        className="flows-glass relative aspect-square w-full overflow-hidden rounded-2xl"
        style={{
          boxShadow: near
            ? `inset 0 1px 0 rgba(255,255,255,0.22), 0 26px 70px -30px ${accent}, 0 0 0 1px rgba(255,255,255,0.08)`
            : undefined,
          transition: "box-shadow 600ms ease-out",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            // The sleeve slides against the scroll, scaled up so the shift
            // never drags an edge into frame.
            transform: `translate3d(${-clamped * PARALLAX_DEPTH * 100}%, 0, 0) scale(${PARALLAX_OVERSCAN})`,
            transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          <Image
            src={slide.src}
            alt={flowAlt(slide)}
            fill
            sizes="(min-width: 640px) 400px, 70vw"
            /* Eager: the window animates open and there are only four of
               these, so a lazy sleeve is a blank square in an environment
               that never fires the loading observer. */
            loading="eager"
            className="object-cover"
          />
        </div>

        {/* A hairline of light along the top edge, which is what separates a
            pane of glass from a translucent rectangle. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 26%, rgba(255,255,255,0) 55%)",
          }}
        />
      </div>
    </figure>
  );
}

/**
 * The progress rail.
 *
 * A horizontal track with no scrollbar has to say two things out loud: how far
 * along you are, and that there is more. The rail says both, and stops saying
 * the second once there is not.
 */
function Rail({
  progress,
  accent,
  atEnd,
}: {
  progress: number;
  accent: string;
  atEnd: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center gap-4 px-[6vw] pb-5">
      <div className="h-px flex-1 bg-white/12">
        <div
          className="h-px"
          style={{
            width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
            backgroundColor: accent,
            boxShadow: `0 0 10px ${accent}`,
            transition: "width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <span
        className="shrink-0 font-chrome text-[10px] uppercase tracking-[0.3em] text-white/35"
        style={{ opacity: atEnd ? 0 : 1, transition: "opacity 300ms ease-out" }}
      >
        More
      </span>
    </div>
  );
}

export default FlowsTimeline;
