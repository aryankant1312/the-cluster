"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Who is signed in, and the way out — one small control, in the top bar.
 *
 * IT LIVES IN THE CHROME NOW, IN BOTH PERSONAS. It used to be tucked into
 * whatever each desktop already had: the DOTM dock's tray, at the far end past
 * the clock, and the DEV Start menu, above Shut Down. That put one control in
 * two unrelated places, both on the bottom edge — and made DEV's reachable
 * only by opening a menu first, so there was no way to see which account you
 * were in without going looking for it.
 *
 * The top-right of the persona bar is where every desktop of the last twenty
 * years has put the account. It is identical in both faces and it is on screen
 * without opening anything.
 *
 * `side` FOLLOWS THAT MOVE. Both former homes sat on the bottom edge with
 * nowhere below to open into, so the panel opened upward; in the top bar the
 * opposite is true. `align` stays because a caller placing this somewhere else
 * still needs the choice.
 *
 * Nothing renders while signed out. The bar exists only behind the gate, so an
 * anonymous visitor cannot be looking at it; the guard covers the moment
 * before the first session read lands.
 */

export function AccountMenu({
  skin,
  align = "right",
  side = "down",
}: {
  skin: "dotm" | "dev";
  align?: "left" | "right";
  /** Which way the panel opens. `up` for a control on the bottom edge. */
  side?: "up" | "down";
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  if (!user) return null;

  const isDotm = skin === "dotm";
  // Google supplies an avatar; a code-only account has none, so the first
  // letter of the address stands in. Never a silhouette placeholder — an
  // initial is at least about this person.
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account — ${user.email}`}
        title={user.email}
        className={cn(
          "flex items-center gap-2 focus:outline-none focus-visible:ring-2",
          isDotm
            ? "rounded-full focus-visible:ring-white"
            : "win98-border win98-press bg-persona-surface px-2 py-1 focus-visible:ring-[#0a2f5c]",
        )}
      >
        <Avatar user={user} initial={initial} isDotm={isDotm} />
        {!isDotm && (
          <span className="max-w-[9rem] truncate font-chrome text-sm text-black">
            {user.name || user.email}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-56 p-3",
            side === "up" ? "bottom-full mb-2" : "top-full mt-2",
            align === "right" ? "right-0" : "left-0",
            isDotm
              ? "macos-glass rounded-xl text-white shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9)]"
              : "win98-border bg-persona-surface text-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]",
          )}
        >
          <p
            className={cn(
              "font-chrome text-[10px] uppercase tracking-[0.28em]",
              isDotm ? "text-white/45" : "text-black/50",
            )}
          >
            Signed in
          </p>
          {/* `break-all` rather than truncate: the address is the only thing
              identifying this account, and half of one is not an identity. */}
          <p className="mt-1 break-all font-mono text-[12px] leading-snug">{user.email}</p>

          {/*
            SIGNING OUT NOW GOES SOMEWHERE, which is the whole of the fix.

            This used to call `signOut` and stop. That clears the cookie and
            the provider's copy of the user — but nothing navigates, so the
            visitor was left standing on a desktop they no longer had a session
            for, with the menu closed and no visible acknowledgement that
            anything had happened. The page only corrected itself on the next
            hard load, when the layout's gate finally ran and bounced them.

            So it waits for the request to land and then goes to the door. The
            await matters: pushing first would race the redirect against a
            cookie that is still being cleared, and the door would read a live
            session and wave them straight back in.

            `replace`, not `push`. The desktop they just left is no longer
            reachable, and leaving it in history means Back returns to a route
            that will only bounce them here again.

            IT GOES TO THE SOFA, NOT BACK TO THE DOOR THEY CAME THROUGH.
            Landing on `/choose-face/dev` after signing out of DEV drops
            somebody straight into the boot sequence for the face they have
            just left, which reads as the site refusing to let go of them.
            `/choose-face` is the room with both silhouettes in it, and the
            honest answer to "I am done here" is the choice of where to go
            next — including the other persona.
          */}
          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              // One door. Signing out of DOTM leaves a DEV session alone.
              await signOut(skin);
              setOpen(false);
              router.replace("/choose-face");
            }}
            className={cn(
              "mt-3 w-full px-3 py-2 font-chrome text-[12px] uppercase tracking-[0.18em]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isDotm
                ? "rounded-lg border border-white/20 transition-colors hover:border-[#ff2244] hover:text-[#ff8a99]"
                : "win98-border win98-press bg-persona-surface",
            )}
          >
            {leaving ? "Signing out…" : isDotm ? "Sign out" : "Log Off"}
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({
  user,
  initial,
  isDotm,
}: {
  user: { picture: string; email: string };
  initial: string;
  isDotm: boolean;
}) {
  const shape = isDotm ? "h-7 w-7 rounded-full" : "h-6 w-6";

  if (user.picture) {
    return (
      // A plain <img>: this URL is Google's, on a host the image optimizer is
      // not configured for, and adding a remote pattern to next.config for one
      // 28px avatar is more surface than it is worth.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.picture}
        alt=""
        width={28}
        height={28}
        referrerPolicy="no-referrer"
        className={cn(shape, "shrink-0 object-cover", isDotm && "ring-1 ring-white/25")}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        shape,
        "flex shrink-0 items-center justify-center font-chrome text-[12px]",
        isDotm ? "bg-[#ff2244] text-black" : "win98-border bg-[#0a2f5c] text-white",
      )}
    >
      {initial}
    </span>
  );
}
