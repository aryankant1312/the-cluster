import { NextResponse } from "next/server";
import { stats } from "@/lib/db/repositories";
import { resolveAudienceStats } from "@/lib/audience";
import type { StatSource } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every recorded figure and its 30-day movement, straight out of the database.
 *
 * This route used to call YouTube and Spotify itself and write a snapshot on
 * the way through, which made a visitor's page load wait on two third parties
 * and spent API quota per request. Collection now happens once every two days
 * in `scripts/sync-stats.mjs`; this reads what that wrote, and calls nothing.
 *
 * Nothing is fabricated. A metric the sync job has never recorded contributes
 * no tile, and a delta without enough history is omitted rather than shown as
 * zero — "no change" and "we have not been watching long enough" are different
 * statements, and only one of them would be true.
 */

export interface StatTile {
  id: string;
  label: string;
  value: number;
  /** How the number was obtained; `manual` means somebody typed it in. */
  origin: "live" | "manual";
}

export interface StatDelta {
  id: string;
  label: string;
  change: number;
  days: number;
  since: string;
}

/** Series the sync job records, and what each is called on screen. */
const SERIES: Array<{ id: string; label: string; source: StatSource; metric: string }> = [
  { id: "yt-subs", label: "YouTube subscribers", source: "youtube", metric: "subscribers" },
  { id: "yt-views", label: "YouTube views", source: "youtube", metric: "views" },
  { id: "yt-videos", label: "Videos released", source: "youtube", metric: "videos" },
  { id: "sp-followers", label: "Spotify followers", source: "spotify", metric: "followers" },
  { id: "sp-releases", label: "Releases", source: "spotify", metric: "releases" },
  { id: "sp-popularity", label: "Popularity score", source: "spotify", metric: "popularity" },
  { id: "sp-listeners", label: "Monthly listeners", source: "spotify", metric: "monthly_listeners" },
];

/** The movements worth showing, where a series has enough history to support one. */
const DELTAS: Array<{ id: string; label: string; source: StatSource; metric: string }> = [
  { id: "d-subs", label: "New YouTube subscribers", source: "youtube", metric: "subscribers" },
  { id: "d-views", label: "New views", source: "youtube", metric: "views" },
  { id: "d-followers", label: "New Spotify followers", source: "spotify", metric: "followers" },
  { id: "d-listeners", label: "New monthly listeners", source: "spotify", metric: "monthly_listeners" },
];

/** Which recorded metric a person can override in /admin, and under which key. */
const OVERRIDABLE: Record<string, string> = {
  monthly_listeners: "spotify_monthly_listeners",
  subscribers: "youtube_subscribers",
};

export async function GET() {
  try {
    const tiles: StatTile[] = [];
    let capturedOn = "";

    // Which figures a person has overridden, so a typed number is never
    // labelled as though a machine produced it.
    const overrides = await resolveAudienceStats(Object.values(OVERRIDABLE));

    for (const s of SERIES) {
      const row = await stats.latest(s.source, s.metric);
      if (!row) continue;
      if (row.captured_on > capturedOn) capturedOn = row.captured_on;

      const overrideKey = OVERRIDABLE[s.metric];
      const overridden = overrideKey ? overrides[overrideKey] : undefined;
      const isOverridden = overridden?.origin === "manual" && overridden.value !== null;

      tiles.push({
        id: s.id,
        label: s.label,
        value: isOverridden ? (overridden.value as number) : row.value,
        origin: isOverridden ? "manual" : "live",
      });
    }

    const deltas: StatDelta[] = [];
    for (const spec of DELTAS) {
      const d = await stats.delta(spec.source, spec.metric, 30);
      if (d && d.change !== 0) {
        deltas.push({ id: spec.id, label: spec.label, change: d.change, days: 30, since: d.since });
      }
    }

    // The Developer Terms require Spotify content to be attributed and linked
    // back to Spotify, so the source travels with the payload rather than being
    // something each consumer has to remember to add.
    const artist = process.env.SPOTIFY_ARTIST_ID || "2AL0XQ1mbnWU5xVR6R4KRa";
    const attribution = tiles.some((t) => t.id.startsWith("sp-"))
      ? { spotify: `https://open.spotify.com/artist/${artist}` }
      : {};

    return NextResponse.json({ tiles, deltas, capturedOn, attribution });
  } catch {
    // Unreachable database. Say so, rather than implying there are no figures.
    return NextResponse.json({ tiles: [], deltas: [], capturedOn: "", attribution: {}, degraded: true });
  }
}
