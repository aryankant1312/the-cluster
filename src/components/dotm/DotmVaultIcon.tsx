"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import {
  desktopFreeBounds,
  pushOutOfObstacles,
} from "@/components/window-manager/window-geometry";

/**
 * The 666 coin — the Vault's door, floating on the DOTM desktop.
 *
 * The source clip is a 1280x720 shot of the coin hanging on a pale wall. The
 * old crop took the middle square of that frame, so a ring of beige wall came
 * with it: the "outline" around the coin was never part of the coin. The
 * previous fix reached for `mix-blend-mode: multiply`, which only darkens
 * pale pixels rather than removing them, so the ring survived as grey.
 *
 * Scaling the video up inside the circular mask pushes the wall past the edge
 * instead, so the coin fills its own frame — and the generator's sparkle
 * watermark in the source's bottom-right corner is cropped out with it.
 *
 * COIN_FILL is the frame's short edge over the coin's diameter within it
 * (720 / ~470), plus a little overscan so anti-aliasing at the mask edge
 * never reveals a sliver of wall.
 */
const COIN_FILL = 1.58;

/**
 * The windows the coin stands down for.
 *
 * Every one of these opens `fullSurface` and most open fullscreen, so the coin
 * would otherwise float on top of a room the visitor is already standing in —
 * catching clicks meant for the content underneath and offering a door to
 * somewhere they have already gone.
 *
 * NOT every window. Notes, Live Stats and Book DOTM are framed panels that
 * leave most of the desktop visible around them, and the coin is part of that
 * desktop. `mini-player` is mounted but unreachable — nothing in `src/` opens
 * it — so it is deliberately absent rather than forgotten.
 *
 * CLUSTER WALL JOINED THE LIST when it became fullscreen. It used to be one of
 * the framed panels; it is now a field of moving images covering the whole
 * tab, and a 666 coin floating over it is the exact case this list exists for
 * — a door to somewhere the visitor is already standing, catching clicks meant
 * for what is underneath.
 */
const COIN_HIDDEN_FOR = [
  "vault",
  "contact",
  "welcome",
  "portfolio",
  "music-player",
  "shows",
  "merch",
  "cluster-wall",
] as const;

export function DotmVaultIcon() {
  const wm = useWindowManager();

  const ref = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<ReturnType<typeof desktopFreeBounds>>(undefined);
  const [dragging, setDragging] = useState(false);

  /**
   * The drag offset, owned here rather than left to framer.
   *
   * The dock and its tray are islands in the middle of the bottom of the
   * screen, and "everywhere but those two" is not a rectangle — which is all
   * `dragConstraints` can express. Holding x and y makes it possible to
   * correct the position mid-drag, which is what `onDrag` does below.
   */
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  /**
   * The coin stands down while any full-surface window is open.
   *
   * It sits at `z-[190]`, well above the window shells at `z-100`, so with one
   * of those open it floated on top of the content — a 666 coin parked over
   * the star field, or over the shows map, catching clicks meant for what is
   * underneath. See `COIN_HIDDEN_FOR` for which windows and why not all.
   *
   * The guard has to sit below every hook above, not beside the `wm` call that
   * feeds it: an early return before `useRef` and the two `useState`s would
   * change how many hooks run between an open and a closed Vault, which is the
   * one thing React's hook ordering cannot survive.
   */
  // Minimized does not count. A minimized window has handed the desktop back,
  // and the coin is desktop furniture — so it returns with the rest of it.
  const covered = COIN_HIDDEN_FOR.some((id) => wm.isOpen(id) && !wm.isMinimized(id));
  if (covered) return null;

  return (
    <motion.div
      ref={ref}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={bounds}
      style={{ x, y }}
      onDragStart={() => {
        setDragging(true);
        // Recomputed per grab, so the limits are right wherever it was left.
        setBounds(desktopFreeBounds(ref.current));
      }}
      /**
       * Steer around the dock and its tray, frame by frame.
       *
       * The rectangle above already keeps the coin on screen and under the top
       * bar; this is the part a rectangle cannot do. `pushOutOfObstacles`
       * returns the shortest way out of whichever pill the coin is touching,
       * so it slides past the dock's flank when it comes in from the side and
       * lifts over its top edge when it comes down from above — and the wide
       * open desktop either side of the dock stays reachable, all the way into
       * the bottom-left corner.
       */
      onDrag={() => {
        const push = pushOutOfObstacles(ref.current);
        if (!push) return;
        if (push.dx) x.set(x.get() + push.dx);
        if (push.dy) y.set(y.get() + push.dy);
      }}
      // A drag finishes by firing a click on the button underneath. This flag
      // lets that click be ignored, so parking the coin never opens the Vault.
      onDragEnd={() => setTimeout(() => setDragging(false), 0)}
      // Rests on the left, below the Cluster Count figure. It sat on the right
      // before, hard against the edge the tray also lives on; the left is the
      // emptier half of this desktop and the coin is easier to find there.
      // Draggable, so this is only where it starts.
      whileDrag={{ scale: 1.06 }}
      className="absolute left-8 top-48 z-[190] w-16 cursor-grab active:cursor-grabbing sm:w-20"
    >
      <button
        type="button"
        onClick={() => {
          if (!dragging) wm.openWindow("vault");
        }}
        aria-label="Open the Vault"
        title="The Vault — drag to move"
        className="group block w-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff0033] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <span className="relative block aspect-square w-full overflow-hidden rounded-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-105 group-active:scale-95">
          <video
            src="/videos/dotm/vault-icon.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className="pointer-events-none block h-full w-full object-cover"
            style={{ transform: `scale(${COIN_FILL})` }}
          />
        </span>
      </button>
    </motion.div>
  );
}
