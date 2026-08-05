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

export function CountdownWidget({ className }: { className?: string }) {
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
      <div className={cn("font-chrome text-xs tracking-widest text-danger animate-pulse", className)}>
        TWENTY-FOUR HOURS.
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 font-chrome text-xs", className)}>
      <span className="tabular-nums tracking-wider">
        {state.days}D {pad(state.hours)}:{pad(state.minutes)}:{pad(state.seconds)}
      </span>
      <span className="hidden sm:inline text-fg-muted truncate max-w-[16ch]">
        {line[locale]}
      </span>
    </div>
  );
}
