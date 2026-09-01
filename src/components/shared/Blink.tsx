"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";

/**
 * A first-person blink, in one piece or in two.
 *
 * Two lids sweep in from the top and bottom of the viewport, meet, and part
 * again. They sit above everything, so whatever is underneath can change while
 * the eye is shut — which is the entire reason a blink works as a cut rather
 * than as a wipe. Lids close fast and open slow, because a real one does.
 *
 * WHY IT SPLITS. DEV's boot blinks inside a single page: one component closes,
 * holds, and opens, and the screen behind it swaps during the hold. DOTM's two
 * blinks cross a route boundary — `/choose-face` to `/choose-face/dotm`, and
 * that door to `/dotm` — so the closing half and the opening half run in two
 * different documents and cannot be one animation.
 *
 *   mode="full"   close, hold, open. One page. DEV's boot.
 *   mode="close"  close and stay shut. Ends by calling `onDone`, which is
 *                 where the caller navigates.
 *   mode="open"   start shut, part. Mounted by the arriving page.
 *
 * The hold in a split blink is not a keyframe — it is however long the
 * navigation actually takes. That is better than a fixed number: the eye stays
 * closed exactly as long as there is something to hide, on a fast connection
 * and a slow one alike.
 *
 * REDUCED MOTION SKIPS THE ANIMATION BUT NOT THE HANDOVER. `onDone` still
 * fires, immediately — a visitor who asked for less motion still has to be
 * able to reach the other side of the door.
 */

export type BlinkMode = "full" | "close" | "open";

/**
 * How far each lid travels. Past half on purpose: at exactly 50% the two meet
 * on a seam that the compositor can leave a hairline of background showing
 * through, and a one-pixel line of the old screen down the middle of a closed
 * eye is the one artefact nobody misses.
 */
const LID = "52%";

/** DEV's boot blink. Unchanged — this is the number that shipped. */
export const DEV_BLINK_MS = 1150;

/**
 * DOTM's, split across a navigation.
 *
 * Slower than DEV's by about half again, which is the brief: DOTM's doors are
 * deliberate where DEV's boot is brisk. The close is much shorter than the
 * open — an eye shuts far faster than it opens, and the asymmetry is most of
 * what makes this read as a blink instead of a shutter.
 */
export const DOTM_CLOSE_MS = 540;
export const DOTM_OPEN_MS = 1150;

const SHADOW_TOP = "0 14px 34px 14px rgba(0,0,0,0.9)";
const SHADOW_BOTTOM = "0 -14px 34px 14px rgba(0,0,0,0.9)";

/** The vignette that closes with the lids, so vision darkens at the edges first. */
const VIGNETTE =
  "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.85) 100%)";

export function Blink({
  mode = "full",
  durationMs,
  onDone,
  /**
   * Only read by `mode="full"`. Closed by `closeAt` of the way through, held
   * until `holdUntil`, fully open at the end.
   *
   * DOTM's split blink does not use these: its hold is the navigation.
   */
  closeAt = 0.32,
  holdUntil = 0.44,
}: {
  mode?: BlinkMode;
  durationMs: number;
  onDone?: () => void;
  closeAt?: number;
  holdUntil?: number;
}) {
  const reduced = Boolean(useReducedMotion());

  /**
   * `onDone`, exactly once, from whichever source reports first.
   *
   * THE ANIMATION CANNOT BE THE ONLY SOURCE. `onAnimationComplete` is driven
   * by requestAnimationFrame, and browsers suspend rAF outright in a
   * backgrounded tab. A visitor who switched away while the lids were closing
   * would come back to a blink that never finished and a navigation that never
   * fired — stranded on a black screen with no way forward. That is not a
   * hypothetical: the DEV boot hit it on all three of its phase handovers and
   * carries a timer for the same reason.
   *
   * So the animation reports in, and a timer set to the same duration reports
   * in too. The ref makes the second one a no-op, which matters here in a way
   * it does not for a `setPhase` — `onDone` navigates, and navigating twice
   * pushes two entries onto the history stack.
   */
  const fired = useRef(false);
  const finish = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    onDone?.();
  }, [onDone]);

  /**
   * With motion reduced there is no animation to report in, so the handover is
   * made here. An effect rather than a render-time call: `onDone` navigates,
   * and navigating during render is a side effect in a function React is free
   * to call twice and throw away.
   *
   * The 250ms margin on the backstop lets the real animation land first
   * whenever it can, so the timer only ever covers the case where rAF is not
   * running at all.
   */
  useEffect(() => {
    if (reduced) {
      finish();
      return;
    }
    const timer = setTimeout(finish, durationMs + 250);
    return () => clearTimeout(timer);
  }, [reduced, durationMs, finish]);

  if (reduced) return null;

  const seconds = durationMs / 1000;

  const heights =
    mode === "full"
      ? ["0%", LID, LID, "0%"]
      : mode === "close"
        ? ["0%", LID]
        : [LID, "0%"];

  const transition: Transition =
    mode === "full"
      ? {
          times: [0, closeAt, holdUntil, 1],
          duration: seconds,
          ease: ["easeIn", "linear", "easeOut"],
        }
      : { duration: seconds, ease: mode === "close" ? "easeIn" : "easeOut" };

  return (
    <motion.div
      aria-hidden="true"
      /* `fixed`, and above every other layer this app stacks. The DOTM desktop
         puts its dock at z-[200] and the 666 coin at z-[190]; an eyelid that
         any of those can poke through is not an eyelid. */
      className="pointer-events-none fixed inset-0 z-[300]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-x-0 top-0 bg-black"
        initial={{ height: heights[0] }}
        animate={{ height: heights }}
        transition={transition}
        /* The lid that finishes its travel is the one that reports in, so the
           handover lands exactly as the eye reaches the end of its movement. */
        onAnimationComplete={finish}
        style={{ boxShadow: SHADOW_TOP }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-black"
        initial={{ height: heights[0] }}
        animate={{ height: heights }}
        transition={transition}
        style={{ boxShadow: SHADOW_BOTTOM }}
      />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: mode === "open" ? 1 : 0 }}
        animate={{
          opacity:
            mode === "full" ? [0, 1, 1, 0] : mode === "close" ? [0, 1] : [1, 0],
        }}
        transition={{ ...transition, ease: "linear" }}
        style={{ background: VIGNETTE }}
      />
    </motion.div>
  );
}
