"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { type StaticImageData } from "next/image";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import { useWindowManager } from "./window-manager-context";
import {
  BOTTOM_BAR_SAFE_AREA,
  desktopDragBounds,
  useCenterOffsets,
  useTopBarInset,
} from "./window-geometry";
import { cn } from "@/lib/utils";
import { WindowLoadBoundary } from "./WindowLoadBoundary";

const MENU_ITEMS = ["File", "Edit", "View", "Go", "Help"];

/** Side inset for a filled window, so it still reads as a window. */
const FILL_INSET = 10;
/** Air between a normal window and the webpage's left/right edges. */
const WINDOW_EDGE_INSET = 8;
const RESTORED_WIDTH = "min(88vw, 1120px)";
const RESTORED_HEIGHT = "min(76vh, 760px)";

export function DevWindow({
  id,
  title,
  children,
  width = 480,
  height,
  backgroundImage,
  titleClassName,
  fullSurface = false,
  placement = "center",
  keepMounted = false,
  overTopBar = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  backgroundImage?: StaticImageData | string;
  /** override the titlebar text size/weight, e.g. for a window that wants a bigger title */
  titleClassName?: string;
  /**
   * Hand the content pane over whole — no padding, no sky background, no
   * scroller of its own. For surfaces that manage their own edges.
   */
  fullSurface?: boolean;
  /**
   * "left" and "right" park the window against that edge, vertically centred.
   *
   * "left" exists so the track player can sit beside My Music rather than on
   * top of it. Both are opened from the same gesture — double-clicking a song
   * in the browser opens the player — and with the browser centred and the
   * player on the right they overlapped, so choosing a track buried the list
   * you chose it from.
   * "fill" opens it across the whole desktop, stopping short of the taskbar
   * so the titlebar's minimize and close stay reachable — `width`/`height`
   * are ignored in that mode.
   * "fullscreen" goes further and takes the entire tab, drawing over the top
   * bar and the taskbar both. Only the Vault uses it: the sky it contains is
   * meant to be stood inside, and a sky with a desktop around it is a
   * postcard. Because that covers the chrome, the maximize button stops being
   * inert here and Escape closes the window.
   */
  placement?: "center" | "left" | "right" | "fill" | "fullscreen";
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
  /**
   * Draw this window over the persona top bar instead of under it.
   *
   * Opt-in rather than the default because it is a real trade: a window that
   * covers the bar covers the countdown, the persona toggle and the account
   * menu with it. Worth it for the Portfolio, which is a full-bleed
   * photograph and reads as a poster with a strip of chrome bitten out of its
   * top edge; not worth it for a folder listing.
   *
   * See the `position` note in the style block for why this is a `fixed`
   * switch and not a z-index one.
   */
  overTopBar?: boolean;
}) {
  const wm = useWindowManager();
  const shellRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [bounds, setBounds] = useState<ReturnType<typeof desktopDragBounds>>(undefined);
  const refreshBounds = useCallback(() => {
    const next = desktopDragBounds(shellRef.current);
    if (next) {
      const currentX = x.get();
      const currentY = y.get();
      const clampedX = Math.min(next.right, Math.max(next.left, currentX));
      const clampedY = Math.min(next.bottom, Math.max(next.top, currentY));
      if (clampedX !== currentX) x.set(clampedX);
      if (clampedY !== currentY) y.set(clampedY);
    }
    setBounds((current) => {
      if (!next || !current) return next;
      return current.left === next.left &&
        current.top === next.top &&
        current.right === next.right &&
        current.bottom === next.bottom
        ? current
        : next;
    });
  }, [x, y]);

  // Windowed by default. `placement="fill"` is the one exception, for
  // surfaces that are an experience rather than a document — it still stops
  // short of the taskbar, so the titlebar controls can never be covered.
  // Measured, not assumed: a filled window has to start below the real top
  // bar, and the bar's height depends on the persona's typeface.
  const topInset = useTopBarInset();

  /**
   * Whether a fullscreen window is currently taking the whole tab.
   *
   * The maximize button toggles this, which is why it stops being inert on a
   * fullscreen window: covering the top bar and the taskbar hides every other
   * route back to the desktop, so the window has to offer one itself.
   */
  const [expanded, setExpanded] = useState(true);
  const canFullscreen = placement === "fullscreen";
  const restoredFromFullscreen = canFullscreen && !expanded;
  const effective = restoredFromFullscreen ? "center" : placement;

  const filled = effective === "fill";
  const isFullscreen = effective === "fullscreen";
  const movable = !filled && !isFullscreen;
  const shellWidth = filled || isFullscreen
    ? undefined
    : restoredFromFullscreen ? RESTORED_WIDTH : width;
  const shellHeight = filled
    ? `calc(100vh - ${topInset + BOTTOM_BAR_SAFE_AREA}px)`
    : isFullscreen
      ? "100vh"
      : restoredFromFullscreen ? RESTORED_HEIGHT : height;
  // Must be called before the early return below. This component renders as
  // null while its window is closed, so a hook placed after that point would
  // change the hook count between renders and take down the whole desktop.
  // Use the rendered box, not the requested dimensions. On a small browser a
  // 520px window may be clamped to 100vw; centring against 520px leaves the
  // real window partly off-screen and makes the first drag jump.
  const offsets = useCenterOffsets(shellRef, undefined, undefined);

  const minimized = wm.isMinimized(id);
  const isOpen = wm.isOpen(id) && !minimized;
  /** Minimized-but-alive: rendered, inert, and invisible. See `keepMounted`. */
  const parked = keepMounted && wm.isOpen(id) && minimized;

  useEffect(() => {
    if (!isOpen || !movable) return;
    refreshBounds();
    const observer = new ResizeObserver(refreshBounds);
    if (shellRef.current) observer.observe(shellRef.current);
    const topBar = document.querySelector<HTMLElement>(".persona-topbar");
    if (topBar) observer.observe(topBar);
    const taskbar = document.querySelector<HTMLElement>("[data-dev-taskbar]");
    if (taskbar) observer.observe(taskbar);
    window.addEventListener("resize", refreshBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refreshBounds);
    };
  }, [isOpen, movable, refreshBounds]);

  useLayoutEffect(() => {
    if (!movable) {
      x.set(0);
      y.set(0);
    } else if (isOpen) {
      refreshBounds();
    }
  }, [isOpen, movable, offsets.marginLeft, offsets.marginTop, refreshBounds, x, y]);

  // Declared before the early return for the same reason the hooks are: the
  // Escape listener below closes over it.
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
    }, 150);
  }, [id, wm]);

  const minimize = useCallback(() => {
    wm.minimizeWindow(id);
    setExpanded(true);
  }, [id, wm]);

  /**
   * Escape closes a fullscreen window — the last exit, for a visitor who has
   * lost the taskbar and does not read a Win98 titlebar as a set of controls.
   *
   * The sky inside gets first refusal: `ConstellationSky` binds Escape to
   * release the chain it is drawing and calls `preventDefault()` when it does,
   * so this only fires when nothing inside claimed the key.
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
   * Put the taskbar away while this window is genuinely taking the whole tab.
   *
   * Covering it was never an option: it is fixed at `z-[200]`, above every
   * window shell, so a "fullscreen" window had the desktop's own bar sitting on
   * top of it. It is asked to stand down instead. Tied to `isFullscreen` rather
   * than to `canFullscreen`, so hitting restore brings the bar straight back
   * and restores a draggable window.
   */
  const { setChromeHidden } = wm;
  useEffect(() => {
    setChromeHidden(id, (isFullscreen || overTopBar) && isOpen);
    return () => setChromeHidden(id, false);
  }, [id, isFullscreen, isOpen, overTopBar, setChromeHidden]);

  if (!isOpen && !parked) return null;

  return (
    <motion.div
      ref={shellRef}
      // A filled window has nowhere to be dragged to; letting it move only
      // lets the visitor push its own titlebar off screen.
      drag={movable}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={bounds}
      onDragStart={refreshBounds}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{
        opacity: closing ? 0 : 1,
        scale: closing ? 0.96 : 1,
      }}
      transition={{ duration: 0.15 }}
      onMouseDown={() => wm.focusWindow(id)}
      aria-hidden={parked || undefined}
      style={{
        x,
        y,
        /*
          `fixed` for a window that asked to sit over the top bar, and the
          reason is a clip rather than a stacking order.

          The shell already carries a z-index of 100 against the bar's 40, and
          both sit in the root stacking context, so it should have won and did
          not. What actually cut the titlebar off is an ancestor: the desktop
          area is `relative flex-1 overflow-hidden`, measured starting at y=66
          on a 720px viewport — exactly the bottom edge of the bar. An absolute
          child's containing block is that element, so everything above y=66
          was clipped away, and what showed through the gap was the bar. No
          amount of z-index reaches past an overflow clip.

          `fixed` moves the containing block to the viewport. Overflow clipping
          only applies to descendants whose containing block is inside the
          clipping box, so the shell stops being one of them — and that holds
          here because nothing on the chain sets `transform`, `filter` or
          `will-change`, any of which would make the ancestor a containing
          block for fixed descendants and put the clip straight back. If one
          is ever added above the desktop area, this breaks silently and the
          titlebar goes back under the bar.

          The centring maths is unchanged and still correct: `top: 50%` plus a
          negative half-height now resolves against the viewport rather than
          against the desktop area, which is where a window drawn over the
          chrome belongs anyway.
        */
        position: overTopBar ? "fixed" : "absolute",
        ...(parked ? { visibility: "hidden" as const, pointerEvents: "none" as const } : null),
        zIndex: wm.zIndexOf(id),
        width: shellWidth,
        ...(shellHeight !== undefined ? { height: shellHeight } : undefined),
        maxWidth: `calc(100vw - ${WINDOW_EDGE_INSET * 2}px)`,
        maxHeight: `calc(100vh - ${BOTTOM_BAR_SAFE_AREA}px)`,
        // Vertically centred always. Horizontally centred unless the window
        // asked to sit on the right. `useCenterOffsets` measures the element
        // when its height is not declared, which is what stops short windows
        // from hanging off the bottom of the screen.
        top: "50%",
        marginTop: offsets.marginTop,
        ...(effective === "right"
          ? { right: WINDOW_EDGE_INSET, left: "auto", marginLeft: 0 }
          : effective === "left"
            ? { left: WINDOW_EDGE_INSET, right: "auto", marginLeft: 0 }
            : { left: "50%", marginLeft: offsets.marginLeft }),
        // Spread last so a filled window overrides the centring above
        // outright rather than fighting it.
        ...(filled
          ? {
              top: topInset,
              left: FILL_INSET,
              right: FILL_INSET,
              width: "auto",
              maxWidth: "none",
              maxHeight: "none",
              marginTop: 0,
              marginLeft: 0,
            }
          : {}),
        // The whole tab. `position: fixed` rather than absolute, because the
        // desktop this window is a child of already sits below the top bar —
        // an absolute inset-0 would only fill the desktop, which is the thing
        // we are escaping. Window z-index is above the bar's z-40 already.
        ...(isFullscreen
          ? {
              position: "fixed" as const,
              inset: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "auto",
              height: "100vh",
              maxWidth: "none",
              maxHeight: "none",
              marginTop: 0,
              marginLeft: 0,
            }
          : {}),
      }}
      className="dev-window win98-border bg-persona-surface flex flex-col"
    >
      <div
        className="bg-persona-titlebar text-white flex cursor-grab active:cursor-grabbing touch-none items-center justify-between px-2 py-2 select-none"
        onPointerDown={(event) => {
          if (!movable) return;
          refreshBounds();
          dragControls.start(event);
        }}
      >
        <span className={cn("font-chrome tracking-wide truncate", titleClassName ?? "text-sm")}>
          {title}
        </span>
        <div
          className="flex items-center gap-1"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="win98-border w-5 h-5 flex items-center justify-center text-black bg-persona-surface text-xs leading-none hover:bg-danger hover:text-white"
            onClick={minimize}
            aria-label="Minimize"
          >
            _
          </button>
          {/* Inert on an ordinary window — a Win98 titlebar missing its middle
              button looks broken, but maximizing is what was cropping content.
              On a fullscreen window it is live, and it is the way back out. */}
          <button
            type="button"
            aria-label={canFullscreen ? (expanded ? "Restore" : "Maximize") : "Maximize"}
            aria-disabled={!canFullscreen}
            title={canFullscreen ? (expanded ? "Restore" : "Maximize") : "Maximize"}
            onClick={canFullscreen ? () => setExpanded((v) => !v) : undefined}
            className={cn(
              "win98-border w-5 h-5 flex items-center justify-center text-black bg-persona-surface text-xs leading-none",
              canFullscreen && "hover:bg-persona-titlebar hover:text-white",
            )}
          >
            {canFullscreen && expanded ? "❐" : "□"}
          </button>
          <button
            type="button"
            className="win98-border w-5 h-5 flex items-center justify-center text-black bg-persona-surface text-xs leading-none hover:bg-danger hover:text-white"
            onClick={close}
            aria-label="Close"
          >
            X
          </button>
        </div>
      </div>
      {/* File / Edit / View / Go / Help.
          Hidden on a fullscreen window: the surface inside is meant to be stood
          in rather than operated on, and a strip of Win98 menus across the top
          of it is the same postcard framing the placement exists to remove. The
          only live item is File > Close, and the titlebar's X and its restore
          button — both still on screen — already offer that. */}
      {!isFullscreen && (
      <div className="flex bg-menubar border-b border-black text-xs font-body relative">
        {MENU_ITEMS.map((item) => (
          <div key={item} className="relative">
            <button
              type="button"
              className="px-2 py-0.5 hover:bg-persona-titlebar hover:text-white"
              onClick={() => setOpenMenu((prev) => (prev === item ? null : item))}
            >
              {item}
            </button>
            {openMenu === item && (
              <div className="absolute left-0 top-full win98-border bg-menubar min-w-[120px] z-10">
                {item === "File" ? (
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-1 hover:bg-persona-titlebar hover:text-white"
                    onClick={() => {
                      setOpenMenu(null);
                      close();
                    }}
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <div className="px-3 py-1 text-fg-muted">—</div>
                    <div className="px-3 py-1 text-fg-muted">—</div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
      <div
        className={cn(
          "relative font-body text-sm text-black",
          fullSurface ? "overflow-hidden" : "win98-sky p-3 overflow-auto",
          shellHeight === undefined ? "max-h-[60vh]" : "flex-1 min-h-0",
        )}
        style={{
          ...(backgroundImage
            ? {
                backgroundImage: `url(${typeof backgroundImage === "string" ? backgroundImage : backgroundImage.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined),
        }}
      >
        <WindowLoadBoundary label={`Opening ${title}`}>
          {children}
        </WindowLoadBoundary>
      </div>
      <div className="self-end w-3 h-3 mr-0.5 mb-0.5 border-r-2 border-b-2 border-black/50" />
    </motion.div>
  );
}
