"use client";

import { useSyncExternalStore } from "react";

/**
 * "IS THE DESKTOP CLEAR?", asked from outside the window manager.
 *
 * WHY THIS EXISTS RATHER THAN A CONTEXT READ. The persona switch lives in
 * `PersonaTopBar`, which is rendered by `(persona)/layout.tsx`. The window
 * manager is provided one level *below* that, by `dev/layout.tsx` and
 * `dotm/layout.tsx` — so the toggle is a sibling of the provider, not a
 * descendant of it, and `useWindowManager()` from there would simply throw.
 *
 * THE ALTERNATIVE WAS MOVING THE PROVIDER UP, and it is worse. One provider
 * shared by both personas survives the switch between them, so a window opened
 * on the DEV desktop would still be registered as open on the DOTM one. A
 * provider per persona is the correct shape; what needed fixing was only that
 * one fact had to escape it.
 *
 * So the provider publishes a single number here and the toggle subscribes.
 * `useSyncExternalStore` rather than a context or an event: it is the API
 * built for exactly this — an external mutable value read during render — and
 * it tears correctly under concurrent rendering, which a `useState` mirrored
 * from a subscription does not.
 *
 * The count RESETS TO ZERO when a provider unmounts. Switching persona or
 * navigating away tears down that desktop and every window on it, and a stale
 * count left behind would lock the toggle on a screen that has no windows.
 */

/** Windows open and not minimized, on whichever desktop is currently mounted. */
let openCount = 0;

const listeners = new Set<() => void>();

export function publishOpenWindowCount(next: number): void {
  if (next === openCount) return;
  openCount = next;
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

function getSnapshot(): number {
  return openCount;
}

/**
 * Zero on the server. There is no desktop during a server render, and
 * reporting anything else would hydrate a toggle that disagrees with the
 * markup it replaced.
 */
function getServerSnapshot(): number {
  return 0;
}

/** How many windows stand between the visitor and the desktop right now. */
export function useOpenWindowCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
