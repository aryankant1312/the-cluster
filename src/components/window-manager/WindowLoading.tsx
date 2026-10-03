"use client";

import { useWindowLoadGate } from "./WindowLoadBoundary";

/**
 * What a window shows while its code is on the way.
 *
 * Every window's content is a `next/dynamic` chunk now, so between the click
 * and the first paint there is a gap — short on a warm connection, a second or
 * two on a cold one. Rendering nothing in that gap reads as a broken window,
 * and rendering a spinner over the persona's own chrome reads as a foreign
 * control, so this is deliberately quiet: the window's own name, and a bar
 * that moves.
 *
 * It inherits the persona's typeface and foreground colour from the shell it
 * is mounted inside rather than choosing its own, which is why the two
 * desktops get visibly different loaders out of one component.
 */
export function WindowLoading({ label }: { label?: string }) {
  useWindowLoadGate(true);

  return (
    <div
      role="status"
      aria-live="polite"
      className="h-full w-full overflow-hidden bg-black"
    >
      <span className="sr-only">{label ? `Opening ${label}` : "Opening"}</span>
    </div>
  );
}

export default WindowLoading;
