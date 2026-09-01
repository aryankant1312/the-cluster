"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { useRotatingCopy } from "@/hooks/use-rotating-copy";
import { usePersona } from "@/components/providers/PersonaProvider";
import { siteSettings } from "@/content/site-settings";
import { copyPool } from "@/content/copy-pool";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownWidget({
  className,
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  const { locale } = usePersona();
  const state = useCountdown(siteSettings.countdownTarget);
  const line = useRotatingCopy(copyPool.countdownLines);

  if (state.phase === "arrived") {
    return (
      <div className={cn("font-chrome text-xs tracking-wide", className)}>
        THE SPECTRUM HAS ARRIVED.
      </div>
    );
  }

  if (state.phase === "t24h" && siteSettings.featureFlags.t24hTriggerEnabled) {
    return (
      <div
        className={cn(
          "font-chrome text-xs tracking-widest animate-pulse",
          "text-[color:var(--chrome-danger,var(--color-danger))]",
          className,
        )}
      >
        TWENTY-FOUR HOURS.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-chrome text-xs",
        stacked ? "flex flex-col items-center gap-1 text-center" : "flex items-center gap-2",
        className,
      )}
    >
      <span className="tabular-nums tracking-wider">
        {state.days}D {pad(state.hours)}:{pad(state.minutes)}:{pad(state.seconds)}
      </span>
      <span
        className={cn(
          // Chrome surfaces (the top bar) set --chrome-fg-muted to a value
          // that contrasts with them; elsewhere this falls back to the
          // persona token, so the DEV taskbar is unaffected.
          "text-[color:var(--chrome-fg-muted,var(--color-fg-muted))] leading-snug",
          stacked ? "block" : "hidden sm:inline",
        )}
      >
        {line[locale]}
      </span>
    </div>
  );
}
