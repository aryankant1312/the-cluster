"use client";

import Link from "next/link";
import { usePersona } from "@/components/providers/PersonaProvider";
import { SpectrumCountdown } from "@/components/countdown/SpectrumCountdown";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { cn } from "@/lib/utils";

/**
 * THERE IS NO WAY TO CHANGE FACE FROM HERE, AND THAT IS THE DESIGN.
 *
 * This bar used to carry two controls on its right-hand end: a persona switch
 * and a language switch. Both are gone. A visitor arrives at one door, signs
 * in at that door, and stands in that persona — the other one is a separate
 * account decision made at its own entrance, not a toggle in the chrome.
 *
 * What that leaves is the wordmark and the countdown, which is the whole of
 * what this bar was ever for: where you are, and what is coming.
 *
 * `PersonaToggle` and `LocaleToggle` were deleted rather than hidden. A
 * commented-out control is a control somebody re-enables in six months without
 * knowing that the session model underneath it no longer supports switching —
 * see the per-persona cookies in `lib/auth.ts`.
 */
export function PersonaTopBar() {
  const { persona } = usePersona();

  return (
    <header
      className={cn(
        "persona-topbar sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-2",
        persona === "dev" && "win98-border",
      )}
    >
      <Link href={`/${persona}`} className="font-chrome text-lg sm:text-xl tracking-widest">
        THE CLUSTER
      </Link>
      <SpectrumCountdown className="flex-1" />
      {/* The account, top right — the one place both faces now agree on. It
          renders nothing while signed out, so the bar's geometry before the
          first session read is exactly what it was. */}
      <AccountMenu skin={persona} align="right" side="down" />
    </header>
  );
}
