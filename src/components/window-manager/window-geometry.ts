import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Shared geometry for both persona window shells and the free-floating
 * desktop furniture.
 *
 * Centring is done with `top/left: 50%` plus a negative margin rather than a
 * `translate(-50%,-50%)` transform, because framer-motion owns the transform
 * property while a window is being dragged — a centring transform would be
 * overwritten on the first drag and the window would jump.
 */

/**
 * Half of a CSS length, negated, for margin-based centring.
 *
 * Returns `null` when the length cannot be resolved here — an `undefined`
 * height, or a unit this does not parse. Callers must then measure the
 * element instead: falling back to 0 would pin the element's *top* edge to
 * the midline and let it hang off the bottom of the screen, which is exactly
 * what happened to every window that did not declare a height.
 */
export function negativeHalf(value: number | string | undefined): string | number | null {
  if (value === undefined) return null;
  // Numeric widths are plain pixels. The previous DevWindow-local version
  // returned 0 here, which quietly left every fixed-width window uncentred.
  if (typeof value === "number") return -value / 2;

  const match = value.match(/^(-?[\d.]+)(vw|vh|%|px|rem|em)$/);
  if (!match) return null;
  return `-${parseFloat(match[1]) / 2}${match[2]}`;
}

/**
 * Height of the DOTM dock / DEV taskbar plus a little breathing room.
 * Draggable desktop furniture uses this as a floor so nothing can be parked
 * underneath the bar and become unreachable.
 */
export const BOTTOM_BAR_SAFE_AREA = 104;

/**
 * Fallback ceiling, used until the top bar has actually been measured.
 *
 * This was 8 — a number that described a gap, not a bar. The persona top bar
 * is a `sticky top-0 z-40` header around 57px tall, and window shells render
 * at `z-index: 100`, so a filled window was drawn straight over it: the
 * countdown and the persona toggle disappeared underneath the moment one
 * opened. `useTopBarInset` measures the real thing; this is only what to use
 * before that first measurement lands.
 */
export const TOP_BAR_SAFE_AREA = 64;

/** Breathing room between the bottom of the top bar and a filled window. */
const TOP_BAR_GAP = 8;

/**
 * The real height of the persona top bar, plus a gap.
 *
 * Measured rather than hard-coded because the bar has no fixed height in CSS:
 * it is padding plus content, the two personas set it in different typefaces,
 * and a machine that has not finished loading those fonts disagrees with both.
 *
 * Runs on every render, guarded by an equality check — the same idiom
 * `useCenterOffsets` below uses, and for the same reason: the bar's height
 * changes with the countdown inside it, and no dependency array captures that.
 */
export function useTopBarInset(): number {
  const [inset, setInset] = useState(TOP_BAR_SAFE_AREA);

  // Same shape as `useCenterOffsets` below: an inline effect with no
  // dependency list, made safe by the equality guard rather than by a
  // dependency that does not exist.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const bar = document.querySelector<HTMLElement>(".persona-topbar");
    if (!bar) return;
    const height = bar.getBoundingClientRect().height;
    if (height <= 0) return;
    const next = Math.round(height) + TOP_BAR_GAP;
    // The bar is outside React's tree — its height is external state, and
    // this is the subscription. The equality check means a settled bar sets
    // nothing, so there is no cascade to guard against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInset((prev) => (prev === next ? prev : next));
  });

  return inset;
}

/**
 * Where an element sits with every transform undone: its *layout* box.
 *
 * THIS IS THE FIX FOR A BUG THAT AFFECTED EVERY DRAGGABLE THING ON BOTH
 * DESKTOPS. framer-motion expresses `dragConstraints` as offsets from an
 * element's layout position and keeps the drag itself in a CSS transform. So
 * a bounds object built from `getBoundingClientRect()` — which reports where
 * the element is *now*, transform included — double-counts every pixel the
 * element has already been dragged. Park the vault coin 300px left and its
 * left limit is recomputed as though it had started there, taking 300px off
 * how much further left it may go. Each grab shrinks the reachable area
 * again, and from the visitor's side an invisible wall closes in.
 *
 * `m41`/`m42` of the computed transform are exactly the translation to
 * subtract. Size comes from `offsetWidth`/`offsetHeight` rather than from the
 * rect, so a `whileDrag` scale — the coin grows 6% while held — cannot leak
 * into the limits either.
 */
function layoutBox(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const t = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  // Default `transform-origin` is the centre, so a scale leaves the centre
  // where it is and only the translation moves it.
  const cx = (rect.left + rect.right) / 2 - t.m41;
  const cy = (rect.top + rect.bottom) / 2 - t.m42;
  const halfW = el.offsetWidth / 2;
  const halfH = el.offsetHeight / 2;
  return {
    left: cx - halfW,
    top: cy - halfH,
    right: cx + halfW,
    bottom: cy + halfH,
  };
}

/**
 * Drag bounds for a window shell: the viewport, less the top bar and less a
 * strip along the bottom wide enough to keep the dock or taskbar clear.
 *
 * In the coordinate space framer-motion expects — offsets from the element's
 * laid-out position, not viewport coordinates — and measured from the layout
 * box, so the limits are the same on the tenth grab as on the first.
 */
export function desktopDragBounds(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return undefined;
  const box = layoutBox(el);
  return {
    left: -box.left,
    top: TOP_BAR_SAFE_AREA - box.top,
    right: window.innerWidth - box.right,
    bottom: window.innerHeight - BOTTOM_BAR_SAFE_AREA - box.bottom,
  };
}

/**
 * Drag bounds for small desktop furniture, which is allowed the whole screen.
 *
 * A window is a large rectangle and reserving a strip along the bottom for it
 * is the right call — a window pushed under the dock is a window you cannot
 * read. A coin is not: it is 80px across, and a full-width floor put the
 * entire bottom of the desktop off limits even at the far left corner, where
 * the dock is nowhere near. The bottom bar is two floating pills with a great
 * deal of empty desktop either side of them, and `pushOutOfObstacles` below is
 * how that space is handed back.
 *
 * The top bar stays a hard ceiling. It is the one piece of chrome the coin
 * would actually cover — the coin sits at `z-[190]` and the bar at `z-40` —
 * and losing the countdown and the persona toggle behind it is not a trade
 * worth making.
 */
export function desktopFreeBounds(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return undefined;
  const box = layoutBox(el);
  const field = desktopField();
  return {
    left: field.left - box.left,
    top: field.top - box.top,
    right: field.right - box.right,
    bottom: field.bottom - box.bottom,
  };
}

/**
 * The rectangle small desktop furniture is allowed to occupy: the viewport,
 * with the top bar taken off the top.
 *
 * Shared by the bounds above and the obstacle push below, because the two have
 * to agree. They did not, at first, and the disagreement had teeth — see the
 * note in `pushOutOfObstacles`.
 */
function desktopField() {
  const bar = document.querySelector<HTMLElement>(".persona-topbar");
  return {
    left: 0,
    top: bar ? bar.getBoundingClientRect().bottom : TOP_BAR_SAFE_AREA,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
}

/**
 * The bottom-bar furniture, as rectangles to steer around.
 *
 * Marked in the DOM with `data-desktop-obstacle` rather than listed here by
 * selector: the dock and its tray own their own geometry — one is centred and
 * grows with its icons, the other is pinned right and grows with the clock —
 * and a hard-coded guess at either would be wrong the first time one of them
 * gained an item. Read fresh on each drag frame, so a dock magnifying under
 * the pointer is honoured at the size it currently is.
 */
export function desktopObstacleRects(): DOMRect[] {
  if (typeof document === "undefined") return [];
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-desktop-obstacle]"),
  ).map((el) => el.getBoundingClientRect());
}

/** Breathing room between a dragged item and an obstacle it is pushed off. */
const OBSTACLE_MARGIN = 8;

/**
 * Nudge a dragged item clear of the bottom-bar furniture.
 *
 * Returns the correction to add to the current drag offset, or null when the
 * item is already clear. The push runs along whichever way out is shortest, so
 * the coin slides around the dock's flank when it arrives from the side and
 * rides over its top edge when it comes down from above — which is what a
 * physical object would do, and so needs no explaining.
 *
 * A rectangle constraint cannot express this: `dragConstraints` is one box,
 * and "anywhere except these two islands" is not a box.
 *
 * ESCAPES THAT LEAVE THE SCREEN ARE NOT ESCAPES. The dock sits within a coin's
 * height of the bottom of the viewport, so "down" is frequently the shortest
 * way out of it on paper and always the wrong one in practice: it puts the
 * coin below the floor, where `desktopFreeBounds` immediately drags it back
 * into the dock it was just pushed out of, and the two corrections fight each
 * other for as long as the pointer is held. Candidate directions are checked
 * against the same field the bounds use, and one that would end up out of it
 * is discarded before the shortest is chosen.
 */
export function pushOutOfObstacles(
  el: HTMLElement | null,
): { dx: number; dy: number } | null {
  if (!el || typeof window === "undefined") return null;
  const rect = el.getBoundingClientRect();
  const field = desktopField();

  for (const ob of desktopObstacleRects()) {
    const left = ob.left - OBSTACLE_MARGIN;
    const right = ob.right + OBSTACLE_MARGIN;
    const top = ob.top - OBSTACLE_MARGIN;
    const bottom = ob.bottom + OBSTACLE_MARGIN;

    const overlapping =
      rect.right > left && rect.left < right && rect.bottom > top && rect.top < bottom;
    if (!overlapping) continue;

    // The four ways out, each as the offset that breaks contact along it.
    const candidates = [
      { dx: left - rect.right, dy: 0 },
      { dx: right - rect.left, dy: 0 },
      { dx: 0, dy: top - rect.bottom },
      { dx: 0, dy: bottom - rect.top },
    ];

    const fits = ({ dx, dy }: { dx: number; dy: number }) =>
      rect.left + dx >= field.left &&
      rect.right + dx <= field.right &&
      rect.top + dy >= field.top &&
      rect.bottom + dy <= field.bottom;

    const usable = candidates.filter(fits);
    if (usable.length === 0) continue;

    return usable.reduce((best, c) =>
      Math.abs(c.dx) + Math.abs(c.dy) < Math.abs(best.dx) + Math.abs(best.dy) ? c : best,
    );
  }

  return null;
}


/**
 * Centring offsets for a window, measuring the element when a dimension is
 * not a resolvable CSS length.
 *
 * `useLayoutEffect` so the measurement is applied before paint — a window
 * that renders once uncentred and then jumps is worse than one that appears a
 * frame later.
 */
export function useCenterOffsets(
  ref: RefObject<HTMLElement | null>,
  width: number | string | undefined,
  height: number | string | undefined,
): { marginLeft: string | number; marginTop: string | number } {
  const declaredLeft = negativeHalf(width);
  const declaredTop = negativeHalf(height);
  const [measured, setMeasured] = useState({ left: 0, top: 0 });
  const needsMeasure = declaredLeft === null || declaredTop === null;

  // Runs on every render on purpose: a window's natural size changes with its
  // content (a folder with three tracks is shorter than one with eight), and
  // there is no dependency that captures that. The equality guard is what
  // makes it safe — without it, setting a fresh object each pass would
  // re-render forever.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !needsMeasure) return;
    const next = { left: -el.offsetWidth / 2, top: -el.offsetHeight / 2 };
    setMeasured((prev) =>
      prev.left === next.left && prev.top === next.top ? prev : next,
    );
  });

  return {
    marginLeft: declaredLeft ?? measured.left,
    marginTop: declaredTop ?? measured.top,
  };
}
