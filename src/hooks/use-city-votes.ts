"use client";

import { useCallback, useEffect, useState } from "react";
import { voteCities } from "@/content/vote-cities";

/**
 * The "where next?" vote board, shared by both personas.
 *
 * Counts live in the database, so both screens agree with each other and a
 * cleared browser does not wipe the board.
 *
 * One vote per city per session. `sessionStorage` rather than `localStorage`
 * is the deliberate choice: the rule is per *session*, so closing the tab
 * starts a fresh ballot. This is a hype meter, not an election — the guard
 * exists to stop one person hammering a single city, not to be unspoofable,
 * and the server records a hashed IP on every tap if that ever needs auditing.
 */

const SEED: Record<string, number> = Object.fromEntries(
  voteCities.map((c) => [c.id, c.votes]),
);

const STORAGE_KEY = "cluster-voted-cities";

function readVoted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? new Set(raw as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export interface CityVotesState {
  counts: Record<string, number>;
  /** Cities already voted for this session. These are locked out. */
  voted: Set<string>;
  hasVoted: (cityId: string) => boolean;
  loading: boolean;
  vote: (cityId: string) => void;
}

export function useCityVotes(): CityVotesState {
  const [counts, setCounts] = useState<Record<string, number>>(SEED);
  const [voted, setVoted] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);

  /**
   * Board and ballot load together, inside the async callback rather than the
   * effect body.
   *
   * `sessionStorage` is read after mount, never during render — the server
   * has no session storage, so seeding state from it directly would desync
   * hydration. Reading it inside the fetch callback keeps that property while
   * avoiding a synchronous setState in the effect body.
   */
  useEffect(() => {
    let cancelled = false;
    const restoreBallot = () => {
      const stored = readVoted();
      if (stored.size > 0) setVoted(stored);
    };

    fetch("/api/votes")
      .then((r) => r.json())
      .then((body: { counts?: Record<string, number> }) => {
        if (cancelled) return;
        if (body.counts) setCounts(body.counts);
        restoreBallot();
      })
      .catch(() => {
        // Keep the seed board rather than blanking the leaderboard, but still
        // restore whatever this session has already voted for.
        if (!cancelled) restoreBallot();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const vote = useCallback((cityId: string) => {
    // Checked against storage rather than state so two rapid clicks in the
    // same tick cannot both get through.
    const already = readVoted();
    if (already.has(cityId)) return;

    const next = new Set(already).add(cityId);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Storage unavailable (private mode, quota). The vote still counts;
      // only the repeat guard is lost.
    }
    setVoted(next);
    setCounts((prev) => ({ ...prev, [cityId]: (prev[cityId] ?? 0) + 1 }));

    fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city_id: cityId }),
    })
      .then((r) => r.json())
      .then((body: { ok?: boolean; counts?: Record<string, number> }) => {
        if (!body.ok) throw new Error("rejected");
        // The server's board is authoritative: it also carries other
        // visitors' taps that landed since this page loaded.
        if (body.counts) setCounts(body.counts);
      })
      .catch(() => {
        // Roll back both the count and the lock, so the visitor can try
        // again. Showing a vote that was never stored is worse than none.
        setCounts((prev) => ({
          ...prev,
          [cityId]: Math.max(SEED[cityId] ?? 0, (prev[cityId] ?? 1) - 1),
        }));
        const reverted = readVoted();
        reverted.delete(cityId);
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...reverted]));
        } catch {
          /* nothing more to do */
        }
        setVoted(reverted);
      });
  }, []);

  return {
    counts,
    voted,
    hasVoted: (cityId: string) => voted.has(cityId),
    loading,
    vote,
  };
}
