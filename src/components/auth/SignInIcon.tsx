"use client";

import { useEffect, useRef, useState } from "react";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { cn } from "@/lib/utils";

/**
 * The key to both doors: a mark in the top-right corner that opens the panel.
 *
 * WHY IT IS DRAWN AND NOT A PADLOCK GLYPH. This is the last thing a visitor
 * sees before the site proper and the first thing they must act on, and a
 * generic lock out of an icon set says "security form" — the opposite of what
 * either of these screens has spent its whole animation establishing. Each
 * persona gets a mark built from the shapes that face is already built from: a
 * struck wax seal for DOTM, a bevelled Win98 tile for DEV.
 *
 * THE NUDGE ARRIVES LATE, ON PURPOSE. `nudgeDelayMs` holds it back until the
 * screen behind has had its moment — the rings blooming on DOTM, the eye
 * opening on DEV. A control that starts waving before the animation it
 * interrupts has finished reads as an error message.
 *
 * THE PANEL IS DISMISSIBLE even though the gate is not. Somebody who opens it
 * by accident, or wants to read the line behind it again, should be able to
 * close it — the door stays locked either way, and a dialog that refuses
 * Escape teaches people to distrust the next one.
 */

export function SignInIcon({
  skin,
  onSignedIn,
  nudgeDelayMs = 1500,
  placement = "corner",
  className,
}: {
  skin: "dotm" | "dev";
  onSignedIn: () => void;
  /** How long after mounting before the icon starts asking to be pressed. */
  nudgeDelayMs?: number;
  placement?: "corner" | "inline";
  className?: string;
}) {
  const isDotm = skin === "dotm";
  const [open, setOpen] = useState(false);
  const [nudging, setNudging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setNudging(true), nudgeDelayMs);
    return () => clearTimeout(timer);
  }, [nudgeDelayMs]);

  // Escape closes, and so does a click outside. Both are what a visitor tries
  // first, and a popover that survives them feels stuck rather than firm.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        placement === "inline" ? cn("relative z-40 mt-4 self-center", isDotm ? "h-14 w-14" : "h-11 w-11") : "absolute right-5 top-5 z-40",
        className,
      )}
    >
      <div className={cn("relative flex", placement === "inline" ? "justify-center" : "justify-end")}>
        {/* The ring leaving the icon. Behind the button and
            `pointer-events-none`, so it can never intercept the press it is
            advertising. */}
        {nudging && !open && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-0 top-0",
              isDotm
                ? "signin-nudge-ring h-14 w-14 rounded-full border border-white/45"
                : "dev-signin-halo h-11 w-11 rounded-sm border-2 border-white/90",
            )}
          />
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Sign in"
          className={cn(
            "relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isDotm ? "h-14 w-14" : "h-11 w-11",
            nudging && !open && (isDotm ? "signin-nudge" : "dev-signin-nudge"),
            isDotm
              ? "rounded-full transition-transform focus-visible:ring-white focus-visible:ring-offset-black"
              : "win98-border win98-press bg-persona-surface focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-[#245edb]",
          )}
        >
          {isDotm ? <DotmLoginMark /> : <DevLoginIcon />}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Sign in"
          className={cn(
            "z-50",
            placement === "inline"
              ? cn(
                  "fixed inset-0 flex items-center justify-center p-3 origin-center",
                  isDotm ? "bg-black" : "bg-[#3f8cf3]",
                  "min-[900px]:absolute min-[900px]:bottom-auto min-[900px]:left-[calc(100%+1rem)] min-[900px]:right-auto min-[900px]:top-0 min-[900px]:block min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:origin-left",
                )
              : "absolute right-0 top-[4.25rem] origin-top-right",
          )}
        >
          <SignInPanel skin={skin} onSignedIn={onSignedIn} />
        </div>
      )}
    </div>
  );
}

/**
 * DOTM: the delivered login mark, looping.
 *
 * WHAT THIS REPLACED. `DotmSeal` — an obsidian disc with a keyhole struck
 * through it, drawn here in SVG across about seventy lines. It was a good
 * mark and it was still a drawing of one; this is the artwork, and it moves.
 *
 * THE SOURCE IS THE REVERSE OF WHAT SHIPS. `Image assets/login.gif` is a black
 * mark on a solid white card. Both halves of that are wrong for a black
 * screen, so `scripts/build-icon-alpha.mjs` inverts it and uses the inverted
 * luminance as an alpha channel over flat white — the same treatment the
 * Contact dock tile gets. What arrives here is a white mark on transparency,
 * 160px, 63 frames, looping natively.
 *
 * A PLAIN `<img>`, NOT `next/image`. The optimizer re-encodes animated WebP
 * and hands back a still first frame, so the icon would simply stop moving —
 * the same trap documented on `ContactTile` and `StatsTile`.
 *
 * The drop shadow is what gives it an edge. A white glyph on a black ground
 * has no silhouette of its own, and the corner it sits in is the one place a
 * visitor has to find before anything else can happen.
 */
function DotmLoginMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/dotm/login-icon.webp"
      alt=""
      width={160}
      height={160}
      aria-hidden="true"
      className="h-full w-full object-contain"
      style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.65))" }}
    />
  );
}

/**
 * DEV: the supplied computer mark, nudged by its button until sign-in opens.
 */
function DevLoginIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/dev/login-computer-transparent.png"
      alt=""
      width={56}
      height={56}
      aria-hidden="true"
      draggable={false}
      className="h-10 w-10 object-contain"
    />
  );
}
