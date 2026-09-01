"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAnalytics } from "@/components/providers/AnalyticsProvider";
import { publishOpenWindowCount } from "@/components/window-manager/desktop-clear";

interface WindowManagerState {
  order: string[];
  minimized: Set<string>;
  /** Windows currently asking for the desktop chrome to stand down. */
  chromeHidden: Set<string>;
}

interface WindowManagerValue {
  openIds: string[];
  isOpen: (id: string) => boolean;
  isMinimized: (id: string) => boolean;
  isFront: (id: string) => boolean;
  zIndexOf: (id: string) => number;
  openWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  /**
   * True while a window is standing in for the whole tab.
   *
   * The taskbar and the dock are `position: fixed` at `z-[200]`, and window
   * shells sit at `z-100` plus their order. A fullscreen window therefore
   * covered the top bar — only `z-40` — but never the bar along the bottom,
   * which went on floating over it. Raising the window past 200 would win that
   * round and lose the next one, since anything else pinned to the viewport
   * would have to be bid past too, so the bars are told to stand down instead
   * of being out-stacked.
   */
  chromeHidden: boolean;
  /**
   * Claim or release the chrome on one window's behalf.
   *
   * Keyed by window id rather than held as a plain flag: two windows can be
   * open at once, and a single boolean would let whichever released it last
   * hand the chrome back while the other was still fullscreen.
   */
  setChromeHidden: (id: string, hidden: boolean) => void;
}

const WindowManagerContext = createContext<WindowManagerValue | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WindowManagerState>({
    order: [],
    minimized: new Set(),
    chromeHidden: new Set(),
  });

  /**
   * Which windows were opened, and for how long.
   *
   * Measured here rather than inside the window shells, because this is the
   * one place that sees every open and every close: a shell only knows its
   * own, and a window that stays mounted while minimized — the music player
   * does — never unmounts to tell anybody.
   *
   * `useAnalytics` returns no-ops when its provider is absent, so a window
   * manager mounted outside it still works. Recording is incidental to opening
   * a window and must never be able to stop one.
   */
  const analytics = useAnalytics();

  const openWindow = useCallback(
    (id: string) => {
      setState((prev) => {
        if (prev.order.includes(id)) {
          const minimized = new Set(prev.minimized);
          minimized.delete(id);
          return {
            ...prev,
            order: [...prev.order.filter((w) => w !== id), id],
            minimized,
          };
        }
        return { ...prev, order: [...prev.order, id] };
      });
      // Fired unconditionally, including when the window was already open and
      // this is a raise-to-front. Going back to a window is a visit to it, and
      // a count that ignored returns would understate exactly the windows
      // people actually live in.
      analytics.openWindow(id);
    },
    [analytics],
  );

  const closeWindow = useCallback(
    (id: string) => {
      setState((prev) => {
        // A closing window cannot be holding the chrome down, and it will not
        // be around to release it — so the claim is dropped here rather than
        // left to the window's own cleanup, which races the unmount.
        const chromeHidden = new Set(prev.chromeHidden);
        chromeHidden.delete(id);
        return { ...prev, order: prev.order.filter((w) => w !== id), chromeHidden };
      });
      analytics.closeWindow(id);
    },
    [analytics],
  );

  const minimizeWindow = useCallback((id: string) => {
    setState((prev) => {
      // Same reasoning as closing: a window you cannot see is not entitled to
      // keep the taskbar hidden, least of all the taskbar you need to get it
      // back again.
      const chromeHidden = new Set(prev.chromeHidden);
      chromeHidden.delete(id);
      return { ...prev, minimized: new Set(prev.minimized).add(id), chromeHidden };
    });
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setState((prev) => {
      const minimized = new Set(prev.minimized);
      minimized.delete(id);
      return { ...prev, order: [...prev.order.filter((w) => w !== id), id], minimized };
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      order: prev.order.includes(id)
        ? [...prev.order.filter((w) => w !== id), id]
        : [...prev.order, id],
    }));
  }, []);

  /**
   * Publish "how much is standing between the visitor and the desktop" for the
   * persona switch, which sits outside this provider and cannot read it. See
   * `desktop-clear.ts` for why that is and why the number travels rather than
   * the provider moving.
   *
   * MINIMIZED WINDOWS DO NOT COUNT. A minimized window has handed the desktop
   * back — the same rule the 666 coin uses to decide whether to show itself,
   * and the two should never disagree about what "on the desktop" means.
   *
   * The cleanup fires on unmount, which is every persona switch and every
   * navigation off a desktop. Without it a count from a torn-down desktop
   * would outlive it and lock the toggle.
   */
  useEffect(() => {
    let open = 0;
    for (const id of state.order) if (!state.minimized.has(id)) open++;
    publishOpenWindowCount(open);
  }, [state]);

  useEffect(() => () => publishOpenWindowCount(0), []);

  const setChromeHidden = useCallback((id: string, hidden: boolean) => {
    setState((prev) => {
      if (prev.chromeHidden.has(id) === hidden) return prev;
      const chromeHidden = new Set(prev.chromeHidden);
      if (hidden) chromeHidden.add(id);
      else chromeHidden.delete(id);
      return { ...prev, chromeHidden };
    });
  }, []);

  const value: WindowManagerValue = {
    openIds: state.order,
    isOpen: (id) => state.order.includes(id),
    isMinimized: (id) => state.minimized.has(id),
    isFront: (id) => state.order[state.order.length - 1] === id,
    zIndexOf: (id) => 100 + state.order.indexOf(id),
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    chromeHidden: state.chromeHidden.size > 0,
    setChromeHidden,
  };

  return (
    <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}
