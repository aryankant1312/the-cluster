"use client";

import { useEffect, useState } from "react";
import { getCountdownState, type CountdownState } from "@/lib/countdown";

export function useCountdown(targetIso: string): CountdownState {
  const [state, setState] = useState<CountdownState>(() => getCountdownState(targetIso));

  useEffect(() => {
    const interval = setInterval(() => {
      setState(getCountdownState(targetIso));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return state;
}
