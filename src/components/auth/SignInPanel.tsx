"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

type Skin = "dotm" | "dev";

/** Google is the single public sign-in path. The OTP API remains available
 * for the future, but it is intentionally absent from this interface. */
export function SignInPanel({ skin, onSignedIn, className }: {
  skin: Skin;
  onSignedIn: () => void;
  className?: string;
}) {
  const { capabilities, refresh } = useAuth();
  const isDotm = skin === "dotm";
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finish = async () => {
    const user = await refresh(skin);
    if (user) onSignedIn();
  };

  const startGoogle = async () => {
    setError("");
    if (capabilities.google) {
      // This endpoint redirects to Google, so it requires a document navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href =
        `/api/auth/google?persona=${skin}&remember=${remember ? "1" : "0"}&next=${encodeURIComponent(`/${skin}`)}`;
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: skin, remember }),
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

  const primary = cn(
    "w-full px-4 py-2.5 font-chrome text-sm uppercase tracking-[0.16em] disabled:opacity-60",
    isDotm
      ? "rounded-lg border border-[#ff2244]/55 bg-transparent text-[#ff8a99] transition-colors hover:border-[#ff2244] hover:bg-[#ff2244]/12 hover:text-white active:bg-[#ff2244]/20"
      : "win98-border win98-press bg-persona-surface text-black",
  );

  return (
    <div className={cn(
      "w-[min(92vw,22rem)] p-5",
      isDotm
        ? "rounded-2xl border border-white/12 bg-[#0c0b0f]/95 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        : "win98-border bg-persona-surface text-black shadow-[4px_4px_0_rgba(0,0,0,0.45)]",
      className,
    )}>
      <h2 className={cn(
        "truncate",
        isDotm ? "font-headline text-xl leading-tight" : "font-chrome text-lg uppercase tracking-wide",
      )}>
        Sign in to enter
      </h2>

      <label className="mt-4 flex items-start gap-2 font-body text-xs">
        <input
          type="checkbox"
          checked={remember}
          disabled={busy}
          onChange={(event) => setRemember(event.target.checked)}
          className="mt-0.5"
        />
        <span>Remember me</span>
      </label>

      <button type="button" onClick={startGoogle} disabled={busy} className={cn(primary, "mt-5")}>
        <span className="inline-flex items-center justify-center gap-2.5">
          <GoogleMark />
          {busy ? "…" : capabilities.google ? "Continue with Google" : "Continue (demo)"}
        </span>
      </button>

      {error && (
        <p role="alert" className={cn(
          "mt-3 font-mono text-[11px] leading-snug",
          isDotm ? "text-[#ff6b7a]" : "text-[#a11020]",
        )}>
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.3c1.9-1.8 2.9-4.4 2.9-7.7Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.8A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 13.8a6 6 0 0 1 0-3.6V7.4H3.1a10 10 0 0 0 0 9.2l3.4-2.8Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 3.1 7.4l3.4 2.8A5.9 5.9 0 0 1 12 6.1Z" />
    </svg>
  );
}
