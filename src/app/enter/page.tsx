"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The front door: the "A DOTM ORIGINAL" title card, then a way in.
 *
 * This used to type a line of copy out word by word. The card says the same
 * thing better, and it says it in the artist's own type rather than the
 * site's.
 *
 * The card is a stark white wordmark on near-black with no colour in it at
 * all, so the control sitting on top of it is drawn the same way — white on
 * black, no red and no glow. The crimson button that used to be here would
 * read as another product's UI pasted onto the film.
 *
 * The button holds one position for the whole sequence rather than appearing
 * at the end. It used to hold that position at 40% opacity until the card
 * finished, which made the one control on the screen look disabled for the
 * length of the title animation — and the visitor who reached for it in that
 * window (most of them; nobody waits out a title card) clicked something that
 * looked dead and gave no sign of having been pressed.
 *
 * SO IT WAKES ON ITS OWN CLOCK, not the film's. `EARLY_WAKE_MS` after mount
 * the button comes to full strength and lights, whatever the card is doing —
 * and pointing at it or tabbing to it wakes it immediately, so it is never
 * stale under a cursor. The card finishing is then a second, smaller beat: it
 * adds the bob and the ripples, which are the nudge for someone who did sit
 * through it.
 *
 * THE CONTROL IS DARK GLASS, AND HAS NO RIM. It was a lens with a lit white
 * edge, and that edge was the problem: a hard bright circle on a black card
 * reads as a sticker applied to the film rather than as a control sitting in
 * it, and it drew the eye harder than the wordmark it was parked beneath.
 *
 * The border is gone — not softened, gone, along with the bright `inset`
 * top-stroke and the outer white drop that were doing the same job by other
 * means. What is left is a disc of blurred, barely-tinted dark glass whose
 * gradient runs *toward* black at its foot, one very soft inner wash for
 * thickness, and a bloom cut to roughly a third of its old strength. The
 * button now sits almost inside the card's own black and is found by its
 * shape, not by its outline.
 *
 * The bloom still breathes rather than blinks, and still arrives with the
 * wake and not with the film — dimming it did not change what it is for.
 *
 * TWO THINGS CARRY THE INVITATION, and neither of them is a word. The
 * "PROCEED" caption is gone — a play triangle inside a ring already says
 * what it does, and a label under it was the third thing on a card that only
 * has two. In its place the button itself does the asking: the glass lens
 * that fills to solid on hover, two ripple rings breathing outward on a
 * staggered offset, and a slow bob. All of it stops dead under
 * `prefers-reduced-motion`.
 *
 * The card and the control are also pushed apart. The wordmark sits on the
 * film's midline and the button used to sit close under it; the film is
 * nudged up in frame and the button dropped, so the gap reads as deliberate
 * space rather than as a control crowding the title.
 */

/** Matches the card's own black, so any letterboxing is invisible. */
const CARD_BLACK = "#0a0a0a";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * How long the button stays quiet before it lights, in ms.
 *
 * Long enough that it is not competing with the wordmark's own entrance,
 * short enough that it is live well before anyone has decided to reach for
 * it. The card itself runs several seconds; this is deliberately a fraction
 * of that.
 */
const EARLY_WAKE_MS = 900;

/**
 * Read as an external store rather than copied into state by an effect: the
 * preference lives in the browser, can change while the page is open, and
 * mirroring it into React would mean a render pass that exists only to catch
 * up with something already known.
 */
function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function EnterPage() {
  const router = useRouter();
  const t = useTranslations("enter");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // Server render: assume motion is fine and let the client correct it.
    () => false,
  );

  /**
   * The button is lit, which is not the same as the card being over.
   *
   * Set on its own timer so it never waits on `onEnded` — a fired event this
   * screen has no guarantee of, since a refused autoplay, a backgrounded tab
   * or a slow network all delay or skip it entirely, and every one of those
   * used to leave the control sitting at 40%.
   */
  const [awake, setAwake] = useState(false);

  /**
   * Reduced motion gets the card's final frame and an immediately live
   * button. The poster is that same frame, so both paths land on an identical
   * screen — only one of them animated to get there.
   */
  const lit = awake || ended || prefersReducedMotion;

  /** The card is genuinely finished, which is what the bob and ripples wait for. */
  const finished = ended || prefersReducedMotion;

  useEffect(() => {
    const timer = setTimeout(() => setAwake(true), EARLY_WAKE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) videoRef.current?.pause();
  }, [prefersReducedMotion]);

  return (
    <main
      className="relative min-h-screen select-none overflow-hidden"
      style={{ backgroundColor: CARD_BLACK }}
    >
      {/* `muted` is not a style choice — an unmuted autoplay is refused by
          every browser, and this file carries no audio track anyway. */}
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        poster="/videos/intro-poster.jpg"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        // If autoplay is refused outright the poster is already the final
        // frame, so a blocked video looks the same as a finished one.
        onError={() => setEnded(true)}
        aria-label="A DOTM Original"
        // Framed a little high on purpose: `object-cover` crops the long
        // axis, and taking that crop from below lifts the wordmark off the
        // midline and opens the gap between it and the button.
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 38%" }}
      />

      {/* A hair of vignette. The card is pure black at its edges, so this only
          has to stop the button's ring floating on nothing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 72%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Parked well below the wordmark. `bottom-[9%]` rather than the old
          14% is half the added distance; the other half comes from the card
          being framed higher above. */}
      <div className="absolute inset-x-0 bottom-[9%] flex flex-col items-center sm:bottom-[11%]">
        <PlayButton
          lit={lit}
          finished={finished}
          onClick={() => router.push("/choose-face")}
          label={t("proceed")}
        />
      </div>

    </main>
  );
}

/**
 * The way in.
 *
 * A rimless lens of dark glass: a blurred, barely-tinted circle carrying one
 * faint highlight off its top edge, so it reads as something sitting in the
 * film rather than as a control pasted over it. At rest it is nearly the
 * card's own black; the white triangle is what locates it.
 *
 * Hover still inverts — but to `white/90` rather than to solid white, because
 * a disc that is almost invisible at rest snapping to pure white is a jump
 * rather than a response.
 *
 * TWO STATES, NOT ONE.
 *
 *   `lit`      — the button is awake and asking. Full opacity, full scale,
 *                lit rim, breathing bloom. Arrives on its own timer a beat
 *                after the page mounts, and immediately on hover or focus.
 *   `finished` — the card has actually played out. Adds the bob and the two
 *                ripple rings on top.
 *
 * Splitting them is the whole point: the invitation cannot be hostage to a
 * five-second title animation, but the nudge would be noise underneath one.
 * Everything in the second state stops dead under `prefers-reduced-motion`;
 * the first is opacity and colour, which that preference does not govern.
 */
function PlayButton({
  lit,
  finished,
  onClick,
  label,
}: {
  lit: boolean;
  finished: boolean;
  onClick: () => void;
  label: string;
}) {
  const reduceMotion = useReducedMotion();

  /**
   * Pointing at the button or tabbing to it wakes it on the spot.
   *
   * Without this, a visitor who moved straight for the control in the first
   * second got no acknowledgement from it at all — the one case the timer
   * cannot cover, because it is the case where the visitor is faster than it.
   */
  const [engaged, setEngaged] = useState(false);
  const awake = lit || engaged;

  const nudging = finished && !reduceMotion;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={nudging ? { y: [0, -7, 0] } : { y: 0 }}
      transition={
        nudging
          ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.4 }
      }
    >
      {/* The bloom. A soft white halo behind the glass, which is what makes
          the lens read as lit rather than merely translucent — glass with no
          light behind it is a smudge. It breathes on a long cycle; under
          reduced motion it simply sits at full strength. */}
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={
          awake
            ? reduceMotion
              ? { opacity: 0.26, scale: 1.1 }
              : { opacity: [0.14, 0.3, 0.14], scale: [1.02, 1.16, 1.02] }
            : { opacity: 0, scale: 1 }
        }
        transition={
          awake && !reduceMotion
            ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.7, ease: "easeOut" }
        }
        className="pointer-events-none absolute h-[4.75rem] w-[4.75rem] rounded-full sm:h-[6.5rem] sm:w-[6.5rem]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 72%)",
          filter: "blur(10px)",
        }}
      />

      {/* Ripples. `pointer-events-none` and `aria-hidden` — they are the
          nudge, never a target. */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={false}
          animate={
            nudging
              ? { opacity: [0.26, 0, 0], scale: [1, 1.75, 1.75] }
              : { opacity: 0, scale: 1 }
          }
          transition={
            nudging
              ? {
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 1.4,
                  times: [0, 0.75, 1],
                }
              : { duration: 0.4 }
          }
          className="pointer-events-none absolute h-[4.75rem] w-[4.75rem] rounded-full border border-white/30 sm:h-[6.5rem] sm:w-[6.5rem]"
        />
      ))}

      {/*
        A PLAIN BUTTON WITH CSS TRANSITIONS, NOT `motion.button`, and that is a
        correctness choice rather than a stylistic one.

        The wake used to be `animate={{ opacity, scale }}`, which framer drives
        from requestAnimationFrame — and a browser suspends rAF outright in a
        backgrounded or non-compositing tab. An entry animation that stalls does
        not merely look wrong: it leaves the element at the value it started
        from, and here that value is the asleep one. The button then sits at
        0.72 looking like a disabled control and never lights, which is exactly
        the "neither does it glow" half of the reported fault. The DOTM door
        documents the same trap about its own fades and reaches for the same
        answer.

        Opacity and transform under a CSS transition run on the compositor and
        arrive whatever the main thread is doing. Hover and press are CSS too,
        rather than framer's `whileHover`/`whileTap`, because those write to the
        same `transform` this element now sets itself — two owners of one
        property is a fight, and the loser is whichever runs second.

        Asleep is 0.72/0.94, not 0.4/0.9. The old resting state was faint enough
        to read as disabled; this reads as a live button that has not been lit
        yet, which is what it is.
      */}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        onMouseEnter={() => setEngaged(true)}
        onFocus={() => setEngaged(true)}
        style={{
          // `saturate` on top of the blur is the difference between frosted
          // plastic and glass: it keeps whatever colour is behind the lens
          // alive through it instead of washing the disc grey.
          backdropFilter: "blur(14px) saturate(150%)",
          WebkitBackdropFilter: "blur(14px) saturate(150%)",
          background:
            "linear-gradient(150deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 42%, rgba(0,0,0,0.30) 100%)",
          // Outer drop, then two inset strokes: a bright one along the top
          // edge where light would catch, and a dimmer one along the bottom
          // where it would wrap. That pair is what gives the disc thickness.
          // No outer drop and no bright top stroke any more. Both were rim:
          // a hard bright line all the way round the disc is exactly the
          // "white boundary" that had to go, and it does not stop being one
          // because it was drawn with `inset` instead of `border`. What is
          // left is a wide, very soft inner wash that gives the glass some
          // thickness without ever resolving into an edge.
          boxShadow: awake
            ? "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -18px 34px -22px rgba(255,255,255,0.30)"
            : "inset 0 1px 0 rgba(255,255,255,0.08)",
          // The wake itself. Written here rather than as a class because the
          // two values are a pair and reading them together is the point.
          opacity: awake ? 1 : 0.72,
        }}
        className={cn(
          "group relative flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-full border-0 text-white sm:h-[6.5rem] sm:w-[6.5rem]",
          "transition-[background-color,color,box-shadow,opacity,transform] duration-[550ms] ease-out",
          "hover:bg-white/90 hover:text-black",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black",
          // Scale lives in classes so hover and press can override the resting
          // value by ordinary CSS precedence rather than by fighting an
          // inline style.
          awake ? "scale-100" : "scale-[0.94]",
          "hover:scale-[1.07] active:scale-[0.94] active:duration-100",
        )}
      >
        {/* The specular sweep — a slim crescent of light across the top of the
            lens. Purely decorative, and it fades out as the disc fills on
            hover so it is not left sitting on solid white. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-90 transition-opacity duration-300 group-hover:opacity-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0) 55%)",
          }}
        />

        <svg
          viewBox="0 0 24 24"
          width={30}
          height={30}
          aria-hidden="true"
          className="relative translate-x-[3px] sm:h-10 sm:w-10"
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))" }}
        >
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      </button>
    </motion.div>
  );
}
