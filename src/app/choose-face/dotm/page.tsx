"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import FuzzyText from "@/components/shared/FuzzyText";
import { SignInIcon } from "@/components/auth/SignInIcon";
import { useAuth, useAuthScope } from "@/components/providers/AuthProvider";
import { Blink, DOTM_CLOSE_MS, DOTM_OPEN_MS } from "@/components/shared/Blink";
import { armBlink, disarmBlink, isBlinkArmed } from "@/lib/blink-gate";

/**
 * THE DOTM DOOR — four beats, in one route.
 *
 *   line    the headline, drawn live under a fuzzy-text treatment
 *   blink   the lids close over it
 *   loader  black, one spinner, nothing else
 *   den     DOTM's DEN — the portrait, the password, the way in
 *
 * WHAT THIS REPLACED. The line used to sit on screen indefinitely while a wax
 * seal appeared over it after four seconds, and signing in there went straight
 * to the desktop. The line is now a title card that hands over on its own, and
 * the asking has a screen of its own to do it on.
 *
 * ONE ROUTE, FOUR PHASES, deliberately — mirroring the DEV boot next door,
 * which runs bios → bounce → blink → login the same way. It also keeps the
 * `/dotm` prefetch below alive across the whole sequence: by the time the DEN
 * is satisfied the desktop's payload is in cache, so the eye opens on a
 * finished desktop rather than a loading one.
 *
 * BLACK, WHITE AND RED, IN THAT ORDER OF AREA. The ground is black, the type
 * is white, and the only red is the bloom behind the headline and the Continue
 * key. Red as an accent is the persona; red as a fill is an alert.
 */

/**
 * The line, and the correction in the middle of it.
 *
 * "Curiosity builds culture" is the sentence you expect; striking `culture`
 * out and putting `cluster` after it is the whole joke, and it only lands if
 * the word being replaced is legible enough to be read first. So the struck
 * word is set at the same size in the same face as the rest — part of the
 * line, not an annotation on it.
 *
 * `LINE` is what a screen reader gets, and it says what the screen means
 * rather than transcribing it: "builds culture cluster" is not a sentence, and
 * a reader has no way to hear a strikethrough.
 */
const LINE = "Curiosity builds Cluster — not culture";

/** Set as three lines, the middle one struck through. */
const LINE_ONE = "CURIOSITY BUILDS";
const LINE_STRUCK = "CULTURE";
const LINE_TWO = "CLUSTER";
/**
 * The same three, as one module-level array so `useHeadlineSize` has a stable
 * dependency. Built inline it would be a fresh array every render, and the
 * measuring effect would re-run — and re-set state — on each one.
 */
const HEADLINE_WORDS = [LINE_ONE, LINE_STRUCK, LINE_TWO] as const;

/**
 * The face, and the room it needs.
 *
 * King rather than Anton: this is the door to DOTM, and the desktop behind it
 * wears King throughout. Arriving on a screen set in one display face and
 * landing on one set in another made the two read as two different sites.
 *
 * `letterSpacing` is passed into the canvas rather than set in CSS because
 * `FuzzyText` measures and draws the word itself, and CSS tracking never
 * reaches inside a canvas.
 */
const HEADLINE_FAMILY = "var(--font-king), var(--font-cinzel-decorative), serif";
/**
 * 3, not 6. Tracking is applied per character inside the canvas, so across
 * thirty characters it was adding roughly ninety pixels to a line that has to
 * fit on one row — width spent on air rather than on letters. King is already
 * an open face and needs less of it than the narrow one it replaced.
 */
const HEADLINE_TRACKING = 3;

/**
 * HOW BIG THE LINE IS — measured against the door, not written down.
 *
 * This was `clamp(0.95rem, 3.6vw, 4.2rem)`, and that had to go for two
 * reasons, one cosmetic and one a genuine bug.
 *
 * THE BUG: a `clamp()` carrying `vw` is not safe inside a canvas. `FuzzyText`
 * forwards whatever it is handed straight into `ctx.font`, and canvas font
 * parsing resolves viewport units against its own idea of the viewport rather
 * than the one the surrounding CSS used. Measured here: the same string
 * resolved to 66.9px on a DOM probe and 46.08px on a canvas at the same
 * moment — a 31% shortfall, invisible because both numbers are plausible and
 * nothing errors. Every measurement anyone took of this line was therefore of
 * a line 31% smaller than the CSS said it was.
 *
 * THE COSMETIC PART: even at its nominal 3.6vw the line covered about
 * two-thirds of the screen, because a fixed `vw` cannot know what it is
 * measuring. A third of that width is chrome rather than letters — each
 * canvas pads itself by `fuzzRange + 20` on both sides so the displaced rows
 * have somewhere to land, and three canvases carry six such margins.
 *
 * So the size is derived instead: measure the three words once at a reference
 * em, add the fixed chrome, and solve for the em that makes the row come out
 * at the width budget. The line then fills the door at every viewport by
 * construction, and on anything wider than a phone cannot wrap — which is what
 * `flex-wrap` below is now a belt-and-braces for rather than the mechanism.
 *
 * The constants that follow are the terms of that budget.
 */

/**
 * How much of the window the *letters* take — not the row.
 *
 * The distinction is the whole point. Sizing the row to 94% of the screen
 * sounds like a full-bleed headline and is not one: the first and last canvas
 * each carry `HEADLINE_FUZZ_MARGIN` of transparent padding at the outer end,
 * so a row at 94% is type at 89% with a hundred pixels of nothing framing it.
 * Aiming at the letters and adding the chrome afterwards puts the type where
 * the number says it is.
 */
const HEADLINE_FILL = 0.94;
/**
 * What `FuzzyText` pads each canvas by on each side, at the `fuzzRange` of 30
 * the canvases below run at: `fuzzRange + 20`. It is room for the displaced
 * rows to land in — seven times more of it than the effect at these
 * intensities can actually use, but it is upstream's arithmetic and this file
 * only needs to know the number, not to argue with it.
 */
const HEADLINE_FUZZ_MARGIN = 50;
/**
 * The second, harder ceiling: a fraction of the width the gutters leave.
 *
 * The letters-based target above can ask for a row wider than the screen —
 * `0.94 × width` plus a hundred pixels of chrome exceeds the width at any
 * viewport under about 1600px. This is what stops it, and it is not 1 because
 * a row sized to exactly its container is one rounding error away from
 * `flex-wrap` deciding it does not fit.
 */
const HEADLINE_SNUG = 0.99;
/** Ceiling on the same figure as a fraction of height, for a short window. */
const HEADLINE_FILL_HEIGHT = 0.3;
/** The em the words are measured at before being scaled to fit. */
const HEADLINE_REFERENCE_EM = 100;
/** Bounds, so a freak viewport cannot produce an absurd em either way. */
const HEADLINE_MIN_EM = 15;
const HEADLINE_MAX_EM = 150;
/**
 * The em below which a one-line fit is no longer worth having, and the line
 * is sized to its widest word and allowed to wrap instead. See the note at
 * the fallback in `useHeadlineSize`.
 */
const HEADLINE_LEGIBLE_EM = 30;
/**
 * Per canvas, the width `FuzzyText` adds that is not letters: its 10px
 * `extraWidthBuffer`, plus a fuzz margin on each side. Changing `fuzzRange` on
 * the canvases below means changing `HEADLINE_FUZZ_MARGIN` with it.
 */
const HEADLINE_CANVAS_CHROME = 10 + 2 * HEADLINE_FUZZ_MARGIN;
/**
 * The `-mx-[2%]` on the struck word gives 4% of the row back at the two joins,
 * so the canvases may total that much more than the row is allowed to be.
 */
const HEADLINE_JOIN_RELIEF = 1.04;
/**
 * `px-3` on the screen the line sits in, both sides — down from `px-6`.
 *
 * A 24px gutter was 24px of real estate on top of the 50px of transparent
 * canvas margin already standing between the type and the window edge. The
 * eye reads that margin as the gutter, so the padding was buying a second one
 * nobody could see. Twelve is what remains as a hard stop.
 *
 * Kept in step with the `px-3` on the container below by hand. There is no
 * mechanism to keep them in step, so changing one means changing the other.
 */
const HEADLINE_GUTTER = 12;

/**
 * How long the headline holds before the lids close on it.
 *
 * Four seconds was the brief for the seal that used to appear here, and it is
 * right for the same reason: long enough to have read the line twice, short
 * enough that nobody wonders whether the page has stopped.
 */
const LINE_MS = 4000;

/** The loader. Long enough to register as a beat, short enough not to nag. */
const LOADER_MS = 2500;

/** Beat before the DEN's key starts asking to be pressed. */
const NUDGE_DELAY_MS = 1500;

/** Characters in the masked password. Matches DEV's seven. */
const PASSWORD_LENGTH = 7;

/**
 * How long after the door is satisfied before it lets a returning visitor
 * through — long enough for the Continue key to visibly come alive first.
 */
const AUTO_CONTINUE_MS = 600;

type Phase = "line" | "blink" | "loader" | "den";

interface Keystroke {
  /** +1 types a character, -1 backspaces one. */
  delta: 1 | -1;
  /** Wait before this stroke lands, in ms. */
  delay: number;
}

/**
 * The em that makes the three words fill the door.
 *
 * Returns null until it has measured, and the line renders nothing until it
 * has: a canvas cannot be re-sized without being redrawn, so a first pass at a
 * guessed size would be a visible jump rather than a saved frame. There is
 * nothing to see in that gap — `FuzzyText` awaits `document.fonts.load` before
 * its own first paint, so the canvases are blank for longer than this anyway.
 *
 * MEASURED IN THE SAME PLACE THE DRAWING HAPPENS. The family is resolved off a
 * probe element rather than passed as the `var(--font-king)` custom property,
 * for the reason `FuzzyText` resolves `inherit` the same way: a 2D context
 * cannot parse a CSS variable, and handing it one silently leaves the context
 * on its 10px sans-serif default.
 *
 * Re-measures on resize and once fonts have settled. The second is the one
 * that matters — measured against a fallback serif the words come out roughly
 * a quarter narrower than King draws them, which would size the line to fit a
 * screen wider than the one it is on.
 */
function useHeadlineSize(words: readonly string[]): number | null {
  const [size, setSize] = useState<number | null>(null);

  useEffect(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const probe = document.createElement("span");
      probe.style.fontFamily = HEADLINE_FAMILY;
      document.body.appendChild(probe);
      const family = getComputedStyle(probe).fontFamily || "serif";
      document.body.removeChild(probe);

      ctx.font = `400 ${HEADLINE_REFERENCE_EM}px ${family}`;

      /**
       * How wide the row of canvases is allowed to come out.
       *
       * Two candidates, and the smaller wins. The first aims the *letters* at
       * `HEADLINE_FILL` of the window and adds the two outer fuzz margins back
       * on top, because those are part of the row's width and none of its
       * picture. The second is the width the gutters actually leave, shaved by
       * `HEADLINE_SNUG` so the row is never within a rounding error of the
       * container it has to fit inside.
       *
       * On a wide screen the second binds and the row runs nearly gutter to
       * gutter; on a narrow one the first would have asked for a row wider
       * than the window, which is exactly what the second exists to refuse.
       */
      const available = Math.min(
        HEADLINE_FILL * window.innerWidth + 2 * HEADLINE_FUZZ_MARGIN,
        HEADLINE_SNUG * (window.innerWidth - HEADLINE_GUTTER * 2),
      );

      /**
       * The em at which `group` fills the width budget above.
       *
       * Split into `scaling` — the letters, which grow with the em — and
       * `fixed` — the tracking and the canvas chrome, which do not. Only the
       * first is what the em multiplies, and folding the two together is what
       * makes a naive "scale until it fits" loop overshoot on a narrow screen.
       *
       * `relief` is 1 for a single canvas and `HEADLINE_JOIN_RELIEF` for the
       * whole row, because the negative margins that buy that relief only
       * exist where two canvases meet.
       */
      const solve = (group: readonly string[], relief: number) => {
        let scaling = 0;
        let fixed = 0;
        for (const word of group) {
          const chars = Array.from(word);
          for (const ch of chars) scaling += ctx.measureText(ch).width;
          fixed += HEADLINE_TRACKING * (chars.length - 1) + HEADLINE_CANVAS_CHROME;
        }
        if (scaling <= 0) return null;
        return (HEADLINE_REFERENCE_EM * (relief * available - fixed)) / scaling;
      };

      const oneLine = solve(words, HEADLINE_JOIN_RELIEF);
      if (oneLine === null) return;

      /**
       * BELOW ROUGHLY 870px WIDE, ONE LINE STOPS BEING WORTH IT.
       *
       * The three canvases carry 330px of fuzz margin between them whatever
       * size the type is set at, so on a phone the chrome alone eats most of
       * the width and solving for one row drives the em to its floor — 15px,
       * a headline you cannot read, laid out on the two rows `flex-wrap` gives
       * it anyway once the arithmetic has gone negative.
       *
       * So past that point the line stops pretending. It is sized to the
       * widest single word instead, which guarantees no row overflows however
       * the wrap falls, and the same words arrive at about 28px on a 420px
       * screen rather than 15. The wrap is the same wrap; the difference is
       * that it is now the plan rather than the failure mode.
       */
      let byWidth = oneLine;
      if (oneLine < HEADLINE_LEGIBLE_EM) {
        const widest = [...words].sort((a, b) => b.length - a.length)[0];
        byWidth = Math.max(oneLine, solve([widest], 1) ?? oneLine);
      }

      // A line sized purely to the width becomes a banner on a laptop turned
      // on its side. The cap keeps it type.
      const byHeight = window.innerHeight * HEADLINE_FILL_HEIGHT;
      const next = Math.round(
        Math.max(HEADLINE_MIN_EM, Math.min(HEADLINE_MAX_EM, byWidth, byHeight)),
      );
      setSize((prev) => (prev === next ? prev : next));
    };

    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [words]);

  return size;
}

/**
 * A password typed by a person rather than by an interval timer: strokes
 * arrive in bursts broken by hesitations, and one character too many gets
 * typed near the end and immediately backspaced.
 *
 * Same shape as the DEV boot's own routine. The two doors are meant to feel
 * like the same hand typing.
 */
function humanKeystrokes(length: number): Keystroke[] {
  const strokes: Keystroke[] = [];
  const fumbleAt = Math.max(1, Math.floor(length * 0.7));

  for (let i = 0; i < length; i++) {
    const burst = Math.random() < 0.45;
    strokes.push({
      delta: 1,
      delay: burst ? 55 + Math.random() * 45 : 115 + Math.random() * 135,
    });
    if (i === fumbleAt) {
      strokes.push({ delta: 1, delay: 65 + Math.random() * 55 });
      strokes.push({ delta: -1, delay: 250 + Math.random() * 220 });
    }
  }
  return strokes;
}

export default function DotmEntryPage() {
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const headlineSize = useHeadlineSize(HEADLINE_WORDS);
  const { user, loading } = useAuth();
  // This screen is the DOTM door. Tell the auth provider so, or it has no way
  // of knowing which of the two sessions to read.
  useAuthScope("dotm");

  const [phase, setPhase] = useState<Phase>("line");
  const [password, setPassword] = useState("");

  /**
   * THE SESSION IS THE WHOLE GATE NOW. See the matching note on the DEV door.
   *
   * A module-scope flag used to sit beside `user`, reset by every document
   * load, and a valid thirty-day session did not satisfy it on its own. A
   * signed-in visitor who reloaded found Continue greyed out and had to go
   * back out to Google to earn a flag they had already earned — one more round
   * trip per reload, for ever. That is the loop, and it is gone.
   */

  /**
   * The eye opening onto this screen, if a door was just walked through.
   *
   * Read during render rather than in an effect: an effect resolves one frame
   * after the first paint, and one frame here is a flash of the headline
   * before the lids arrive to cover it. `isBlinkArmed` is a peek and is safe
   * to call twice, which a `useState` initializer will do under StrictMode;
   * spending the flag is the effect's job.
   */
  const [opening, setOpening] = useState(() => isBlinkArmed());
  useEffect(() => {
    disarmBlink();
  }, []);

  /** Set while the lids are closing on the way to the desktop. */
  const [leaving, setLeaving] = useState(false);

  const enter = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
  }, [leaving]);

  const land = useCallback(() => {
    armBlink();
    router.push("/dotm");
  }, [router]);

  /**
   * Warm the desktop while the visitor is reading the line.
   *
   * Only the route and the wallpaper. The desktop's windows are deliberately
   * code-split (see the note at the top of `(persona)/dotm/page.tsx`), and
   * pulling them in here would undo the split that made the desktop fast to
   * open — the visitor would wait for the Leaflet map and the constellation
   * sky before seeing a wallpaper.
   */
  useEffect(() => {
    router.prefetch("/dotm");

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/images/dotm/wallpaper-0001.jpg";
    document.head.appendChild(link);
    return () => link.remove();
  }, [router]);

  /**
   * The clock that walks the sequence forward.
   *
   * The blink also advances on its own animation finishing, for the reason the
   * DEV boot documents at length: lid animations are driven by
   * requestAnimationFrame, which browsers suspend outright in a backgrounded
   * tab, and a visitor who switched away mid-sequence came back to a beat that
   * would never end. Whichever arrives first moves the phase on; the second is
   * a no-op, because setting a phase to the value it already holds changes
   * nothing.
   */
  useEffect(() => {
    if (phase === "line") {
      const t = setTimeout(() => setPhase("blink"), reduced ? 1200 : LINE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "blink") {
      const t = setTimeout(() => setPhase("loader"), DOTM_OPEN_MS + 250);
      return () => clearTimeout(t);
    }
    if (phase === "loader") {
      const t = setTimeout(() => setPhase("den"), reduced ? 900 : LOADER_MS);
      return () => clearTimeout(t);
    }
  }, [phase, reduced]);

  /**
   * The password types itself once the DEN is on screen.
   *
   * It is theatre, and it is honest theatre: the field is not an input, has no
   * name, and nothing is submitted from it. What opens the door is the key in
   * the corner. The dots are the costume this persona wears while asking — the
   * same costume DEV's XP screen wears next door.
   */
  useEffect(() => {
    if (phase !== "den") return;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPassword("•".repeat(PASSWORD_LENGTH));
      return;
    }

    const strokes = humanKeystrokes(PASSWORD_LENGTH);
    let count = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = (i: number) => {
      if (cancelled || i >= strokes.length) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        count += strokes[i].delta;
        setPassword("•".repeat(count));
        step(i + 1);
      }, strokes[i].delay);
    };

    timer = setTimeout(() => step(0), 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, reduced]);

  /**
   * A signed-in visitor is let through.
   *
   * This used to require a second flag beside `user`, so that only somebody
   * who had come through a door earlier in the same page load was carried on
   * automatically and everybody else was made to press Continue. That reading
   * did not survive contact with Google: the flag never outlived the round
   * trip in any way that helped, and what it produced was a signed-in visitor
   * being asked to sign in again. The session is the answer, so `user` is the
   * condition.
   *
   * The beat before it fires is still there. `AUTO_CONTINUE_MS` lets the
   * Continue key visibly come alive before the screen moves, so the door is
   * seen to open rather than simply being gone.
   */
  useEffect(() => {
    if (phase !== "den" || loading || !user) return;
    const t = setTimeout(enter, AUTO_CONTINUE_MS);
    return () => clearTimeout(t);
  }, [phase, loading, user, enter]);

  return (
    /* `boot-dotm-fonts`: this door sets its own type rather than reading the
       persona cookie, which says where the visitor last *was* and defaults to
       DEV. See the block in `globals.css`.

       `fixed inset-0`, NOT `relative min-h-screen` — this door does not
       scroll, and the difference is what put two scrollbars on the DEN.

       `min-h-screen` is `min-height: 100vh`, and `100vh` is measured against
       the viewport *including* any scrollbar gutter. So the moment anything
       overflowed sideways by a pixel — the sign-in key's nudge ring expands to
       scale(2.1) five pixels from the right edge — a horizontal bar appeared,
       took ~15px off the usable height, and left the 100vh block taller than
       the space remaining. That produced a vertical bar, which took ~15px off
       the width, which fed the first one. Two bars, one root cause, and
       `overflow-hidden` on this element could not stop either: it clips this
       box's children, and the box being too tall for the document is not a
       child.

       Taken out of flow, there is nothing left in the document for the
       document to scroll, whatever happens inside. Fixed is also the more
       honest description of what every phase here is: a full-bleed screen the
       size of the window, four of them in sequence. */
    <main className="boot-dotm-fonts fixed inset-0 overflow-hidden bg-black">
      {/*
        NO `AnimatePresence`, AND NO EXIT ANIMATIONS. Both were tried here and
        both were wrong, in two different ways.

        First a single `<AnimatePresence mode="wait">` wrapped all three
        phases. `mode="wait"` holds the incoming child until the outgoing one
        reports its exit finished, the headline's exit never reported, and the
        sequence sat on "Curiosity builds Cluster" for ever — the phase state
        advanced on schedule and the screen never moved.

        Then one presence per phase. That unblocked the sequence and produced
        the same root fault wearing a different costume: the headline's exit
        still never completed, so it simply stayed mounted, and the DEN faded
        up *underneath the headline* with both on screen at once.

        The cause both times is the exiting subtree, whose two `FuzzyText`
        canvases run their own rAF loop and never settle. The fix is to stop
        asking it to animate out at all. Nothing is lost: the eye closes over
        this screen, and a cross-fade behind a pair of eyelids is a fade nobody
        can see. Entry animations need no presence component — only exits do —
        so the whole mechanism goes.
      */}
      {phase === "line" && (
          <div
            className="absolute inset-0 flex items-center justify-center px-3"
          >
            {/* The bloom the intro rings used to supply. A single soft red
                ellipse behind the type, so the words sit in the persona's
                light rather than on a flat black rectangle. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 58% 42% at 50% 50%, rgba(180,0,26,0.30) 0%, rgba(120,0,18,0.12) 46%, transparent 74%)",
              }}
            />

            {/*
              `aria-hidden`, with the real line carried by the `sr-only`
              heading below: the canvases already expose an accessible name
              each, and a screen reader announcing two image labels and a
              heading would read the same sentence three times.

              The font is set here rather than on the canvases. `FuzzyText`
              resolves `fontFamily: "inherit"` through `getComputedStyle`,
              which is what turns the `--font-anton` custom property into the
              real family name next/font generated — passing the variable
              straight to canvas would hand the 2D context a string it cannot
              parse.
            */}
            {/* Nothing until the line has been measured — see
                `useHeadlineSize` for why a first pass at a guessed em would be
                a visible jump rather than a saved frame. */}
            {headlineSize !== null && (
            <div
              aria-hidden="true"
              /* ONE LINE, with `flex-wrap` as the safety net rather than the
                 intent. The em is now solved from the width available (see
                 `HEADLINE_FILL`), so the row fits by construction and this
                 catches only the case the arithmetic cannot: a viewport so
                 narrow that `HEADLINE_MIN_EM` is the binding constraint.
                 `items-baseline` sits the three canvases on a shared line
                 rather than centring them on one another, so the struck word
                 lines up with its neighbours instead of floating between
                 them. */
              /* `gap-x-0`, with the spacing between words coming from the
                 canvases' own fuzz margins instead. Adding a flex gap on top
                 of those margins is what made the two joins around CULTURE
                 look like double spaces. */
              className="relative flex flex-wrap items-baseline justify-center gap-x-0 gap-y-1"
              style={{
                fontFamily: HEADLINE_FAMILY,
                filter: "drop-shadow(0 0 22px rgba(255,34,68,0.45))",
              }}
            >
              <FuzzyText
                fontSize={headlineSize}
                fontWeight={400}
                color="#ffffff"
                baseIntensity={0.16}
                hoverIntensity={0.46}
                letterSpacing={HEADLINE_TRACKING}
                className="h-auto max-w-full"
              >
                {LINE_ONE}
              </FuzzyText>

              {/*
                CULTURE, struck out.

                THE WORD FUZZES WITH THE OTHER TWO because it is the same
                component with the same settings — one more `FuzzyText`, not a
                styled span, so it shares the face, the size, the tracking and
                the per-frame row displacement rather than merely resembling
                them.

                THE RULE THROUGH IT IS A SIBLING, NOT PART OF THE CANVAS. There
                is no strikethrough inside a canvas: `fillText` draws glyphs
                and nothing else, and the combining-overlay character that
                would fake one is not in this face — it would fall back to
                whatever font on the machine does have it, at that font's
                weight, on one word of a headline. A bar drawn over the top is
                the same rule at the same weight every time.

                It holds still while the letters shiver underneath, which is
                right: a struck word is struck once. A line that shook with the
                text would read as part of the noise instead of as an edit.
              */}
              {/* `-mx-[2%]` closes the two joins either side of the struck
                  word. FuzzyText pads each canvas horizontally so the
                  displaced rows have somewhere to go, and three canvases in a
                  row therefore carry six such margins — the two that meet
                  around CULTURE read as a double space beside the single one
                  inside "CURIOSITY BUILDS". A percentage rather than a fixed
                  pixel value, so it scales with the clamped font size instead
                  of over-correcting on a small viewport. */}
              <span className="relative -mx-[2%] inline-flex">
                <FuzzyText
                  fontSize={headlineSize}
                  fontWeight={400}
                  color="#ffffff"
                  baseIntensity={0.16}
                  hoverIntensity={0.46}
                  letterSpacing={HEADLINE_TRACKING}
                  className="h-auto max-w-full"
                >
                  {LINE_STRUCK}
                </FuzzyText>
                <span
                  aria-hidden="true"
                  /* Inset from the canvas edges, which carry the margin the
                     fuzz displaces into — a rule spanning the full element
                     would overhang the word at both ends. */
                  className="pointer-events-none absolute left-[7%] right-[7%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white sm:h-[5px] lg:h-[7px]"
                  style={{ boxShadow: "0 0 12px rgba(255,34,68,0.55)" }}
                />
              </span>

              <FuzzyText
                fontSize={headlineSize}
                fontWeight={400}
                color="#ffffff"
                baseIntensity={0.16}
                hoverIntensity={0.46}
                letterSpacing={HEADLINE_TRACKING}
                className="h-auto max-w-full"
              >
                {LINE_TWO}
              </FuzzyText>
            </div>
            )}

            {/* The line, for anyone who cannot watch it arrive. */}
            <h1 className="sr-only">{LINE}</h1>
          </div>
        )}

      {/*
        THE TWO REMAINING FADES ARE CSS, NOT FRAMER, and that is a correctness
        choice rather than a stylistic one.

        Framer drives an entry animation from `requestAnimationFrame`, which a
        browser suspends outright in a backgrounded or non-compositing tab. An
        *exit* that stalls leaves something on screen too long; an entry that
        stalls leaves it permanently invisible — the DEN was caught mid-fade at
        opacity 0.21 and stayed there, which is a login screen nobody can read.
        A CSS keyframe runs on the compositor and finishes regardless.

        Same reasoning the DEV boot gives for backstopping its phase handovers
        with timers, applied one layer down.
      */}
      {phase === "loader" && (
          <div
            className="dotm-fade-in absolute inset-0 flex items-center justify-center bg-black"
          >
            <Spinner />
            <span className="sr-only" role="status">
              Loading
            </span>
          </div>
        )}

      {phase === "den" && (
          /* `overflow-hidden`, where this used to say `overflow-y-auto`. The
             scroller was the second half of the scrollbar problem the `<main>`
             note above describes: with a horizontal bar stealing height from
             the viewport, the `min-h-screen` card inside no longer fitted, and
             `auto` duly offered a bar to reach the two pixels it had lost.
             There is nothing here worth scrolling to — a portrait, a name, a
             field and a button, and they are centred rather than stacked. */
          <div className="dotm-fade-in absolute inset-0 overflow-hidden bg-black">
            <Den
              password={password}
              unlocked={Boolean(user)}
              onContinue={enter}
              onSignedIn={enter}
            />
          </div>
        )}

      {/* The eye parting onto this screen, carried over from the sofa. */}
      {opening && (
        <Blink mode="open" durationMs={DOTM_OPEN_MS} onDone={() => setOpening(false)} />
      )}

      {/* The lids closing over the headline and opening on the loader. */}
      {phase === "blink" && (
        <Blink mode="full" durationMs={DOTM_OPEN_MS} onDone={() => setPhase("loader")} />
      )}

      {/* And shutting again on the way to the desktop. */}
      {leaving && <Blink mode="close" durationMs={DOTM_CLOSE_MS} onDone={land} />}
    </main>
  );
}

/**
 * DOTM'S DEN — the sign-in card.
 *
 * The shape is the one every platform login has settled on, because it works:
 * a mark, a name, a field, a primary action, one alternative. What makes it
 * this site's is what fills those slots — a photograph instead of an app icon,
 * a password that types itself, and a key in the corner that is the only thing
 * on screen which actually does anything.
 *
 * THE FIELD IS NOT AN INPUT. It has no `name`, nothing is submitted from it,
 * and no keystroke a visitor makes reaches it. Making it a real input would be
 * a lie about where the credential goes — and the credential goes to Google.
 */
function Den({
  password,
  unlocked,
  onContinue,
  onSignedIn,
}: {
  password: string;
  unlocked: boolean;
  onContinue: () => void;
  onSignedIn: () => void;
}) {
  return (
    /* `h-full`, not `min-h-screen`. The parent is already exactly the viewport
       — it is `absolute inset-0` inside a `fixed inset-0` main — so filling it
       is the same instruction without the second, independent measurement of
       the screen that disagreed with the first by a scrollbar's width.
       `py-10` rather than `py-16` buys back 48px of headroom, which is what a
       fixed card gives up in exchange for never scrolling: the stack is about
       350px tall, so it now centres cleanly down to roughly a 430px-tall
       window instead of 480px. */
    <div className="relative flex h-full flex-col items-center justify-center px-6 py-10">
      {/* The key, top right — where the seal used to be, and where this
          persona has always put the way in. */}
      <SignInIcon skin="dotm" onSignedIn={onSignedIn} nudgeDelayMs={NUDGE_DELAY_MS} />

      <div className="flex w-full max-w-[320px] flex-col items-center">
        {/* The photograph, where an app icon would be. Square, and the same
            160px square the DEV door's user tile is — the two doors ask the
            same question and should ask it at the same scale.

            It was a 3:4 portrait filling the full 320px column, which made it
            twice the height of DEV's tile and the loudest thing on the screen:
            the picture read as the subject and the sign-in as a caption under
            it. At 1:1 it sits as a mark above the field, which is what it is.

            `object-cover` still does the cropping, so the source file needs no
            re-export — the square simply takes the middle of the frame. The
            hairline stays: a picture with no edge on a black ground floats. */}
        <div className="relative h-40 w-40 overflow-hidden rounded-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
          <Image
            src="/images/dotm/den-portrait.jpg"
            alt=""
            fill
            priority
            sizes="160px"
            className="object-cover"
          />
        </div>

        <h1 className="mt-5 font-headline text-2xl uppercase tracking-[0.16em] text-white">
          DOTM&apos;s DEN
        </h1>

        {/* The password, typing itself. Circles rather than bullet characters:
            a bullet in a display face is a small speck, and these have to read
            as masked characters rather than as dirt on the screen. */}
        <div
          aria-hidden="true"
          className="mt-6 flex h-12 w-full items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-4"
        >
          {Array.from({ length: password.length }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 620, damping: 24 }}
              className="block h-2 w-2 shrink-0 rounded-full bg-white/85"
            />
          ))}
          <span className="caret-blink block h-4 w-[2px] shrink-0 bg-white/70" />
        </div>

        {/*
          Continue.

          Disabled rather than hidden until there is a session behind it: the
          button is part of the screen's shape, and removing it would leave a
          gap exactly where the visitor is looking. Greyed is what a login
          screen does to say "not yet".

          `title` carries the reason, because a disabled control that does not
          say why it is disabled is just a broken one.
        */}
        <button
          type="button"
          onClick={onContinue}
          disabled={!unlocked}
          title={unlocked ? "Continue" : "Sign in first — the key is top right"}
          className="mt-5 h-11 w-full rounded-lg bg-[#c8102e] font-chrome text-sm uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#e11d38] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-[#3a1017] disabled:text-white/35"
        >
          Continue
        </button>

        {/* The line that used to sit here — "Use the key in the corner to sign
            in with Google" — is gone. The key nudges for itself, and the
            disabled Continue already carries the same sentence in its `title`
            for anyone who reaches for the wrong control first. */}
      </div>
    </div>
  );
}

/**
 * The loader — a ring of tapering spokes, rotating in steps.
 *
 * Stepped rather than smooth (`steps(12)`), which is what the platform spinner
 * it is modelled on does: the eye reads a stepped rotation as a mechanism
 * working and a smooth one as a decoration turning.
 *
 * A CSS animation rather than a motion component, so it runs on the compositor
 * and keeps turning while the main thread is busy doing the work that made a
 * loader necessary in the first place.
 */
function Spinner() {
  return (
    <svg
      viewBox="0 0 40 40"
      width={28}
      height={28}
      aria-hidden="true"
      style={{ animation: "dotm-spin 1s steps(12) infinite" }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x="19"
          y="4"
          width="2"
          height="9"
          rx="1"
          fill="#ffffff"
          opacity={0.15 + (i / 11) * 0.85}
          transform={`rotate(${i * 30} 20 20)`}
        />
      ))}
    </svg>
  );
}
