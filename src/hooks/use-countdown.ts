"use client";

import { useEffect, useState } from "react";
import { getCountdownState, type CountdownState } from "@/lib/countdown";

// Static shape shared by server render and the client's first hydration pass.
// Computing via Date.now() here would make the two diverge (SSR clock vs.
// hydration-time clock, possibly crossing a second boundary) and trigger a
// React hydration mismatch. The real value is filled in client-side on mount.
const PLACEHOLDER: CountdownState = {
  phase: "normal",
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalMs: 0,
};

export function useCountdown(targetIso: string): CountdownState {
  const [state, setState] = useState<CountdownState>(PLACEHOLDER);

  useEffect(() => {
    setState(getCountdownState(targetIso));
    const interval = setInterval(() => {
      setState(getCountdownState(targetIso));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return state;
}
