"use client";

import { useSyncExternalStore } from "react";

/**
 * WHAT DOTM IS PLAYING, held outside the window that plays it.
 *
 * The record player lives inside the Music window (`DotmMusicWheel`), and the
 * `<audio>` element lives with it. The transport pill on the desktop is not
 * inside that window — it is fixed to the bottom-right corner, above the tray
 * — so the two cannot pass props to each other. A module-level store is the
 * seam: the wheel publishes what it is doing, the pill reads it.
 *
 * WHY NOT REACT CONTEXT. A provider would have to sit above both, which means
 * above the window manager, and it would re-render the whole desktop on every
 * change. This store is subscribed to by exactly two components and notifies
 * only them.
 *
 * TWO MODES, AND `live` IS WHICH ONE.
 *
 *   live: true  — the wheel is mounted (the window is open, or minimized,
 *                 which keeps it mounted). It has registered its transport
 *                 handlers, and the pill drives the real element through them.
 *
 *   live: false — the window is closed, so there is no element and nothing is
 *                 playing. The pill still shows the last record picked, and
 *                 pressing anything on it records the intent here and asks for
 *                 the window to be opened; the wheel reads this store on mount
 *                 and comes up on that record, playing.
 *
 * The index is the position in `content/tracks`, not a track object: the wheel
 * already owns that list and its wrapping, and two copies of "which record"
 * would be one too many.
 */

export interface DotmPlayerState {
  /** Index into `tracks` from `@/content/tracks`. */
  index: number;
  playing: boolean;
  /** True while a real `<audio>` is mounted and drivable. */
  live: boolean;
}

/** What the wheel hands over so the pill can drive the element it owns. */
export interface DotmPlayerTransport {
  toggle: () => void;
  next: () => void;
  previous: () => void;
}

let state: DotmPlayerState = { index: 0, playing: false, live: false };
let transport: DotmPlayerTransport | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(next: Partial<DotmPlayerState>) {
  const merged = { ...state, ...next };
  if (
    merged.index === state.index &&
    merged.playing === state.playing &&
    merged.live === state.live
  ) {
    return;
  }
  state = merged;
  emit();
}

/**
 * The server has no player, and `useSyncExternalStore` demands a snapshot for
 * it. A frozen module-level object rather than a fresh literal: returning a new
 * object on each call is an infinite render loop, which is the one way this
 * hook bites.
 */
const SERVER_SNAPSHOT: DotmPlayerState = Object.freeze({
  index: 0,
  playing: false,
  live: false,
});

export const dotmPlayer = {
  getState: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** The wheel, reporting what it is on and whether it is running. */
  publish(next: { index: number; playing: boolean }) {
    set({ ...next, live: true });
  },

  /**
   * The wheel handing over its transport, and taking it back on unmount.
   *
   * `live` goes false on release because a torn-down window has stopped
   * playing — leaving it true would give the pill a pause button for silence.
   */
  attach(next: DotmPlayerTransport) {
    transport = next;
    set({ live: true });
    return () => {
      if (transport === next) transport = null;
      set({ live: false, playing: false });
    };
  },

  /**
   * Press play/pause.
   *
   * Returns `true` when it was handled here. `false` means there is no element
   * to drive and the caller should open the Music window — the intent is
   * already recorded, so the wheel comes up playing this record.
   */
  toggle(): boolean {
    if (transport) {
      transport.toggle();
      return true;
    }
    set({ playing: true });
    return false;
  },

  /** Previous (`-1`) or next (`1`). Same contract as `toggle` for the return. */
  step(delta: 1 | -1, trackCount: number): boolean {
    if (transport) {
      if (delta === 1) transport.next();
      else transport.previous();
      return true;
    }
    if (trackCount > 0) {
      set({ index: (state.index + delta + trackCount) % trackCount, playing: true });
    }
    return false;
  },
};

export function useDotmPlayer(): DotmPlayerState {
  return useSyncExternalStore(dotmPlayer.subscribe, dotmPlayer.getState, () => SERVER_SNAPSHOT);
}
