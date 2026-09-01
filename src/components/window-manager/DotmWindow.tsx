"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowManager } from "./window-manager-context";
import {
  BOTTOM_BAR_SAFE_AREA,
  desktopDragBounds,
  useCenterOffsets,
  useTopBarInset,
} from "./window-geometry";

/** Side inset for a filled window, so it still reads as a window. */
const FILL_INSET = 10;

/**
 * DOTM's window shell: frosted macOS chrome with traffic lights.
 *
 * Windows open centred and *windowed* — never maximized. A window that opens
 * filling the viewport crops its own content against the dock and the top
 * bar, and leaves the visitor no sense of where they are on the desktop.
 * Each window carries an explicit size instead.
 *
 * The green light is deliberately inert. It stays drawn because a macOS
 * window with a gap where the third light should be looks broken, but
 * maximizing is what caused the cropping, so it does nothing. Close and
 * minimize behave normally.
 */
export function DotmWindow({
  id,
  title,
  children,
  width = 420,
  height,
  fullSurface = false,
  placement = "center",
  keepMounted = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  fullSurface?: boolean;
  /**
   * "right" parks the window against the right edge, vertically centred.
   * "fill" opens it across the whole desktop, stopping short of the top bar
   * and the dock so neither is covered and the close button stays reachable
   * — `width`/`height` are ignored in that mode.
   * "fullscreen" goes further and takes the entire tab, drawing over the top
   * bar and the dock both. Only the Vault uses it: the sky it contains is
   * meant to be stood inside, and a sky with a desktop around it is a
   * postcard. Because that covers the chrome, the titlebar gains a working
   * maximize control and Escape closes the window — see the comment on
   * `close` below for why the sky gets first refusal on that key.
   */
  placement?: "center" | "right" | "fill" | "fullscreen";
  /**
   * Stay mounted while minimized, hidden rather than unmounted.
   *
   * Minimizing normally tears the window's subtree down, which for the music
   * player means tearing down its `<audio>` element — so the record stopped
   * dead the moment you put the player away, and came back at zero. A minimized
   * window is supposed to be a window you are not looking at, not one that has
   * been closed.
   *
   * `visibility: hidden` rather than `display: none`: both take the shell out
   * of hit-testing and out of the tab order, and neither affects audio, but
   * `display: none` collapses the box to zero — and `useCenterOffsets` measures
   * that box, so the window would re-measure from nothing and jump on restore.
   */
  keepMounted?: boolean;
}) {
  const wm = useWindowManager();
  const shellRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [bounds, setBounds] = useState<ReturnType<typeof desktopDragBounds>>(undefined);
  const offsets = useCenterOffsets(shellRef, width, height);
  // Measured, not assumed: a filled window has to start below the real top
  // bar, and the bar's height depends on the persona's typeface.
  const topInset = useTopBarInset();

  const minimized = wm.isMinimized(id);
  const isOpen = wm.isOpen(id) && !minimized;
  /** Minimized-but-alive: rendered, inert, and invisible. See `keepMounted`. */
  const parked = keepMounted && wm.isOpen(id) && minimized;

  /**
   * Whether a fullscreen window is currently taking the whole tab.
   *
   * The maximize light toggles this, which is the reason it exists at all: a
   * window drawn over the top bar and the dock has hidden the only other way
   * of getting back to the desktop, so it has to offer one itself. Windows
   * that were never fullscreen ignore this and keep an inert light, as before.
   */
  const [expanded, setExpanded] = useState(true);
  const canFullscreen = placement === "fullscreen";
  const effective = canFullscreen && !expanded ? "fill" : placement;

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      wm.closeWindow(id);
      setClosing(false);
      // Back to the default for the next open. Reset here, in the two handlers
      // that actually put a window away, rather than in an effect watching
      // `isOpen` — that effect set state straight from its body, which
      // schedules a second render before the browser has drawn the first.
      setExpanded(true);
    }, 200);
  }, [id, wm]);

  const minimize = useCallback(() => {
    wm.minimizeWindow(id);
    setExpanded(true);
  }, [id, wm]);

  /**
   * Escape closes a fullscreen window — the last exit, for a visitor who has
   * lost the top bar and does not read three coloured dots as controls.
   *
   * The sky inside gets first refusal. `ConstellationSky` binds Escape to
   * release the chain it is drawing and calls `preventDefault()` when it does,
   * so this only fires when nothing inside claimed the key. Checking
   * `defaultPrevented` on a bubbled event is what makes that ordering work
   * without either component importing the other.
   */
  useEffect(() => {
    if (!canFullscreen || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canFullscreen, isOpen, close]);

  /**
   * Put the dock away while this window is genuinely taking the whole tab.
   *
   * Covering it was never an option: the dock is fixed at `z-[200]`, above every
   * window shell, so a "fullscreen" window still had it floating across the
   * bottom. It is asked to stand down instead. Tied to the effective placement
   * rather than to `canFullscreen`, so the maximize light dropping the window to
   * `fill` brings the dock straight back — that placement stops short of it on
   * purpose and expects it to be there.
   */
  const { setChromeHidden } = wm;
  useEffect(() => {
    setChromeHidden(id, effective === "fullscreen" && isOpen);
    return () => setChromeHidden(id, false);
  }, [id, effective, isOpen, setChromeHidden]);

  return (
    <AnimatePresence>
      {(isOpen || parked) && (
        <motion.div
          ref={shellRef}
          // A filled window has nowhere to be dragged to; letting it move
          // only lets the visitor push its own title bar off screen.
          drag={effective !== "fill" && effective !== "fullscreen"}
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={bounds}
          onDragStart={() => setBounds(desktopDragBounds(shellRef.current))}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.94 : 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onMouseDown={() => wm.focusWindow(id)}
          data-dotm-window
          aria-hidden={parked || undefined}
          style={{
            position: "absolute",
            ...(parked
              ? { visibility: "hidden" as const, pointerEvents: "none" as const }
              : null),
            zIndex: wm.zIndexOf(id),
            width,
            height,
            // The width cap is for windows measured in pixels: a 520px player
            // on a 400px phone has to be reined in. A window that asked for its
            // width in `vw` is already viewport-relative and cannot overflow,
            // so a flat 96vw only overrode what the caller asked for — the
            // contact card asking for 98vw silently got 96. Those keep their
            // own figure now; a pixel width still gets the cap.
            maxWidth:
              typeof width === "string" && width.endsWith("vw") ? width : "96vw",
            // The height cap does a different job and stays unconditional: it
            // holds the bottom edge clear of the dock. A window taller than
            // this slides underneath and loses its own close button with it.
            maxHeight: `calc(100vh - ${BOTTOM_BAR_SAFE_AREA}px)`,
            // Vertically centred always; horizontally centred unless the
            // window asked for the right edge. `useCenterOffsets` measures
            // the element when its height is not declared, which is what
            // stops short windows hanging off the bottom of the screen.
            top: "50%",
            marginTop: offsets.marginTop,
            ...(effective === "right"
              ? { right: "4%", left: "auto", marginLeft: 0 }
              : { left: "50%", marginLeft: offsets.marginLeft }),
            // Spread last so a filled window overrides the centring above
            // outright rather than fighting it.
            ...(effective === "fill"
              ? {
                  top: topInset,
                  left: FILL_INSET,
                  right: FILL_INSET,
                  width: "auto",
                  height: `calc(100vh - ${topInset + BOTTOM_BAR_SAFE_AREA}px)`,
                  maxWidth: "none",
                  maxHeight: "none",
                  marginTop: 0,
                  marginLeft: 0,
                }
              : {}),
            // The whole tab. `position: fixed` rather than absolute, because
            // the desktop this window is a child of is itself inset below the
            // top bar — an absolute inset-0 would only fill the desktop, which
            // is the thing we are trying to escape. Window z-index is already
            // above the bar's z-40, so nothing else is needed to cover it.
            ...(effective === "fullscreen"
              ? {
                  position: "fixed" as const,
                  inset: 0,
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "auto",
                  height: "auto",
                  maxWidth: "none",
                  maxHeight: "none",
                  marginTop: 0,
                  marginLeft: 0,
                  borderRadius: 0,
                }
              : {}),
          }}
          className="macos-glass flex flex-col overflow-hidden rounded-[var(--radius-window)] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)]"
        >
          <div className="group/lights relative flex shrink-0 cursor-move select-none items-center justify-center border-b border-white/10 px-3 py-2">
            <div className="absolute left-3 flex items-center gap-1.5">
              <TrafficLight color="#ff5f57" label="Close" onClick={close} glyph="close" />
              <TrafficLight
                color="#febc2e"
                label="Minimize"
                onClick={minimize}
                glyph="minimize"
              />
              <TrafficLight
                color="#28c840"
                label={expanded ? "Exit full screen" : "Full screen"}
                // Live only where it means something. Everywhere else this
                // stays the inert light it has always been, because maximizing
                // an ordinary window is what used to crop it against the dock.
                onClick={canFullscreen ? () => setExpanded((v) => !v) : undefined}
                glyph="maximize"
              />
            </div>
            <span className="font-chrome text-sm tracking-wide text-white/80">{title}</span>
          </div>

          <div
            className={
              fullSurface
                ? "min-h-0 flex-1 overflow-hidden font-body text-sm text-persona-fg"
                : "min-h-0 flex-1 overflow-auto p-4 font-body text-sm text-persona-fg"
            }
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Glyph = "close" | "minimize" | "maximize";

/**
 * A macOS traffic light. The glyph stays hidden until the cluster is hovered,
 * per the platform convention, but the control is a real button with a hit
 * area padded past its 12px visual bounds, so it never needs a precise click.
 *
 * Omitting `onClick` renders a light that is present and focusable but does
 * nothing — which is exactly what the maximize control is meant to be here.
 */
function TrafficLight({
  color,
  label,
  onClick,
  glyph,
}: {
  color: string;
  label: string;
  onClick?: () => void;
  glyph: Glyph;
}) {
  const inert = !onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-disabled={inert || undefined}
      title={label}
      style={{ backgroundColor: color }}
      className="relative flex h-3 w-3 items-center justify-center rounded-full outline-none
                 before:absolute before:-inset-[7px] before:content-['']
                 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1
                 focus-visible:ring-offset-black/40"
    >
      <svg
        viewBox="0 0 12 12"
        width={8}
        height={8}
        aria-hidden="true"
        className="opacity-0 transition-opacity duration-150 group-hover/lights:opacity-100"
        stroke="rgba(0,0,0,0.7)"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      >
        {glyph === "close" && <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />}
        {glyph === "minimize" && <path d="M3 6h6" />}
        {glyph === "maximize" && <path d="M3.5 6h5M6 3.5v5" />}
      </svg>
    </button>
  );
}
