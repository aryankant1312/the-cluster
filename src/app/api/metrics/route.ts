import { NextResponse } from "next/server";
import { manualStats } from "@/lib/db/repositories";
import { MANUAL_STAT_KEYS } from "@/lib/db/types";
import { resolveAudienceStats } from "@/lib/audience";
import { CLUSTER_DEFAULT, MEDIA_OUTREACH_DEFAULT } from "@/content/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The two desktop counters, and nothing else.
 *
 * "Cluster count" is Instagram followers plus YouTube subscribers, and both of
 * those are resolved through `lib/audience.ts` — the same live-then-cache-then-
 * manual chain the Live Stats window uses. That is deliberate: the wallpaper
 * and the stats window were reading the same two rows by different routes, so
 * configuring the YouTube API key used to update one of them and not the
 * other. There is one path to a figure now.
 *
 * "New cluster fam" has no endpoint behind it and stays a `manual_stats` row
 * with a supplied default.
 *
 * An unset value comes back as null rather than 0. The widget renders a dash
 * for null — a missing number is honest, an invented follower count is not.
 */

/**
 * A stored figure as a number, or null.
 *
 * Digit-group separators are stripped first. The /admin fields are free text
 * and have been filled in the way a person writes a number — "77,000",
 * "1,50,000", "14,05,000 " are all real rows in this table — and a bare
 * `Number()` rejects every one of them, so the panel drew a dash over a figure
 * that had been entered months earlier.
 *
 * Only separators and whitespace are forgiven. Anything still non-numeric
 * afterwards ("4.1 + million") stays null rather than being coerced into a
 * plausible-looking guess: a dash says "nobody has given me this", which is
 * true, where 4.1 would be a fabrication.
 */
function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).replace(/[,\s_]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function GET() {
  try {
    const [audience, outreach] = await Promise.all([
      resolveAudienceStats([
        MANUAL_STAT_KEYS.instagramFollowers,
        MANUAL_STAT_KEYS.youtubeSubscribers,
      ]),
      manualStats.get(MANUAL_STAT_KEYS.mediaOutreach),
    ]);

    const ig = audience[MANUAL_STAT_KEYS.instagramFollowers]?.value ?? null;
    const yt = audience[MANUAL_STAT_KEYS.youtubeSubscribers]?.value ?? null;

    // If only one platform resolved, show that one rather than nothing; if
    // neither has, fall back to the supplied figure rather than a dash.
    const cluster = ig === null && yt === null ? CLUSTER_DEFAULT : (ig ?? 0) + (yt ?? 0);

    return NextResponse.json({
      cluster,
      mediaOutreach: toNumber(outreach) ?? MEDIA_OUTREACH_DEFAULT,
    });
  } catch {
    // No database yet (or it is unreachable). Both supplied figures are known
    // constants, so serve those rather than blanking the desktop.
    return NextResponse.json({
      cluster: CLUSTER_DEFAULT,
      mediaOutreach: MEDIA_OUTREACH_DEFAULT,
      degraded: true,
    });
  }
}
