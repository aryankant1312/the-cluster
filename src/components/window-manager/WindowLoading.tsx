"use client";

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
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col items-center justify-center gap-4 px-6"
    >
      <p className="font-chrome text-xs uppercase tracking-[0.35em] text-persona-fg-muted">
        {label ? `Opening ${label}` : "Opening"}
      </p>

      {/* A moving segment rather than a fill, so it never implies a percentage
          it does not know. */}
      <div className="h-px w-40 overflow-hidden bg-persona-fg-muted/25">
        <div className="window-loading-bar h-full w-1/3 bg-persona-accent" />
      </div>
    </div>
  );
}

export default WindowLoading;
