"use client";

import { useEffect, useState } from "react";
import type { LocalizedString } from "@/content/types";

/**
 * Server and client must render the same line on first paint (else React
 * flags a hydration mismatch), so the random pick only happens client-side
 * after mount — the line swaps in a beat after load, which reads fine for
 * flavor copy like this.
 */
export function useRotatingCopy(pool: LocalizedString[]): LocalizedString {
  const [line, setLine] = useState<LocalizedString>(pool[0]);

  useEffect(() => {
    const index = Math.floor(Math.random() * pool.length);
    setLine(pool[index] ?? pool[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return line;
}
