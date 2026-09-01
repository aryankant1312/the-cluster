"use client";

import { useEffect, useMemo, useState } from "react";
import { lrcPathFor } from "@/content/song-stories";
import { parseLrc, type LrcCue, type ParsedLrc } from "@/lib/lrc";

/**
 * The timed lyric sheet for one track.
 *
 * One source: the `.lrc` file under `public/lyrics/` that `song-stories.ts`
 * points at. This used to ask a database first and fall back to the file,
 * which existed to let an in-browser tagger save sheets at runtime. That
 * tagger is gone and the delivered sheets are committed, so the database hop
 * was a round trip that could only ever return null — and, worse, a stale row
 * left behind by the old tool would have silently outranked the real file.
 *
 * A track with no sheet is not a failure: `cues` comes back empty and the
 * caller renders its own empty state. `failed` is set only when the track
 * claimed a sheet and that fetch fell over, which is the one case worth
 * reporting.
 */
export interface TrackLyrics {
  parsed: ParsedLrc | null;
  cues: LrcCue[];
  /** Global shift in seconds; positive delays the lyrics. */
  offset: number;
  loading: boolean;
  failed: boolean;
}

export function useTrackLyrics(trackId: string): TrackLyrics {
  const lrcPath = lrcPathFor(trackId);

  const [lrcText, setLrcText] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(lrcPath));
  const [failed, setFailed] = useState(false);

  /**
   * Clearing the previous song's sheet is derived state, not a side effect —
   * doing it in the effect body would render one frame of the old lyrics
   * against the new track before the reset landed. Adjusted during render
   * instead, per React's guidance on avoiding effects for derived state:
   * https://react.dev/learn/you-might-not-need-an-effect
   */
  const [loadedFor, setLoadedFor] = useState(trackId);
  if (loadedFor !== trackId) {
    setLoadedFor(trackId);
    setLrcText(null);
    setFailed(false);
    setLoading(Boolean(lrcPath));
  }

  useEffect(() => {
    if (!lrcPath) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(lrcPath);
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        if (!cancelled) setLrcText(text);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lrcPath]);

  const parsed = useMemo(() => (lrcText ? parseLrc(lrcText) : null), [lrcText]);

  return {
    parsed,
    cues: parsed?.cues ?? [],
    offset: parsed?.offset ?? 0,
    loading,
    failed,
  };
}
