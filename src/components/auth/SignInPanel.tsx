"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * The sign-in panel, worn two ways.
 *
 * ONE COMPONENT, TWO COSTUMES. The flow is identical at both doors — Google,
 * or an address and a six-digit code — and duplicating it per persona would
 * leave two copies of the same state machine to drift apart the first time one
 * of them was fixed. `skin` changes materials and nothing else.
 *
 * IT TELLS THE TRUTH ABOUT WHAT IT CAN DO. With no Google credentials
 * configured the button says so and runs the local stand-in; with no mail
 * provider it says the code went to the server console. A panel that quietly
 * does something other than what its button reads is how people learn to
 * distrust buttons.
 *
 * TWO STEPS, NOT TWO FORMS. Asking for a code and entering it are one
 * conversation about one address, so the address stays on screen and the panel
 * changes what it is asking for.
 */

type Skin = "dotm" | "dev";
type Stage = "choose" | "code";

export function SignInPanel({
  skin,
  onSignedIn,
  className,
}: {
  skin: Skin;
  /** Fired once, after the session is confirmed by the server. */
  onSignedIn: () => void;
  className?: string;
}) {
  const { capabilities, refresh } = useAuth();
  const isDotm = skin === "dotm";

  const [stage, setStage] = useState<Stage>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const codeRef = useRef<HTMLInputElement>(null);

  // Focus follows the question. Reaching the code step with the cursor still
  // in the address field means typing the code into the wrong box.
  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  const finish = async () => {
    // The server is asked who it thinks we are, rather than the response body
    // being trusted: the gate reads the cookie, so the only sign-in worth
    // acting on is one the cookie can prove.
    const user = await refresh(skin);
    if (user) onSignedIn();
  };

  const startGoogle = async () => {
    setError("");
    if (capabilities.google) {
      /**
       * A full document navigation, and it has to be.
       *
       * The lint rule wants `router.push` for internal destinations, but this
       * destination is not a page: it is a route handler whose entire job is
       * to set a state cookie and 302 the browser to accounts.google.com.
       * `router.push` fetches an RSC payload, gets a redirect to a third-party
       * origin, and cannot follow it — the visitor would sit on this screen
       * while the request quietly failed. They have to *leave*, see which
       * Google account they are about to use, and consent.
       */
      /**
       * COME BACK TO THE DESKTOP, NOT TO THE DOOR.
       *
       * `next` used to be `window.location.pathname` — the door the panel was
       * opened on. So the reward for signing in was the boot sequence again:
       * Google put the visitor back on `/choose-face/dev`, which replayed the
       * BIOS post, the coin, the blink and the password before finally letting
       * them through. Landing on `/dev` skips all of it, which is the whole of
       * "after google oauth login, the next screen should be their desktop".
       *
       * `skin` IS the persona, so the destination is known here and does not
       * have to be guessed from the current path. The callback still refuses
       * anything that is not a local path, and the desktop is still gated: the
       * layout resolves the session against the database on arrival, so this
       * is a destination rather than a way past the check.
       */
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href =
        `/api/auth/google?persona=${skin}&next=${encodeURIComponent(`/${skin}`)}`;
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: skin }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? "Demo sign-in is unavailable.");
        return;
      }
      await finish();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const requestCode = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        error?: string;
        delivered?: boolean;
      };
      if (!body.ok) {
        setError(body.error ?? "Couldn't send a code.");
        return;
      }
      setStage("code");
      setNotice(
        body.delivered
          ? "Code sent. It's good for ten minutes."
          : "No mail provider configured — the code is in the server console.",
      );
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email, code, persona: skin }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? "That code didn't work.");
        return;
      }
      await finish();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const field = cn(
    "w-full px-3 py-2.5 font-mono text-sm outline-none disabled:opacity-60",
    isDotm
      ? "border border-white/20 bg-black text-white placeholder:text-white/25 focus:border-[#ff2244]"
      : "win98-border bg-white text-black placeholder:text-black/35",
  );

  /**
   * The Google button, deliberately quiet on DOTM.
   *
   * It used to be a solid `#ff2244` fill — the loudest thing on a black
   * panel, and louder than the red Continue key on the screen behind it. Two
   * primary-looking reds competing on one screen is a screen with no primary
   * action at all, and the one that actually opens the door is Continue.
   *
   * So this is an outline now: a hairline in the persona's red, red type, and
   * a fill that only arrives on hover. It still reads as the main choice in
   * the panel — it is first, full width, and the only thing above the rule —
   * without shouting past the button it feeds.
   *
   * DEV is unchanged. Its panel sits on a Win98 plate where a bevelled grey
   * button *is* the quiet option, and there is no colour competition to
   * resolve.
   */
  const primary = cn(
    "w-full px-4 py-2.5 font-chrome text-sm uppercase tracking-[0.16em] disabled:opacity-60",
    isDotm
      ? "rounded-lg border border-[#ff2244]/55 bg-transparent text-[#ff8a99] transition-colors hover:border-[#ff2244] hover:bg-[#ff2244]/12 hover:text-white active:bg-[#ff2244]/20"
      : "win98-border win98-press bg-persona-surface text-black",
  );

  return (
    <div
      className={cn(
        "w-[min(92vw,22rem)] p-5",
        isDotm
          ? "rounded-2xl border border-white/12 bg-[#0c0b0f]/95 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          : "win98-border bg-persona-surface text-black shadow-[4px_4px_0_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <p
        className={cn(
          "font-chrome text-[10px] uppercase tracking-[0.36em]",
          isDotm ? "text-[#ff2244]" : "text-[#0a2f5c]",
        )}
      >
        {stage === "choose" ? "Identify yourself" : "Check your mail"}
      </p>

      <h2
        className={cn(
          "mt-2 truncate",
          isDotm
            ? "font-headline text-xl leading-tight"
            : "font-chrome text-lg uppercase tracking-wide",
        )}
      >
        {stage === "choose" ? "Sign in to enter" : email}
      </h2>

      {stage === "choose" ? (
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" onClick={startGoogle} disabled={busy} className={primary}>
            <span className="inline-flex items-center justify-center gap-2.5">
              <GoogleMark />
              {capabilities.google ? "Continue with Google" : "Continue (demo)"}
            </span>
          </button>

          {!capabilities.google && (
            <p
              className={cn(
                "-mt-1 font-mono text-[11px] leading-snug",
                isDotm ? "text-white/40" : "text-black/50",
              )}
            >
              Google isn&apos;t configured yet, so this signs you in as a demo visitor.
              Paste real credentials into the environment and the same button becomes
              the real thing.
            </p>
          )}

          <div className="flex items-center gap-3 py-1">
            <span className={cn("h-px flex-1", isDotm ? "bg-white/12" : "bg-black/20")} />
            <span
              className={cn(
                "font-chrome text-[10px] uppercase tracking-[0.24em]",
                isDotm ? "text-white/35" : "text-black/45",
              )}
            >
              or
            </span>
            <span className={cn("h-px flex-1", isDotm ? "bg-white/12" : "bg-black/20")} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestCode();
            }}
            className="flex flex-col gap-2"
          >
            <label className="sr-only" htmlFor="signin-email">
              Email address
            </label>
            <input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="you@example.com"
              className={field}
            />
            <button
              type="submit"
              disabled={busy || !email}
              className={cn(
                "w-full px-4 py-2.5 font-chrome text-sm uppercase tracking-[0.16em] disabled:opacity-50",
                isDotm
                  ? "border border-white/25 text-white transition-colors hover:border-[#ff2244]"
                  : "win98-border win98-press bg-persona-surface text-black",
              )}
            >
              {busy ? "…" : "Email me a code"}
            </button>
          </form>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode();
          }}
          className="mt-5 flex flex-col gap-3"
        >
          <label className="sr-only" htmlFor="signin-code">
            Six-digit code
          </label>
          <input
            id="signin-code"
            ref={codeRef}
            // `inputMode` rather than `type="number"`: a numeric input strips
            // leading zeros and offers spinner arrows, and a code beginning
            // with 0 is a perfectly ordinary code.
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={busy}
            placeholder="000000"
            className={cn(field, "text-center text-lg tracking-[0.5em]")}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={primary}>
            {busy ? "…" : "Enter"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("choose");
              setCode("");
              setError("");
              setNotice("");
            }}
            className={cn(
              "font-chrome text-[11px] uppercase tracking-[0.18em] underline-offset-4 hover:underline",
              isDotm ? "text-white/45" : "text-black/55",
            )}
          >
            Use a different address
          </button>
        </form>
      )}

      {(notice || error) && (
        <p
          aria-live="polite"
          className={cn(
            "mt-3 font-mono text-[11px] leading-snug",
            error
              ? isDotm
                ? "text-[#ff6b7a]"
                : "text-[#a11020]"
              : isDotm
                ? "text-white/50"
                : "text-black/55",
          )}
        >
          {error || notice}
        </p>
      )}
    </div>
  );
}

/**
 * Google's mark, in its own colours.
 *
 * Brand guidelines require the four-colour G and forbid recolouring it, so it
 * keeps its palette on both skins rather than taking the button's foreground
 * the way every other icon here does.
 */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
