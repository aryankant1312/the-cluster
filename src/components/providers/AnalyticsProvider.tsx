"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * What happened, and for how long.
 *
 * BUFFERED, NOT PER-EVENT. A dock is clicked in bursts and windows open in
 * threes; a request per event would put a queue of round trips in front of an
 * interface whose whole appeal is answering instantly. Events go into an array
 * and leave on a timer, when the buffer fills, or when the tab goes away.
 *
 * THE LAST FLUSH IS THE ONE THAT MATTERS, and it is the one a plain `fetch`
 * loses: a tab being closed tears its requests down with it, so the final
 * batch — the one carrying how long the last window was open — is exactly the
 * batch that never arrives. `sendBeacon` is handed to the browser and outlives
 * the page, which is the entire reason it exists.
 *
 * `visibilitychange`, NOT `beforeunload`. Mobile browsers frequently never
 * fire `beforeunload` at all — a backgrounded tab is discarded without one,
 * and on iOS it is close to useless. `hidden` fires in every case that
 * matters, the app switcher included.
 *
 * NOTHING HERE CAN BREAK A PAGE. Every failure is swallowed, the endpoint
 * always answers success, and a visit whose telemetry never lands still works
 * in every respect a visitor can see.
 */

/** How often the buffer is flushed while the tab is in front. */
const FLUSH_INTERVAL_MS = 15_000;
/** Flush early rather than grow past this — the endpoint's own cap is 60. */
const MAX_BUFFER = 40;

type EventType =
  | "session_start"
  | "session_end"
  | "window_open"
  | "window_close"
  | "nav"
  | "interaction"
  | "auth";

interface QueuedEvent {
  type: EventType;
  name?: string;
  persona?: string;
  windowId?: string;
  route?: string;
  durationMs?: number | null;
  meta?: unknown;
  at: string;
}

interface AnalyticsValue {
  /** Record something. Cheap, synchronous, and never throws. */
  track: (event: Omit<QueuedEvent, "at" | "persona" | "route">) => void;
  /**
   * Mark a window opened. Returns nothing — the matching `closeWindow` is what
   * produces the duration, because only the pair of them knows it.
   */
  openWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
}

const AnalyticsContext = createContext<AnalyticsValue | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { persona } = usePersona();
  const { user } = useAuth();
  const pathname = usePathname();

  const sessionIdRef = useRef<string | null>(null);
  const bufferRef = useRef<QueuedEvent[]>([]);
  /** When each open window was opened, so closing one can measure it. */
  const openedAtRef = useRef<Map<string, number>>(new Map());

  /**
   * Live copies of the things a flush needs but must not re-subscribe on.
   *
   * The listeners are registered once, on mount. Reading `persona` or
   * `pathname` inside them would capture the values from that first render and
   * tag every later event with them; depending on those values instead would
   * tear the listeners down and rebuild them on every navigation, leaving the
   * beacon handler missing at exactly the wrong moment.
   */
  const personaRef = useRef(persona);
  const routeRef = useRef(pathname);

  // Synced in an effect rather than assigned during render. Writing a ref
  // while rendering is a side effect in a function React is allowed to call
  // twice and throw one result away — the value would be right by luck rather
  // than by rule. An effect runs after the commit, which is well before any
  // of these are read: nothing here fires until a click, a timer, or the tab
  // being hidden.
  useEffect(() => {
    personaRef.current = persona;
    routeRef.current = pathname;
  }, [persona, pathname]);

  /**
   * Post a batch.
   *
   * `useBeacon` on the way out, because the page may be leaving with it.
   * Beacons send cookies for same-origin requests, which is what attributes a
   * batch to a signed-in visitor — and this endpoint is same-origin.
   */
  const send = useCallback((payload: Record<string, unknown>, useBeacon: boolean) => {
    const body = JSON.stringify(payload);
    try {
      if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics",
          new Blob([body], { type: "application/json" }),
        );
        return;
      }
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Telemetry is never worth an exception raised inside a click handler.
    }
  }, []);

  const flush = useCallback(
    (options: { beacon?: boolean; end?: boolean } = {}) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      const events = bufferRef.current;
      if (events.length === 0 && !options.end) return;
      bufferRef.current = [];
      send({ sessionId, events, end: options.end === true }, options.beacon === true);
    },
    [send],
  );

  const push = useCallback(
    (event: QueuedEvent) => {
      bufferRef.current.push(event);
      if (bufferRef.current.length >= MAX_BUFFER) flush();
    },
    [flush],
  );

  const track = useCallback<AnalyticsValue["track"]>(
    (event) => {
      push({
        ...event,
        persona: personaRef.current ?? "",
        route: routeRef.current,
        at: new Date().toISOString(),
      });
    },
    [push],
  );

  const openWindow = useCallback<AnalyticsValue["openWindow"]>(
    (windowId) => {
      openedAtRef.current.set(windowId, Date.now());
      track({ type: "window_open", windowId });
    },
    [track],
  );

  const closeWindow = useCallback<AnalyticsValue["closeWindow"]>(
    (windowId) => {
      const openedAt = openedAtRef.current.get(windowId);
      openedAtRef.current.delete(windowId);
      track({
        type: "window_close",
        windowId,
        // Null rather than 0 when the open was never seen: a window already
        // open when this mounted has a real duration that simply is not known,
        // and zero would claim it was never looked at.
        durationMs: openedAt === undefined ? null : Date.now() - openedAt,
      });
    },
    [track],
  );

  /* Open the visit, once. */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            persona: personaRef.current ?? "",
            // Where they came from. An internal navigation leaves this empty,
            // which is the honest answer rather than a missing one.
            referrer: document.referrer,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          }),
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { sessionId?: string };
        if (body.sessionId && !cancelled) sessionIdRef.current = body.sessionId;
      } catch {
        // No visit id means nothing is recorded for this visit. The site is
        // otherwise unaffected, which is the trade this whole file makes.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Flush on a timer, and whenever the tab goes away. */
  useEffect(() => {
    const timer = setInterval(() => flush(), FLUSH_INTERVAL_MS);

    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      // `end: true` closes the visit. A tab that comes back files events
      // against the same id, and the server keeps the first `ended_at` it was
      // given — the honest reading being that the visit ended and what follows
      // is the tail of it rather than a new one.
      flush({ beacon: true, end: true });
    };

    document.addEventListener("visibilitychange", onHidden);
    // Belt and braces on desktop, where `pagehide` does fire and can land
    // first.
    window.addEventListener("pagehide", onHidden);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
      flush();
    };
  }, [flush]);

  /* Route changes, the boot sequence's own included. */
  useEffect(() => {
    track({ type: "nav", name: pathname });
  }, [pathname, track]);

  /**
   * Signing in mid-visit.
   *
   * Recorded and flushed at once, because the server attributes a visit to an
   * account when a batch arrives while the session cookie is set — and waiting
   * fifteen seconds for the timer leaves a window in which the visit still
   * reads as anonymous.
   */
  useEffect(() => {
    if (!user) return;
    track({ type: "auth", name: "signed_in" });
    flush();
  }, [user, track, flush]);

  const value = useMemo<AnalyticsValue>(
    () => ({ track, openWindow, closeWindow }),
    [track, openWindow, closeWindow],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

const NOOP: AnalyticsValue = {
  track: () => {},
  openWindow: () => {},
  closeWindow: () => {},
};

/**
 * The recorder, or a set of no-ops.
 *
 * Unlike `useAuth`, this does not throw when the provider is absent. Tracking
 * is incidental to every component that calls it, and a missing provider must
 * mean "nothing was recorded" rather than a blank screen — a metric should
 * never be able to take a window down with it.
 */
export function useAnalytics(): AnalyticsValue {
  const ctx = useContext(AnalyticsContext);
  return ctx ?? NOOP;
}
