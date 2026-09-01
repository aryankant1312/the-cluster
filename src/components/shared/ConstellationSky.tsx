"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCoords, getCatalogue, type Figure, type Star } from "@/lib/constellation/catalog";
import { SkySynth } from "@/lib/constellation/audio";
import {
  clearSkyParam,
  exportSkyPng,
  readSkyFromLocation,
  skyShareUrl,
  type ExportPoint,
} from "@/lib/constellation/share";
import { VaultFiles } from "@/components/shared/VaultFolder";

/**
 * THE CONSTELLATION TABLE — a thousand stars, and whatever you make of them.
 *
 * Canvas 2D throughout. One `requestAnimationFrame` loop owns every pixel;
 * React owns only the chrome around it — the control bar, the naming modal and
 * the toast. That split is deliberate and load-bearing: the sky twinkles at
 * 60fps, and routing per-frame state through `useState` would re-render the
 * component sixty times a second in order to move some dots. Everything the
 * loop needs lives in refs, and the loop reads them directly.
 *
 * TWO PROJECTIONS, ONE ROTATION. Both views rotate the same unit vectors by the
 * same yaw and pitch, then differ only in how they flatten the result. The
 * planar view is stereographic from the antipode, which is the projection that
 * preserves the *shape* of a figure as it moves off centre — which matters when
 * the whole activity is drawing shapes. The globe view is orthographic with the
 * back hemisphere culled, and mirrored in x, because seeing a sphere from
 * outside reverses the handedness of everything on it.
 *
 * SNAPPING IS A LINEAR SCAN. A thousand stars against one cursor position, once
 * per pointer move, is a few microseconds — a quadtree here would be more code
 * defending a smaller number.
 */

/* ── Tuning ─────────────────────────────────────────────────────────────── */

/** Cursor-to-star distance, in px, at which the cursor snaps. */
const SNAP_RADIUS = 20;

/** Pointer travel, in px, past which a press is a drag and not a click. */
const DRAG_THRESHOLD = 6;

/**
 * How far out and how far in the table will go.
 *
 * The floor drops from 0.55 to 0.3 — "make the space bigger", and this is the
 * honest way to do it. The sphere itself has no size; what a visitor means by
 * a bigger space is being able to pull back far enough to see that it *is* a
 * sphere with things on the far side of it, and 0.55 stopped at roughly the
 * point where the sky still filled the frame. At 0.3 the field opens to about
 * three times the sky area, which is what the extra 1,400 stars and the six
 * new figures are there to fill.
 *
 * The ceiling rises with it, 3.2 to 4.0. Pulling back that far leaves the
 * faint majority small enough that picking one out to connect wants a closer
 * look than the old maximum allowed.
 */
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4.0;

/**
 * Stars this size or larger get a radial halo.
 *
 * Raised from 1.45 alongside `sizeForMagnitude` in the catalogue. That curve
 * now spans roughly 0.28–8.2px where it used to span 0.35–4.4, so 1.45 had
 * gone from "the brightest 6%" to something nearer a third of the sky — and a
 * third of the sky wearing halos is a fogged lens, not a star field. 2.6
 * restores the intent: only the genuinely near stars bloom, which is the
 * whole point of tying brightness to size.
 */
const HALO_THRESHOLD = 2.6;

/** Per-frame multiplier on drag velocity once the pointer is released. */
const INERTIA_DECAY = 0.94;

/**
 * THE ARRIVAL — the camera flight the sky opens on.
 *
 * It starts far out, where the whole hemisphere is a haze of points, and
 * settles over the Orion / Monoceros / Canis Minor group. That destination is
 * not arbitrary: yaw 0, pitch 0 centres RA 6h, Dec 0, which is where those
 * three figures cluster, so the sky comes to rest on the densest run of named
 * shapes it has rather than on an empty patch.
 *
 * The easing is a pure decelerate — fastest at the first frame, asymptotically
 * slow at the last — so the flight reads as coming to a stop rather than as
 * cutting out. Any real input cancels it on the spot: a visitor who reaches
 * for the sky owns the camera from that moment, and fighting them for it would
 * be worse than never animating at all.
 */
const INTRO_MS = 5200;
const INTRO_FROM = { zoom: 0.34, yaw: -0.62, pitch: 0.26 };
const INTRO_TO = { zoom: 1.32, yaw: 0, pitch: 0 };

const ACCENT = "#38bdf8";
const LINE = "#7dd3fc";
const FIGURE_LINE = "#fef08a";

/* ── Types ──────────────────────────────────────────────────────────────── */

type Edge = [number, number];

interface Projected {
  x: number;
  y: number;
  visible: boolean;
}

interface Dust {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function ConstellationSky() {
  const { stars, figures } = useMemo(() => getCatalogue(), []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /**
   * A sky arriving in the URL, read once before the first paint.
   *
   * A lazy `useState` initialiser rather than an effect, and for the reason
   * `LiveStats` uses the same idiom for its cache: this has to be the value the
   * component renders *with*, not one it corrects to a frame later. Reading it
   * in an effect meant the sky painted empty, then jumped — and it put a
   * `setState` in an effect body, which is a cascading render for a value that
   * was available before the component ever mounted.
   */
  const [sharedSky] = useState(readSkyFromLocation);

  /* State React renders. Kept small on purpose — see the header note. */
  /**
   * The official figures start visible.
   *
   * They were opt-in behind a toggle, which meant the sky opened as an
   * undifferentiated field of dots and the visitor had to know to ask for the
   * one layer that makes it legible as the actual night sky. Pre-traced and
   * named is the state worth landing on; the toggle still turns them off for
   * anyone who wants a clean field to draw on.
   */
  const [showFigures, setShowFigures] = useState(true);
  const [outside, setOutside] = useState(false);
  const [muted, setMuted] = useState(false);
  const [naming, setNaming] = useState(false);
  const [skyName, setSkyName] = useState(sharedSky?.name ?? "");
  const [skyStory, setSkyStory] = useState(sharedSky?.story ?? "");
  const [toast, setToast] = useState<string | null>(null);
  /**
   * Which buried file is open, or null. See `VaultFiles`.
   *
   * An id rather than the boolean this replaced: the folder was one panel, so
   * "is it open" was the whole question. Three scattered files each open their
   * own, so the question is which.
   */
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [readout, setReadout] = useState("");
  const [edgeCount, setEdgeCount] = useState(sharedSky?.edges.length ?? 0);

  /* State the render loop owns. */
  const edgesRef = useRef<Edge[]>(
    sharedSky ? sharedSky.edges.map(([a, b]) => [a, b] as Edge) : [],
  );
  const activeRef = useRef<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const zoomRef = useRef(1);
  const velRef = useRef({ yaw: 0, pitch: 0 });
  const downRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const projRef = useRef<Projected[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const showFiguresRef = useRef(showFigures);
  const outsideRef = useRef(outside);
  /** How many edges of a replayed sky have been revealed so far. */
  const revealRef = useRef(Number.POSITIVE_INFINITY);

  /**
   * The opening flight. `null` once it has finished or been cancelled.
   *
   * Started as `undefined` and armed by an effect rather than begun here, so
   * that a shared sky — which should show the drawn figure immediately, not
   * fly toward it — and a reduced-motion visitor both skip straight to the
   * resting camera.
   */
  const introRef = useRef<{ start: number } | null>(null);

  const synthRef = useRef<SkySynth | null>(null);

  /**
   * The synth is built on mount rather than lazily during render.
   *
   * Constructing it in the render body would be a side effect in a function
   * React is allowed to call twice, discard, or replay — under StrictMode that
   * is two AudioContexts, one of them leaked. Declared before every other
   * effect so it exists by the time the mute effect below runs.
   *
   * Note this only allocates the object. The AudioContext inside stays unbuilt
   * until the first `start()` from a real gesture.
   */
  useEffect(() => {
    const synth = new SkySynth();
    synthRef.current = synth;
    return () => {
      synth.dispose();
      synthRef.current = null;
    };
  }, []);

  // Mirrors of the two toggles, so the render loop can read the latest value
  // without taking a dependency on React's render cycle. Written in effects
  // rather than during render: effects run before paint, so the loop never
  // sees a stale flag, and a ref written mid-render is a value React can throw
  // away along with the render that produced it.
  useEffect(() => {
    showFiguresRef.current = showFigures;
  }, [showFigures]);

  useEffect(() => {
    outsideRef.current = outside;
  }, [outside]);

  /**
   * Arm the opening flight, or skip it.
   *
   * Skipped outright for a shared sky — arriving at someone else's drawing
   * should show the drawing, not a five-second approach to it — and for anyone
   * who has asked for reduced motion, who gets the resting camera directly.
   * Otherwise the camera is parked at the far end and the loop flies it in.
   */
  useEffect(() => {
    const still =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (sharedSky || still) {
      zoomRef.current = INTRO_TO.zoom;
      yawRef.current = INTRO_TO.yaw;
      pitchRef.current = INTRO_TO.pitch;
      introRef.current = null;
      return;
    }

    zoomRef.current = INTRO_FROM.zoom;
    yawRef.current = INTRO_FROM.yaw;
    pitchRef.current = INTRO_FROM.pitch;
    introRef.current = { start: performance.now() };
  }, [sharedSky]);

  const flashToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((current) => (current === message ? null : current)),
      2200,
    );
  }, []);

  /* ── Projection ───────────────────────────────────────────────────────── */

  /**
   * Rotate a star into camera space and flatten it.
   *
   * Takes scalars and writes into a caller-owned object rather than returning a
   * new one: this runs a thousand times a frame, and a thousand short-lived
   * objects sixty times a second is the difference between a smooth sky and one
   * that hitches every time the collector runs.
   */
  const project = useCallback((star: Star, out: Projected, w: number, h: number) => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const zoom = zoomRef.current;

    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x1 = star.x * cy - star.z * sy;
    const z1 = star.x * sy + star.z * cy;

    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y2 = star.y * cp - z1 * sp;
    const z2 = star.y * sp + z1 * cp;

    const cx = w / 2;
    const cyc = h / 2;

    if (outsideRef.current) {
      // Orthographic, front hemisphere only, mirrored: from outside the sphere
      // every figure on it reads back to front.
      const radius = Math.min(w, h) * 0.36 * zoom;
      out.visible = z2 > 0;
      out.x = cx - x1 * radius;
      out.y = cyc - y2 * radius;
      return;
    }

    // Stereographic from (0, 0, −1). Clipped well before the pole: as z
    // approaches −1 the scale factor runs away, and a star half a sky behind
    // the camera lands a thousand screens off the edge.
    const denom = 1 + z2;
    if (denom < 0.35) {
      out.visible = false;
      return;
    }
    const scale = Math.min(w, h) * 0.42 * zoom;
    const k = 1 / denom;
    out.x = cx + x1 * k * scale;
    out.y = cyc - y2 * k * scale;
    out.visible = out.x > -80 && out.x < w + 80 && out.y > -80 && out.y < h + 80;
  }, []);

  /* ── Snapping ─────────────────────────────────────────────────────────── */

  const nearestStar = useCallback((px: number, py: number): number | null => {
    const proj = projRef.current;
    let best = -1;
    let bestDistance = SNAP_RADIUS * SNAP_RADIUS;
    for (let i = 0; i < proj.length; i++) {
      const p = proj[i];
      if (!p.visible) continue;
      const dx = p.x - px;
      const dy = p.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistance) {
        bestDistance = d2;
        best = i;
      }
    }
    return best === -1 ? null : best;
  }, []);

  /* ── Drawing operations ───────────────────────────────────────────────── */

  const commitEdge = useCallback((a: number, b: number) => {
    if (a === b) return;
    const edges = edgesRef.current;
    // Re-clicking a pair that is already joined would stack a second identical
    // line on the first — invisible on screen, but it doubles on export and
    // counts twice toward the chime's pitch.
    const exists = edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
    if (exists) return;

    edges.push([a, b]);
    setEdgeCount(edges.length);

    // Pitch climbs with the size of the figure this line belongs to, so a
    // growing constellation walks up the scale and a fresh one starts low.
    synthRef.current?.play(connectedCount(edges, a) - 1);
  }, []);

  const undo = useCallback(() => {
    const edges = edgesRef.current;
    if (edges.length === 0) return;
    edges.pop();
    setEdgeCount(edges.length);
    activeRef.current = null;
  }, []);

  const clearAll = useCallback(() => {
    edgesRef.current = [];
    activeRef.current = null;
    revealRef.current = Number.POSITIVE_INFINITY;
    setEdgeCount(0);
  }, []);

  /* ── Pointer handling ─────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const localPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      // Reaching for the sky ends the opening flight, wherever it had got to.
      introRef.current = null;
      // The pad needs a gesture before a browser will let it make a sound, and
      // this is the first one that reliably happens inside the sky.
      synthRef.current?.start();
      canvas.setPointerCapture(e.pointerId);
      const p = localPoint(e);
      downRef.current = { x: p.x, y: p.y, moved: false };
      velRef.current = { yaw: 0, pitch: 0 };
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = localPoint(e);
      pointerRef.current = p;

      const down = downRef.current;
      if (down) {
        const dx = p.x - down.x;
        const dy = p.y - down.y;
        if (!down.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) down.moved = true;
        if (down.moved) {
          // Divided by the viewport's short side, so a drag covers the same
          // angle on a phone as on a desktop.
          const unit = Math.min(sizeRef.current.w, sizeRef.current.h) || 1;
          const dYaw = (dx / unit) * 2.4;
          const dPitch = (dy / unit) * 2.4;
          yawRef.current -= dYaw;
          pitchRef.current = clampPitch(pitchRef.current - dPitch);
          velRef.current = { yaw: -dYaw, pitch: -dPitch };
          down.x = p.x;
          down.y = p.y;
          hoverRef.current = null;
          return;
        }
      }

      hoverRef.current = nearestStar(p.x, p.y);
    };

    const onPointerUp = (e: PointerEvent) => {
      const down = downRef.current;
      downRef.current = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);

      // A drag. Inertia carries it from here; the loop decays the velocity.
      if (!down || down.moved) return;

      const p = localPoint(e);
      const hit = nearestStar(p.x, p.y);

      if (hit === null) {
        // Empty space releases the chain rather than starting a line to
        // nowhere — the same gesture as Escape, for a visitor who never
        // discovers the key.
        activeRef.current = null;
        return;
      }

      const active = activeRef.current;
      if (active === null || active === hit) {
        activeRef.current = hit;
        return;
      }

      commitEdge(active, hit);
      // The second star becomes the new origin, so a figure is drawn as one
      // unbroken sequence of clicks instead of re-selecting for every segment.
      activeRef.current = hit;
    };

    const onPointerLeave = () => {
      pointerRef.current = null;
      hoverRef.current = null;
    };

    const onDoubleClick = () => {
      activeRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      introRef.current = null;
      const next = zoomRef.current * (e.deltaY > 0 ? 0.9 : 1.1);
      zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [nearestStar, commitEdge]);

  /* ── Keyboard ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    /**
     * Registered in the CAPTURE phase, which is what lets Escape mean two
     * things safely.
     *
     * The Vault's window shell also listens for Escape, to close a fullscreen
     * window. A capture listener on `window` runs before any bubble listener on
     * `window`, so this sees the key first: when there is a chain to release it
     * releases it and calls `preventDefault()`, and the shell — which checks
     * `defaultPrevented` — stands down. With nothing to release, the key passes
     * through and closes the Vault. Neither component imports the other.
     */
    const onKey = (e: KeyboardEvent) => {
      if (naming) return;

      if (e.key === "Escape") {
        /**
         * Three things want Escape, and they are served innermost first: an
         * open buried file, then a half-drawn line, then the Vault itself.
         *
         * The panel is closed from here rather than from `VaultFiles`, which
         * would mean a second listener racing this one. This handler is already
         * registered in the capture phase specifically to sit ahead of the
         * window shell's, so putting the panel at the front of this chain is
         * what makes the ordering deterministic instead of a matter of which
         * component mounted first.
         */
        if (openFileId !== null) {
          setOpenFileId(null);
          e.preventDefault();
          return;
        }
        if (activeRef.current !== null) {
          activeRef.current = null;
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Backspace kept from the previous sky, where it was the only undo.
      if (e.key === "Backspace") {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [undo, naming, openFileId]);

  /* ── Shared sky replay ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!sharedSky) return;

    // Dropped from the address bar once consumed, so a later refresh does not
    // silently throw away whatever the visitor drew on top of it.
    clearSkyParam();

    // Revealed one line at a time rather than all at once: the shape is the
    // message, and watching it assemble is how the recipient reads it.
    revealRef.current = 0;
    const timer = window.setInterval(() => {
      revealRef.current += 1;
      if (revealRef.current >= edgesRef.current.length) {
        revealRef.current = Number.POSITIVE_INFINITY;
        window.clearInterval(timer);
      }
    }, 170);

    // Announced a beat late, on a timer rather than inline. Partly so the sky
    // has painted before a notice is thrown over it, and partly because
    // setting state straight from an effect body schedules a second render
    // before the browser has drawn the first.
    const greet = window.setTimeout(() => {
      flashToast(
        sharedSky.name
          ? `"${sharedSky.name}" — a sky someone sent you`
          : "A sky someone sent you",
      );
    }, 450);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(greet);
    };
  }, [sharedSky, flashToast]);

  /* ── Resize ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      // Capped at 2: a 3x phone renders three times the pixels for a difference
      // nobody can see on a star field, and pays for it in frame time on
      // exactly the hardware with least to spare.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      sizeRef.current = { w, h, dpr };
      seedDust(dustRef, w, h);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  /* ── The loop ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Allocated once and mutated in place. See the note on `project`.
    projRef.current = stars.map(() => ({ x: 0, y: 0, visible: false }));

    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const { w, h, dpr } = sizeRef.current;
      if (w === 0 || h === 0) return;
      const t = (now - start) / 1000;

      /**
       * The opening flight owns the camera outright while it runs.
       *
       * Placed before the inertia block and returning early past it: both
       * write the same three refs, and letting a decaying drag velocity add
       * itself to a scripted flight would make the approach wobble.
       */
      const intro = introRef.current;
      if (intro) {
        const elapsed = now - intro.start;
        if (elapsed >= INTRO_MS) {
          introRef.current = null;
          zoomRef.current = INTRO_TO.zoom;
          yawRef.current = INTRO_TO.yaw;
          pitchRef.current = INTRO_TO.pitch;
        } else {
          // Quintic ease-out: nearly all the distance is covered early, and
          // the last stretch takes long enough to read as settling.
          const k = elapsed / INTRO_MS;
          const e = 1 - Math.pow(1 - k, 5);
          zoomRef.current = INTRO_FROM.zoom + (INTRO_TO.zoom - INTRO_FROM.zoom) * e;
          yawRef.current = INTRO_FROM.yaw + (INTRO_TO.yaw - INTRO_FROM.yaw) * e;
          pitchRef.current = INTRO_FROM.pitch + (INTRO_TO.pitch - INTRO_FROM.pitch) * e;
        }
      }

      // Inertia, applied only while the pointer is up — and never during the
      // flight above, which has already set the camera for this frame.
      if (!intro && !downRef.current) {
        const vel = velRef.current;
        if (Math.abs(vel.yaw) > 1e-5 || Math.abs(vel.pitch) > 1e-5) {
          yawRef.current += vel.yaw;
          pitchRef.current = clampPitch(pitchRef.current + vel.pitch);
          vel.yaw *= INERTIA_DECAY;
          vel.pitch *= INERTIA_DECAY;
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawBackground(ctx, w, h, t);
      drawDust(ctx, dustRef.current, w, h);

      const proj = projRef.current;
      for (let i = 0; i < stars.length; i++) project(stars[i], proj[i], w, h);

      if (showFiguresRef.current) drawFigures(ctx, figures, proj);
      drawStars(ctx, stars, proj, t);
      drawEdges(ctx, edgesRef.current, proj, revealRef.current);
      drawPreview(ctx, proj, activeRef.current, hoverRef.current, pointerRef.current);
      drawSnapRing(ctx, proj, hoverRef.current, activeRef.current, t);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stars, figures, project]);

  /* ── Readout ──────────────────────────────────────────────────────────── */

  // Polled rather than pushed. The hovered star changes on every pointer move,
  // and setting React state at that rate to update one line of text would
  // re-render the control bar along with it.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const hover = hoverRef.current;
      if (hover === null) {
        setReadout((prev) => (prev === "" ? prev : ""));
        return;
      }
      const star = stars[hover];
      const coords = formatCoords(star.ra, star.dec);
      const label = star.name
        ? `${star.name}  ·  ${coords}  ·  mag ${star.mag.toFixed(2)}`
        : `${coords}  ·  mag ${star.mag.toFixed(2)}`;
      setReadout((prev) => (prev === label ? prev : label));
    }, 120);
    return () => window.clearInterval(timer);
  }, [stars]);

  /* ── Audio lifecycle ──────────────────────────────────────────────────── */

  useEffect(() => {
    synthRef.current?.setMuted(muted);
  }, [muted]);

  /* ── Share and export ─────────────────────────────────────────────────── */

  const share = useCallback(async () => {
    const edges = edgesRef.current;
    if (edges.length === 0) {
      flashToast("Draw a line first");
      return;
    }
    const url = skyShareUrl({ name: skyName, story: skyStory, edges });
    try {
      await navigator.clipboard.writeText(url);
      flashToast("Link copied");
    } catch {
      // The clipboard is permission-gated and blocked outright in some embedded
      // contexts. Saying so is more use than a silent no-op.
      flashToast("Could not copy — clipboard is blocked here");
    }
  }, [skyName, skyStory, flashToast]);

  const download = useCallback(async () => {
    const edges = edgesRef.current;
    if (edges.length === 0) {
      flashToast("Draw a line first");
      return;
    }

    flashToast("Rendering 4K print…");

    // Re-projected into 0–1 of the frame rather than scaled from the live
    // canvas, so the export is drawn at 4K rather than blown up to it.
    const { w, h } = sizeRef.current;
    const proj = projRef.current;
    const points: Array<ExportPoint | null> = stars.map((star, i) => {
      const p = proj[i];
      if (!p.visible) return null;
      return {
        x: p.x / w,
        y: p.y / h,
        size: star.size,
        alpha: star.alpha,
        color: star.color,
      };
    });

    const visible = points.filter((p): p is ExportPoint => p !== null);
    const exportEdges: Array<[ExportPoint, ExportPoint]> = [];
    for (const [a, b] of edges) {
      const pa = points[a];
      const pb = points[b];
      // A line with an endpoint currently off screen has no honest position in
      // this frame, so it is left out rather than drawn to the edge.
      if (pa && pb) exportEdges.push([pa, pb]);
    }

    const blob = await exportSkyPng({
      name: skyName,
      story: skyStory,
      stars: visible,
      edges: exportEdges,
    });
    if (!blob) {
      flashToast("Export failed");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      (skyName.trim() || "night-sky").replace(/\s+/g, "-").toLowerCase() + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flashToast("Saved");
  }, [stars, skyName, skyStory, flashToast]);

  /* ── Chrome ───────────────────────────────────────────────────────────── */

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[#030712]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: "crosshair" }}
        aria-label="Constellation table. Click two stars to connect them. Drag to look around, scroll to zoom, Ctrl+Z to undo."
      />

      {/* Corner readout: what the cursor is over, and how far along you are. */}
      <div className="pointer-events-none absolute bottom-24 left-5 z-10 select-none sm:bottom-28">
        <p className="font-mono text-[11px] tracking-[0.18em] text-sky-200/70">
          {readout || "HOVER A STAR"}
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-slate-400/45">
          {edgeCount === 0
            ? "SELECT TWO STARS TO CONNECT THEM"
            : `${edgeCount} LINE${edgeCount === 1 ? "" : "S"} DRAWN`}
        </p>
      </div>

      {toast && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full border border-slate-700/70 bg-slate-900/85 px-5 py-2 font-mono text-[11px] tracking-[0.16em] text-sky-100 backdrop-blur-md"
        >
          {toast}
        </div>
      )}

      <ControlBar
        showFigures={showFigures}
        outside={outside}
        muted={muted}
        onToggleFigures={() => setShowFigures((v) => !v)}
        onToggleOutside={() => setOutside((v) => !v)}
        onToggleMute={() => setMuted((v) => !v)}
        onUndo={undo}
        onClear={clearAll}
        onName={() => setNaming(true)}
        onShare={() => void share()}
        onExport={() => void download()}
      />

      <VaultFiles
        openId={openFileId}
        onOpen={setOpenFileId}
        onClose={() => setOpenFileId(null)}
      />

      {naming && (
        <NameModal
          name={skyName}
          story={skyStory}
          onName={setSkyName}
          onStory={setSkyStory}
          onClose={() => setNaming(false)}
        />
      )}
    </div>
  );
}

/* ── Chrome components ──────────────────────────────────────────────────── */

function ControlBar({
  showFigures,
  outside,
  muted,
  onToggleFigures,
  onToggleOutside,
  onToggleMute,
  onUndo,
  onClear,
  onName,
  onShare,
  onExport,
}: {
  showFigures: boolean;
  outside: boolean;
  muted: boolean;
  onToggleFigures: () => void;
  onToggleOutside: () => void;
  onToggleMute: () => void;
  onUndo: () => void;
  onClear: () => void;
  onName: () => void;
  onShare: () => void;
  onExport: () => void;
}) {
  return (
    <div className="absolute bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-[660px] -translate-x-1/2">
      <div
        className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-800 p-1.5"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(15, 23, 42, 0.75)",
        }}
      >
        <Control label="Undo" onClick={onUndo} glyph="↶" />
        <Control label="Clear" onClick={onClear} glyph="✕" />
        <Divider />
        <Control
          label="Known"
          onClick={onToggleFigures}
          glyph="✦"
          active={showFigures}
        />
        <Control label="Outside" onClick={onToggleOutside} glyph="◍" active={outside} />
        <Divider />
        <Control label="Name" onClick={onName} glyph="✎" />
        <Control label="Share" onClick={onShare} glyph="↗" />
        <Control label="Export" onClick={onExport} glyph="⤓" />
        <Divider />
        <Control
          label={muted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          glyph={muted ? "🔇" : "🔊"}
          active={!muted}
        />
      </div>
    </div>
  );
}

/**
 * One control.
 *
 * Icon plus a visible label rather than icon-only with a tooltip: half of these
 * glyphs have no established meaning, and a control nobody can identify without
 * hovering is a control nobody uses on a touch screen, where there is no hover
 * at all. The label is the part that drops on a narrow window, not the icon.
 */
function Control({
  label,
  glyph,
  onClick,
  active,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      className={
        "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors " +
        (active
          ? "bg-sky-400/15 text-sky-200"
          : "text-slate-300/80 hover:bg-slate-100/10 hover:text-slate-100")
      }
    >
      <span aria-hidden="true" className="text-[13px] leading-none">
        {glyph}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-700/70" />;
}

function NameModal({
  name,
  story,
  onName,
  onStory,
  onClose,
}: {
  name: string;
  story: string;
  onName: (v: string) => void;
  onStory: (v: string) => void;
  onClose: () => void;
}) {
  // Escape closes the modal and stops there. Without `stopPropagation` the key
  // would travel on to the sky's own handler and then to the window shell, and
  // one press would dismiss the modal, drop the chain and close the Vault
  // together.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Name my night sky"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-800 p-6"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(15, 23, 42, 0.88)",
        }}
      >
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/80">
          Name my night sky
        </h2>

        <label className="mt-5 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Constellation
          </span>
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => onName(e.target.value)}
            placeholder="The Kaya"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <label className="mt-4 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Dedication
          </span>
          <textarea
            value={story}
            maxLength={160}
            rows={3}
            onChange={(e) => onStory(e.target.value)}
            placeholder="for whoever looks up next"
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-wide text-slate-500">
          Printed on the export and carried in the share link.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-sky-500/90 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-950 transition-colors hover:bg-sky-400"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ── Canvas painters ────────────────────────────────────────────────────── */

/**
 * Deep space. Black, and almost nothing else.
 *
 * This used to open on an indigo-to-navy radial with three coloured nebula
 * clouds drifting over it, which lit the whole frame and left the faint stars
 * with nothing to sit against — a sky is dark, and everything that reads as
 * depth in a real star field is the contrast between a point of light and
 * true black behind it.
 *
 * What survives is a trace: two very low-alpha clouds, screened so they can
 * only ever lighten, at roughly a fifth of their old strength. Enough that
 * the frame is not a flat fill, far too little to compete with a star.
 */
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "screen";
  const clouds: Array<[number, number, number, string]> = [
    [0.3 + Math.sin(t * 0.045) * 0.05, 0.35 + Math.cos(t * 0.037) * 0.04, 0.5, "70, 90, 190"],
    [0.7 + Math.cos(t * 0.031) * 0.05, 0.64 + Math.sin(t * 0.041) * 0.04, 0.44, "120, 70, 170"],
  ];
  for (const [fx, fy, fr, rgb] of clouds) {
    const cx = fx * w;
    const cy = fy * h;
    const r = fr * Math.max(w, h);
    const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    cloud.addColorStop(0, `rgba(${rgb}, 0.030)`);
    cloud.addColorStop(0.55, `rgba(${rgb}, 0.012)`);
    cloud.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
}

function seedDust(ref: { current: Dust[] }, w: number, h: number) {
  const dust: Dust[] = [];
  for (let i = 0; i < 70; i++) {
    dust.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.09,
      vy: (Math.random() - 0.5) * 0.09,
      a: 0.06 + Math.random() * 0.14,
    });
  }
  ref.current = dust;
}

/** Foreground motes, drifting in screen space and wrapping at the edges. */
function drawDust(ctx: CanvasRenderingContext2D, dust: Dust[], w: number, h: number) {
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#c7d2fe";
  for (const d of dust) {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < 0) d.x += w;
    if (d.x > w) d.x -= w;
    if (d.y < 0) d.y += h;
    if (d.y > h) d.y -= h;
    ctx.globalAlpha = d.a;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/**
 * The six official figures — their lines, and their names.
 *
 * Set well under the drawn lines in both weight and opacity: this is the
 * reference layer, not the subject of the screen. The segments are batched
 * into a single path, so the whole set costs one `stroke()` rather than one
 * per edge.
 *
 * NAMES ARE PLACED, NOT PINNED. A label anchored to a fixed star in the
 * figure swings wildly as the sky rotates and ends up outside the frame or on
 * top of a line. Each name is drawn at the centroid of whichever of its stars
 * are currently on screen, offset below it — so the label tracks the shape it
 * belongs to and stays put relative to it.
 *
 * A figure with fewer than two visible stars is skipped outright. One star
 * left on screen is not a constellation, and labelling it puts a name in the
 * middle of empty sky.
 */
function drawFigures(ctx: CanvasRenderingContext2D, figures: Figure[], proj: Projected[]) {
  ctx.save();
  ctx.strokeStyle = FIGURE_LINE;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  for (const figure of figures) {
    for (const [a, b] of figure.edges) {
      const pa = proj[a];
      const pb = proj[b];
      if (!pa.visible || !pb.visible) continue;
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Labels, in a second pass so the dash pattern above never applies to text.
  ctx.save();
  ctx.setLineDash([]);
  ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const figure of figures) {
    let sumX = 0;
    let sumY = 0;
    let seen = 0;
    // A figure's edge list names each star twice or more; a Set keeps the
    // centroid from being dragged toward whichever star has most connections.
    const counted = new Set<number>();
    for (const [a, b] of figure.edges) {
      for (const index of [a, b]) {
        if (counted.has(index)) continue;
        const p = proj[index];
        if (!p.visible) continue;
        counted.add(index);
        sumX += p.x;
        sumY += p.y;
        seen++;
      }
    }
    if (seen < 2) continue;

    const cx = sumX / seen;
    const cy = sumY / seen;

    // Drawn twice: a dark halo first, then the name over it. Thin type over a
    // star field is unreadable wherever it crosses a bright star, and a halo
    // is what keeps it legible without putting a plate behind it.
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeText(figure.name, cx, cy);
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.fillText(figure.name, cx, cy);
  }

  ctx.restore();
}

/**
 * A thousand stars.
 *
 * Twinkle is `base + 0.25·sin(ωt + φ)` per the brief, clamped so a faint star
 * cannot go negative and start drawing as a hole. Only stars past
 * HALO_THRESHOLD get a radial gradient — that is the expensive call, and giving
 * one to every star costs several milliseconds a frame to make the sky
 * uniformly foggy.
 */
function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  proj: Projected[],
  t: number,
) {
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < stars.length; i++) {
    const p = proj[i];
    if (!p.visible) continue;
    const star = stars[i];

    const twinkle = star.alpha + 0.25 * Math.sin(star.omega * t + star.phase);
    const alpha = twinkle < 0.05 ? 0.05 : twinkle > 1 ? 1 : twinkle;

    if (star.size >= HALO_THRESHOLD) {
      const haloRadius = star.size * 6.5;
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
      halo.addColorStop(0, star.color);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = alpha * 0.22;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/** The lines the visitor drew. `reveal` caps how many, for a replayed sky. */
function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: Edge[],
  proj: Projected[],
  reveal: number,
) {
  const limit = Math.min(edges.length, reveal);
  if (limit <= 0) return;

  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < limit; i++) {
    const [a, b] = edges[i];
    const pa = proj[a];
    const pb = proj[b];
    if (!pa.visible || !pb.visible) continue;
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** The dashed line from the locked origin to wherever the cursor is. */
function drawPreview(
  ctx: CanvasRenderingContext2D,
  proj: Projected[],
  active: number | null,
  hover: number | null,
  pointer: { x: number; y: number } | null,
) {
  if (active === null) return;
  const from = proj[active];
  if (!from.visible) return;

  // Ends on the snapped star when there is one, so the preview shows the line
  // that would actually be committed rather than one to the raw cursor.
  const target = hover !== null && proj[hover].visible ? proj[hover] : pointer;
  if (!target) return;

  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.restore();

  // The origin itself, so it is never ambiguous which star the chain is
  // anchored to.
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(from.x, from.y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The pulsing ring on whichever star the cursor has snapped to. */
function drawSnapRing(
  ctx: CanvasRenderingContext2D,
  proj: Projected[],
  hover: number | null,
  active: number | null,
  t: number,
) {
  if (hover === null || hover === active) return;
  const p = proj[hover];
  if (!p.visible) return;

  const pulse = 9 + Math.sin(t * 4) * 2.2;
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Pitch, clamped just short of the poles.
 *
 * At exactly ±90° the yaw axis and the view axis coincide, and the sky spins on
 * the spot with no way to steer out of it.
 */
function clampPitch(value: number): number {
  const limit = Math.PI / 2 - 0.05;
  return value < -limit ? -limit : value > limit ? limit : value;
}

/**
 * How many lines the connected figure containing `star` has.
 *
 * A flood fill over the edge list rather than a lookup: the figure a star
 * belongs to is whatever it is currently joined to, which changes with every
 * line drawn and every undo. These lists are tens of edges, so walking them
 * beats maintaining an index that has to be invalidated.
 */
function connectedCount(edges: Edge[], star: number): number {
  const seen = new Set<number>([star]);
  const queue = [star];
  let count = 0;

  while (queue.length > 0) {
    const current = queue.pop() as number;
    for (const [a, b] of edges) {
      if (a !== current && b !== current) continue;
      count++;
      const other = a === current ? b : a;
      if (!seen.has(other)) {
        seen.add(other);
        queue.push(other);
      }
    }
  }

  // Each edge is met from both of its endpoints during the walk.
  return Math.ceil(count / 2);
}

export default ConstellationSky;
