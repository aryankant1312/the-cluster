export type CountdownPhase = "normal" | "t24h" | "arrived";

export interface CountdownState {
  phase: CountdownPhase;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function getCountdownState(targetIso: string, nowMs: number = Date.now()): CountdownState {
  const targetMs = new Date(targetIso).getTime();
  const totalMs = Math.max(0, targetMs - nowMs);

  const phase: CountdownPhase =
    totalMs <= 0 ? "arrived" : totalMs <= TWENTY_FOUR_HOURS_MS ? "t24h" : "normal";

  const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMs / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((totalMs / (60 * 1000)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  return { phase, days, hours, minutes, seconds, totalMs };
}
