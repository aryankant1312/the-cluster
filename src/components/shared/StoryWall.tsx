"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type TargetAndTransition,
} from "framer-motion";
import { usePersona } from "@/components/providers/PersonaProvider";
import { STORY_RELEASE, storySlides, type StorySlide } from "@/content/story-carousel";
import { cn } from "@/lib/utils";

/**
 * THE STORY WALL — the Finding Peace carousel, laid out as a path.
 *
 * The slides were built to be swiped through in order, left to right, and
 * each one prints its own arrow to prove it. The wall used to stack them
 * downward and bend those arrows through ninety degrees; it now runs the way
 * the artwork runs, and the wheel drives it: scrolling down walks the journey
 * to the right, scrolling up walks it back. Same gesture, same reveal, right
 * axis.
 *
 * Wheel-to-horizontal is done by translating the whole track rather than by
 * writing to `scrollLeft`, so the movement is spring-damped and every slide
 * animates in as it arrives — a native horizontal scroller would have jumped
 * a slide per notch and skipped the entrance entirely.
 *
 * The films are monochrome — grain, black display caps, no colour anywhere —
 * so the wall stays monochrome too, and the persona accent lands only on
 * things the visitor can actually operate. Here colour means "this responds".
 *
 * Both personas share this component and differ only in skin, the way
 * `BrandUniverse` does. DEV wanted heavier type and harder contrast, so it
 * gets plated Win98 chrome at a bigger scale; DOTM keeps hairlines on black.
 */

/**
 * Per-slide entrances, so no two pieces arrive the same way — the wall reads
 * as five separate moments rather than one motion played five times.
 *
 * Re-aimed for a track that travels sideways: what used to rise from below
 * now arrives from the right, which is the direction the slide is actually
 * coming from.
 */
const ENTRANCES: Record<
  StorySlide["motion"],
  { from: TargetAndTransition; to: TargetAndTransition }
> = {
  rise: {
    from: { opacity: 0, x: 46, scale: 0.94 },
    to: { opacity: 1, x: 0, scale: 1 },
  },
  "swipe-left": {
    from: { opacity: 0, x: 70, rotate: -3 },
    to: { opacity: 1, x: 0, rotate: 0 },
  },
  wipe: {
    from: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    to: { opacity: 1, clipPath: "inset(0 0% 0 0)" },
  },
  "swipe-right": {
    from: { opacity: 0, x: 70, rotate: 3 },
    to: { opacity: 1, x: 0, rotate: 0 },
  },
  focus: {
    from: { opacity: 0, scale: 1.08, filter: "blur(14px)" },
    to: { opacity: 1, scale: 1, filter: "blur(0px)" },
  },
};

/** How far one wheel notch walks the track, as a multiple of its delta. */
const WHEEL_STEP = 1.15;

export function StoryWall() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const reduceMotion = useReducedMotion();
  const [fullscreen, setFullscreen] = useState<StorySlide | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [viewWidth, setViewWidth] = useState(0);
  /** Each piece's left edge, measured along the track. */
  const [cardLefts, setCardLefts] = useState<number[]>([]);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  /**
   * The track's geometry, measured: how far it can travel, and where each
   * piece sits along it.
   *
   * Read with `getBoundingClientRect` in a layout effect that runs on EVERY
   * render, guarded by an equality check — the same idiom `useBoxSize` uses
   * for the music wheel. A ResizeObserver was the obvious tool and was the
   * wrong one: it reports on a later frame, so the wall painted once with
   * nowhere to travel; and the window this lives in animates open, so that
   * first zero-width measurement is the common case, not the edge case. A
   * layout effect is synchronous and correct before paint.
   */
  /**
   * A render forced from outside React — the resize listener below. The
   * measurement itself lives in the layout effect, so making it re-run is a
   * matter of making the component render.
   */
  const [resizeTick, bumpResizeTick] = useReducer((n: number) => n + 1, 0);

  /**
   * Runs on every render on purpose: the pane resizes with the window and
   * with the shell around it, and no dependency captures that. The equality
   * guards below are what keep it from looping.
   *
   * THE PER-CARD PASS IS GUARDED, and that guard is the difference between a
   * wall that glides and one that stutters. Walking the track changes
   * `offset`, which renders, which ran this effect — and it read a rect for
   * the track plus one for every card, synchronously, before paint. Five
   * forced layouts per wheel tick, every tick, for numbers that had not
   * changed: card positions are fixed relative to the track, so they only
   * move when the box around them resizes.
   *
   * So the two cheap box reads happen every time, and the expensive pass only
   * when they came back different — or when nothing has been measured yet,
   * which is the window-animating-open case this effect exists for.
   */
  useLayoutEffect(() => {
    const view = viewportRef.current;
    const track = trackRef.current;
    if (!view || !track) return;

    const clientWidth = view.clientWidth;
    // `offsetWidth`, not `scrollWidth`: the track is `w-max`, so it is exactly
    // as wide as its content and never scrolls itself — `scrollWidth` would
    // equal its client width and report a track with nowhere to travel.
    const travel = Math.max(0, track.offsetWidth - clientWidth);

    setMaxOffset((prev) => (prev === travel ? prev : travel));
    setViewWidth((prev) => (prev === clientWidth ? prev : clientWidth));

    const boxChanged = travel !== maxOffset || clientWidth !== viewWidth;
    const everMeasured = cardLefts.length === storySlides.length;
    if (!boxChanged && everMeasured) return;

    const trackLeft = track.getBoundingClientRect().left;
    const lefts = cardRefs.current.map((el) =>
      el ? el.getBoundingClientRect().left - trackLeft : Number.POSITIVE_INFINITY,
    );
    setCardLefts((prev) =>
      prev.length === lefts.length && prev.every((v, i) => v === lefts[i]) ? prev : lefts,
    );
    // `resizeTick` is here to make a window resize re-run the measurement; it
    // is never read.
  }, [maxOffset, viewWidth, cardLefts, resizeTick]);

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
   * Wheel down walks right. Bound non-passively so the surface behind the
   * window is not scrolled at the same time — but only while there is
   * somewhere left to go in that direction, so at either end the gesture is
   * handed back rather than swallowed.
   */
  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;

    const onWheel = (e: WheelEvent) => {
      // Trackpads report a horizontal component directly; honour it when it
      // dominates, so a two-finger sideways swipe does the obvious thing.
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = raw * WHEEL_STEP;
      if (delta === 0) return;

      const atStart = offset <= 0;
      const atEnd = offset >= maxOffset;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;

      e.preventDefault();
      walk(delta);
    };

    view.addEventListener("wheel", onWheel, { passive: false });
    return () => view.removeEventListener("wheel", onWheel);
  }, [walk, offset, maxOffset]);

  /** Keyboard parity: arrows, Home and End walk the same track. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const page = (viewportRef.current?.clientWidth ?? 600) * 0.8;
    if (e.key === "ArrowRight") walk(page);
    else if (e.key === "ArrowLeft") walk(-page);
    else if (e.key === "Home") setOffset(0);
    else if (e.key === "End") setOffset(maxOffset);
    else return;
    e.preventDefault();
  };

  /**
   * A shrinking window must not leave the track parked past its new end.
   * Clamped on the way out rather than corrected in an effect: the stored
   * offset is only ever a request, and what the track is actually at is a
   * function of that request and the room available. Writing the correction
   * back to state would render one frame past the end before fixing it.
   */
  const at = Math.min(offset, maxOffset);
  const progress = maxOffset > 0 ? at / maxOffset : 1;

  /**
   * Which pieces have arrived, computed from the offset rather than watched
   * with an IntersectionObserver.
   *
   * `whileInView` was the first cut and it is the wrong instrument here. The
   * track moves by transform inside an `overflow-hidden` pane, so whether a
   * card counts as "in view" depends on how the observer resolves a clipped,
   * transformed ancestor — and when it does not resolve, the card stays at
   * `opacity: 0` forever. That is precisely the class of bug this pass was
   * asked to fix: pieces present in the DOM and invisible on screen.
   *
   * The wall already knows where it is and where every piece sits, so it
   * answers the question itself. `furthest` is the high-water mark of the
   * journey, adjusted during render rather than in an effect — walking back
   * should not un-play an entrance, so reveal is monotonic by construction
   * instead of by a growing set of indices.
   */
  const [furthest, setFurthest] = useState(0);
  if (at > furthest) setFurthest(at);

  const revealEdge = furthest + viewWidth * 0.92;
  const revealed = (i: number) =>
    cardLefts.length > i ? cardLefts[i] <= revealEdge : false;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        isDotm ? "bg-[#08080a] text-white" : "bg-[#0f172a] text-white",
      )}
    >
      {/* Film grain, at roughly the strength the slides themselves carry.
          Drawn as SVG turbulence rather than a bitmap so it ships for free and
          never tiles visibly. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDotm
            ? "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07) 0%, transparent 55%)"
            : "radial-gradient(ellipse at 50% 0%, rgba(96,152,214,0.22) 0%, transparent 60%)",
        }}
      />

      <Header isDotm={isDotm} />

      {/* The viewport. `tabIndex` makes the track keyboard-operable as one
          unit, which is what a horizontal scroller with no scrollbar needs. */}
      <div
        ref={viewportRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="region"
        aria-label="The story, left to right"
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-hidden focus:outline-none",
          isDotm
            ? "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
            : "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7dd3fc]",
        )}
      >
        <motion.ol
          ref={trackRef}
          animate={{ x: -at }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 190, damping: 30, mass: 0.7 }
          }
          className="flex h-full w-max items-center px-[6vw]"
        >
          {storySlides.map((slide, i) => (
            <li key={slide.id} className="contents">
              <SlideCard
                slide={slide}
                lifted={i % 2 === 0}
                isDotm={isDotm}
                reduceMotion={Boolean(reduceMotion)}
                revealed={revealed(i)}
                innerRef={(el) => {
                  cardRefs.current[i] = el;
                }}
                onOpen={() => setFullscreen(slide)}
              />
              {i < storySlides.length - 1 && (
                <Connector isDotm={isDotm} revealed={revealed(i + 1)} />
              )}
            </li>
          ))}
        </motion.ol>
      </div>

      <Footer
        isDotm={isDotm}
        progress={progress}
        atStart={at <= 0}
        atEnd={at >= maxOffset}
        onBack={() => walk(-(viewportRef.current?.clientWidth ?? 600) * 0.8)}
        onForward={() => walk((viewportRef.current?.clientWidth ?? 600) * 0.8)}
      />

      <AnimatePresence>
        {fullscreen && (
          <FullscreenPlayer
            slide={fullscreen}
            isDotm={isDotm}
            onClose={() => setFullscreen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The record's name, and nothing else.
 *
 * There used to be a kicker above it and a paragraph below. Both described the
 * carousel to a visitor already standing in front of it, and between them they
 * pushed the first slide down far enough that the wall opened on its own
 * chrome rather than on the artwork.
 */
function Header({ isDotm }: { isDotm: boolean }) {
  return (
    <header className="relative z-10 shrink-0 px-[6vw] pb-4 pt-6 text-center">
      <h2
        className={cn(
          "font-headline uppercase leading-[0.92]",
          isDotm
            ? "text-[clamp(1.9rem,4.2vw,3.4rem)] tracking-[0.04em] text-white"
            : "text-[clamp(2rem,4.6vw,3.8rem)] font-black tracking-tight text-white [text-shadow:4px_4px_0_#0a2f5c]",
        )}
      >
        {STORY_RELEASE.title}
      </h2>
    </header>
  );
}

/**
 * The wall's own controls, along the bottom: a progress rail and a pair of
 * step buttons.
 *
 * A horizontal track with no scrollbar has to say two things out loud — how
 * far along you are, and that there is more — and a mouse user with no
 * trackpad needs a way through that is not a wheel gesture.
 *
 * Both of those are now the rail's and the step buttons' job. The line beside
 * them used to open "Scroll to travel · ", which said a third time what a
 * filling rail and a live Forward button already say. What is kept is the
 * half that nothing else announces: double-clicking a piece opens it full
 * screen, which is not a gesture anyone guesses at.
 */
function Footer({
  isDotm,
  progress,
  atStart,
  atEnd,
  onBack,
  onForward,
}: {
  isDotm: boolean;
  progress: number;
  atStart: boolean;
  atEnd: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-4 px-[6vw] pb-5 pt-3">
      <StepButton label="Back" isDotm={isDotm} disabled={atStart} onClick={onBack}>
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" aria-hidden="true">
          <path
            d="M15 5l-7 7 7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </StepButton>

      <div
        className={cn(
          "h-px min-w-0 flex-1 overflow-hidden",
          isDotm ? "bg-white/15" : "bg-white/25",
        )}
      >
        <motion.div
          className={cn("h-full", isDotm ? "bg-white/70" : "bg-[#7dd3fc]")}
          animate={{ scaleX: Math.max(0.02, progress) }}
          transition={{ type: "spring", stiffness: 190, damping: 30 }}
          style={{ transformOrigin: "left" }}
        />
      </div>

      <p
        className={cn(
          "hidden shrink-0 font-chrome uppercase sm:block",
          isDotm
            ? "text-[9px] tracking-[0.3em] text-white/35"
            : "text-[10px] font-bold tracking-[0.24em] text-[#7dd3fc]/80",
        )}
      >
        Double-click a piece for full screen
      </p>

      <StepButton label="Forward" isDotm={isDotm} disabled={atEnd} onClick={onForward}>
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" aria-hidden="true">
          <path
            d="M9 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  isDotm,
  disabled,
  onClick,
  children,
}: {
  label: string;
  isDotm: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center transition-all",
        "disabled:pointer-events-none disabled:opacity-25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        isDotm
          ? "rounded-full border border-white/25 text-white hover:border-white/70 hover:bg-white/10 active:scale-95"
          : "win98-border win98-press bg-persona-surface text-black hover:bg-persona-surface-alt",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The arrow between two pieces.
 *
 * Every carousel slide prints a straight arrow at its right edge, pointing at
 * the next one — so this is that arrow, drawn at wall scale and left
 * horizontal instead of bent downward. The shaft is a dashed rule that draws
 * itself in as the pair scrolls into view and the head lands after it, so the
 * eye follows the direction of travel rather than stopping at a decoration.
 */
function Connector({ isDotm, revealed }: { isDotm: boolean; revealed: boolean }) {
  const stroke = isDotm ? "rgba(255,255,255,0.35)" : "#7dd3fc";

  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{ opacity: revealed ? 1 : 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex shrink-0 items-center justify-center px-3 sm:px-6"
    >
      {/* Longer than it was: the shaft ran to 64 of a 92 viewBox and the whole
          thing was clamped to 86px, which read as a tick between two large
          sleeves rather than as travel between them. */}
      <svg
        width="150"
        height="26"
        viewBox="0 0 150 26"
        fill="none"
        aria-hidden="true"
        className="w-[86px] sm:w-[142px]"
      >
        <motion.path
          d="M2 13 H122"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="6 7"
          initial={false}
          animate={{ pathLength: revealed ? 1 : 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        <motion.path
          d="M120 4 L138 13 L120 22 Z"
          fill={stroke}
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, x: revealed ? 0 : -8 }}
          transition={{ duration: 0.4, delay: revealed ? 0.45 : 0, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * One piece of the record.
 *
 * The poster is what loads; nothing autoplays. Five running videos in one
 * track is a lot of decoding for a wall where three of them are off screen.
 *
 * Hover gives a muted, looping taste. A click plays the piece properly, in
 * the frame, with sound, and it keeps running when the pointer moves away —
 * on a touch device, where there is no hover, the click is the only way in.
 * Double-click still opens it full screen.
 *
 * Alternating pieces sit a little high or a little low, which carries the
 * staggered rhythm of the old vertical wall onto a horizontal one.
 */
function SlideCard({
  slide,
  lifted,
  isDotm,
  reduceMotion,
  revealed,
  innerRef,
  onOpen,
}: {
  slide: StorySlide;
  lifted: boolean;
  isDotm: boolean;
  reduceMotion: boolean;
  revealed: boolean;
  innerRef: (el: HTMLElement | null) => void;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Three states, not two.
   *
   *   idle    — the poster, nothing running
   *   preview — a muted, silent taste, started by hover and ended by leaving
   *   playing — the film, started by a click, with sound, and it keeps running
   *
   * The old card had only a boolean, so a click and a hover produced the same
   * thing — and `onMouseLeave` then stopped it. Clicking a piece to watch it
   * and having it die the moment the pointer moved an inch was the bug: the
   * click may as well not have been wired.
   */
  const [mode, setMode] = useState<"idle" | "preview" | "playing">("idle");
  const showingVideo = mode !== "idle";

  /**
   * Pending single-click, held so a double-click can cancel it.
   *
   * A double-click emits two `click` events before `dblclick`, so acting on
   * the click immediately means a double-click toggles playback twice on its
   * way to opening full screen. Deferring by a fraction of the platform's
   * double-click window lets the second gesture win cleanly, and leaves the
   * double-click behaving exactly as it did before.
   */
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingClick = () => {
    if (clickTimer.current === null) return;
    clearTimeout(clickTimer.current);
    clickTimer.current = null;
  };

  useEffect(() => cancelPendingClick, []);

  /** Hover taste. Never interrupts a film the visitor deliberately started. */
  const startPreview = () => {
    if (mode === "playing") return;
    setMode("preview");
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    void el.play().catch(() => undefined);
  };

  const endPreview = () => {
    if (mode === "playing") return;
    setMode("idle");
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  /** Click: play it here, in the frame, with sound. Click again to pause. */
  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (mode === "playing") {
      el.pause();
      setMode("idle");
      el.currentTime = 0;
      return;
    }
    setMode("playing");
    // A click is a user gesture, so unmuting here is allowed. The preview is
    // silent precisely so that this is the moment sound arrives.
    el.muted = false;
    void el.play().catch(() => undefined);
  };

  return (
    <motion.figure
      ref={innerRef}
      initial={false}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : revealed
            ? ENTRANCES[slide.motion].to
            : ENTRANCES[slide.motion].from
      }
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.72, ease: [0.22, 1, 0.36, 1] }
      }
      className={cn(
        "relative flex shrink-0 flex-col",
        // Sized off the viewport's height as well as its width: this is a
        // horizontal track inside a full-screen window, so height is the axis
        // that runs out first. The square sleeve plus its caption then fit by
        // construction, whatever the window's proportions — which is what
        // stopped pieces being clipped off the bottom of the frame.
        "w-[min(40vh,clamp(180px,24vw,360px))]",
        lifted ? "-translate-y-4" : "translate-y-4",
      )}
    >
      {/* The numeral, sunk behind the card as texture — the same device the
          shows list uses for its stop numbers. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-3 -top-9 font-headline text-[4.5rem] leading-none sm:text-[6rem]",
          isDotm ? "text-white/[0.07]" : "text-white/[0.12]",
        )}
      >
        {String(slide.order).padStart(2, "0")}
      </span>

      <button
        type="button"
        onDoubleClick={() => {
          cancelPendingClick();
          onOpen();
        }}
        onClick={() => {
          cancelPendingClick();
          clickTimer.current = setTimeout(() => {
            clickTimer.current = null;
            togglePlay();
          }, 220);
        }}
        onMouseEnter={startPreview}
        onMouseLeave={endPreview}
        onFocus={startPreview}
        onBlur={endPreview}
        aria-label={`${slide.title} — click to play, double-click for full screen`}
        className={cn(
          "group relative block aspect-square w-full overflow-hidden",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isDotm
            ? "rounded-xl ring-1 ring-white/12 focus-visible:ring-white focus-visible:ring-offset-[#08080a]"
            : "win98-border focus-visible:ring-[#7dd3fc] focus-visible:ring-offset-[#0f172a]",
        )}
      >
        <Image
          src={slide.poster}
          alt={slide.title}
          fill
          sizes="(min-width: 1024px) 360px, 60vw"
          className={cn(
            "object-cover transition-opacity duration-300",
            showingVideo ? "opacity-0" : "opacity-100",
          )}
        />
        <video
          ref={videoRef}
          src={slide.src}
          poster={slide.poster}
          // Starts muted; the click handler unmutes, which is allowed because
          // a click is a user gesture. `loop` is set below, per mode.
          muted
          playsInline
          // `metadata` rather than `none`: the first frame and duration are
          // enough for the preview to start on the same tick as the hover,
          // instead of the card sitting black for a beat while the file is
          // fetched from scratch.
          preload="metadata"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            showingVideo ? "opacity-100" : "opacity-0",
          )}
          // A film started by a click runs to its end and stops; only the
          // hover taste loops, because a taste has no end to reach.
          loop={mode === "preview"}
          onEnded={() => setMode("idle")}
        />

        {/* The affordance stays quiet until the card is hovered — the artwork
            should be the first thing read, not a control laid over it. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity duration-200",
            // Hidden outright while the film plays — an overlay explaining how
            // to start something already running is just something in the way.
            mode === "playing"
              ? "opacity-0"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          <span className="flex flex-col items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-black/50 backdrop-blur-sm">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="#fff" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="px-2 text-center font-chrome text-[9px] uppercase leading-tight tracking-[0.24em] text-white/85">
              Click · play
              <br />
              Double-click · full screen
            </span>
          </span>
        </span>
      </button>

      <figcaption className="mt-3 flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "min-w-0 font-headline uppercase leading-tight",
            isDotm
              ? "text-base tracking-[0.05em] text-white sm:text-lg"
              : "text-lg font-black tracking-tight text-white sm:text-xl",
          )}
        >
          {slide.title}
        </span>
        <span
          className={cn(
            "shrink-0 font-chrome uppercase",
            isDotm
              ? "text-[9px] tracking-[0.26em] text-white/40"
              : "text-[10px] font-bold tracking-[0.2em] text-[#7dd3fc]",
          )}
        >
          {slide.theme}
        </span>
      </figcaption>
    </motion.figure>
  );
}

/* ── Fullscreen player ──────────────────────────────────────────────────── */

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * The piece at full size, with a real transport.
 *
 * This fills the window rather than calling the browser's Fullscreen API. The
 * wall lives inside a desktop window, and native fullscreen would tear the
 * video out of that frame and hand back browser chrome that the "return to
 * windowed" control could not undo. Filling the panel keeps the exit button
 * meaningful and keeps the desktop illusion intact.
 */
function FullscreenPlayer({
  slide,
  isDotm,
  onClose,
}: {
  slide: StorySlide;
  isDotm: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Escape closes, which every full-screen viewer has taught people to
  // expect — and this one has no browser chrome to offer it for free.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);

  const seek = (fraction: number) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const next = Math.min(duration, Math.max(0, fraction * duration));
    el.currentTime = next;
    setTime(next);
  };

  const accent = isDotm ? "#ff0033" : "#7dd3fc";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${slide.title}, full screen`}
      className="absolute inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <p
            className="font-chrome text-[10px] uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            {slide.theme}
          </p>
          <h3 className="truncate font-headline text-lg uppercase tracking-wide text-white sm:text-xl">
            {slide.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "flex shrink-0 items-center gap-2 px-3 py-2 font-chrome text-[11px] uppercase tracking-[0.16em] transition-colors",
            isDotm
              ? "rounded-full border border-white/25 text-white/80 hover:border-white hover:text-white"
              : "win98-border win98-press bg-persona-surface text-black hover:bg-persona-surface-alt",
          )}
        >
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" aria-hidden="true">
            <path
              d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Exit full screen
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-5">
        <video
          ref={videoRef}
          src={slide.src}
          poster={slide.poster}
          autoPlay
          playsInline
          onClick={toggle}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            // Autoplay is frequently only granted muted. Reading the element's
            // own state rather than assuming keeps the mute button telling the
            // truth about what the visitor is hearing.
            setMuted(e.currentTarget.muted);
          }}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="max-h-full max-w-full cursor-pointer object-contain"
        />
      </div>

      <div className="shrink-0 px-5 pb-5 pt-3">
        {/* A range input rather than a bespoke bar: draggable, keyboard
            operable and screen-reader labelled without any of it being
            rebuilt by hand. */}
        <input
          type="range"
          min={0}
          max={1000}
          value={duration ? Math.round((time / duration) * 1000) : 0}
          onChange={(e) => seek(Number(e.target.value) / 1000)}
          aria-label="Seek"
          className="w-full cursor-pointer"
          style={{ accentColor: accent }}
        />

        <div className="mt-2 flex items-center gap-3">
          <PlayerButton label={playing ? "Pause" : "Play"} onClick={toggle} isDotm={isDotm}>
            {playing ? (
              <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">
                <rect x="6.5" y="4.5" width="4.2" height="15" rx="1.1" />
                <rect x="13.3" y="4.5" width="4.2" height="15" rx="1.1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </PlayerButton>

          <PlayerButton
            label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const el = videoRef.current;
              if (!el) return;
              el.muted = !el.muted;
              setMuted(el.muted);
            }}
            isDotm={isDotm}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
              {muted ? (
                <path d="m16 9 5 6M21 9l-5 6" strokeLinecap="round" />
              ) : (
                <path d="M16 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" />
              )}
            </svg>
          </PlayerButton>

          <span className="font-chrome text-[11px] tabular-nums tracking-wide text-white/70">
            {clock(time)} / {clock(duration)}
          </span>

          <span className="ml-auto font-chrome text-[10px] uppercase tracking-[0.2em] text-white/35">
            Esc to exit
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function PlayerButton({
  label,
  onClick,
  isDotm,
  children,
}: {
  label: string;
  onClick: () => void;
  isDotm: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        isDotm
          ? "rounded-full border border-white/25 text-white hover:border-white/70 hover:bg-white/10"
          : "win98-border win98-press bg-persona-surface text-black hover:bg-persona-surface-alt",
      )}
    >
      {children}
    </button>
  );
}

export default StoryWall;
