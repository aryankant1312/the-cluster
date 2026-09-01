"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Counts from whatever is on screen to the new target, in whichever direction
 * that is.
 *
 * useCountUp is its sibling and runs 0 to target once on mount, which is the
 * right behaviour for a figure that appears and settles. This one is for a
 * figure that is *already showing something* — a cached value painted
 * instantly, then corrected when the live number lands. Counting that from
 * zero again would throw away the thing the cache bought; counting it from
 * the cached figure shows the visitor the delta, which is the only
 * interesting part.
 *
 * It ticks down as readily as up. A follower count that fell is still news.
 *
 * NO DURATION CAP. The duration grows with the size of the change and is
 * never clamped: a change of one is a flick, a change of a million takes its
 * time. It grows logarithmically rather than linearly, because linear means a
 * five-figure jump spends half a minute spinning — which is not a longer
 * animation, it is a broken one.
 *
 *     |delta|         duration
 *           1            ~0.9s
 *         100            ~2.4s
 *      10,000            ~4.2s
 *   1,000,000            ~6.0s
 *
 * Driven by elapsed time read inside requestAnimationFrame rather than by
 * accumulating per-frame increments, so a dropped frame shifts nothing — the
 * value is a pure function of elapsed time and always lands exactly on the
 * target. A timer backstops it, because browsers suspend rAF in a background
 * tab and a visitor returning to one should not find the counter frozen
 * part-way to a figure it already knows.
 */

const BASE_MS = 600;
const PER_DECADE_MS = 900;

/** Unbounded on purpose — see the note above. */
export function countDuration(delta: number): number {
  return BASE_MS + PER_DECADE_MS * Math.log10(1 + Math.abs(delta));
}

/** A tween waiting to run, or in flight. Null when the figure is at rest. */
interface Tween {
  from: number;
  to: number;
}

export function useCountTo(target: number | null): number | null {
  const reduced = useReducedMotion();

  const [value, setValue] = useState<number | null>(target);
  const [tween, setTween] = useState<Tween | null>(null);
  const [lastTarget, setLastTarget] = useState<number | null>(target);
  const frameRef = useRef<number | undefined>(undefined);

  /**
   * Whether a new target needs a tween is decided during render, not in an
   * effect.
   *
   * There is nothing to synchronise with the outside world when the answer is
   * "just show it": no subscription to open, no cache to warm. Landing on the
   * figure here means the very first paint carries it, where an effect would
   * paint the stale value once and correct it a frame later — which, in a
   * component whose entire job is one number, is a visible flicker.
   *
   * This is React's own guidance on adjusting state when a prop changes:
   * https://react.dev/learn/you-might-not-need-an-effect
   */
  if (target !== lastTarget) {
    setLastTarget(target);
    // Nothing on screen yet (the first real figure), reduced motion, or no
    // change at all. Animating up from nothing would be a count-up, and this
    // hook is explicitly not that.
    if (target === null || value === null || reduced || value === target) {
      setValue(target);
      setTween(null);
    } else {
      setTween({ from: value, to: target });
    }
  }

  useEffect(() => {
    if (!tween) return;
    const { from, to } = tween;

    const start = performance.now();
    const duration = countDuration(to - from);
    // easeOutExpo — quick off the mark, with a settle long enough to leave
    // the final digits readable instead of a blur.
    const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(from + (to - from) * ease(t));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    const settle = setTimeout(() => setValue(to), duration + 150);

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      clearTimeout(settle);
    };
  }, [tween]);

  return value;
}
