"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WINDOW_LOADER_MINIMUM_MS } from "@/lib/window-loader";
import { SiteVideo } from "./SiteVideo";

/**
 * THE SHARED WINDOW LOADER — the black ball bouncing over the M while the
 * window already visible behind it is blurred. It has no coloured plate or
 * central bloom, so loading feels like the current window coming into focus.
 */

export function LoaderVideo({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black px-6">
      <SiteVideo
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="aspect-square w-[min(58vmin,360px)] object-contain"
        src="/videos/window-loader.mp4"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function DotmLoader({
  show,
  label = "Loading",
  className,
}: {
  /** False starts the fade; the overlay unmounts itself when it finishes. */
  show: boolean;
  label?: string;
  className?: string;
}) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  const visible = show || !minimumElapsed;

  useEffect(() => {
    const timer = window.setTimeout(
      () => setMinimumElapsed(true),
      WINDOW_LOADER_MINIMUM_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="shared-window-loader"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[#f4f4f1]/55 backdrop-blur-lg",
            className,
          )}
        >
          <LoaderVideo label={label} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The same loader as a whole window's worth of surface.
 *
 * `DotmLoader` is `absolute inset-0` because it is an overlay, and an overlay
 * needs a positioned parent. A `next/dynamic` `loading:` fallback has no parent
 * of its own — it *is* the window's contents for as long as the chunk is in
 * flight — so it gets one here rather than at each of the four call sites.
 */
export function DotmWindowLoader({ label }: { label?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <LoaderVideo label={label} />
    </div>
  );
}

export default DotmLoader;
