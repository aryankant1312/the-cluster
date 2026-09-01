import "server-only";
import { manualStats } from "@/lib/db/repositories";
import { PANEL_STAT_KEYS } from "@/content/stat-panels";

/**
 * One resolver for every audience figure on the site.
 *
 * THE SITE NEVER CALLS AN UPSTREAM API. Every figure here comes out of the
 * database, and the only writer is `scripts/sync-stats.mjs`, running in GitHub
 * Actions every two days. That is the whole design:
 *
 *   - a page load is one database read, not a fan-out to three third parties
 *   - a rate limit, an expired token or a blocked scraper cannot slow down or
 *     break a page; it can only leave a figure unchanged
 *   - API quota is spent once per cycle instead of once per visitor
 *
 * Three layers, tried in order, per metric:
 *
 *   1. OVERRIDE — a figure typed into /admin. Empty by default, and it wins
 *                 when set, because a human with the real number beats an
 *                 automated approximation.
 *   2. CACHE    — whatever the sync job last obtained, whether from an API or
 *                 by scraping. Fresh, automatic, and the normal answer.
 *   3. LEGACY   — a bare `<key>` row from before overrides existed, kept so no
 *                 figure entered months ago is lost.
 *
 * WHY OVERRIDE IS ITS OWN KEY rather than reusing the plain row. Instagram
 * publishes only a rounded follower count to anonymous visitors ("18K"), so
 * the scrape cannot be exact and a typed figure has to be able to beat it. But
 * if that typed figure lived in the row the resolver already prefers, a number
 * entered once would silently outrank every future scrape forever — a figure
 * frozen in place with nothing on screen to say so. A separate,
 * empty-by-default override applies only when deliberately set, and /admin
 * shows it beside the scraped value and its timestamp, so a stale override is
 * visible rather than invisible.
 *
 * A metric that has never resolved from anywhere returns null and the window
 * draws a dash. A missing number is honest; an invented one is not.
 */

/**
 * Which layer answered.
 *
 * A scraped figure reports as `live`, deliberately: to a visitor there is no
 * useful difference between a number an API returned and one read off a public
 * page — both are current, both are automatic. The distinction worth drawing
 * is automatic versus typed by hand, and that is what this says.
 */
export type StatOrigin = "live" | "cache" | "manual" | "unset";

export interface ResolvedStat {
  value: number | null;
  origin: StatOrigin;
  /** ISO timestamp of the sync that produced it, when one did. */
  fetchedAt?: string;
}

export type ResolvedStats = Record<string, ResolvedStat>;

/** Written by the sync job. Prefixed so it can never collide with a typed row. */
const cacheKey = (key: string) => "cache:" + key;
/** Written by the sync job alongside each cached value. */
const fetchedAtKey = (key: string) => "fetched_at:" + key;
/** Written by /admin. Empty unless someone deliberately sets it. */
const overrideKey = (key: string) => "override:" + key;

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
function toNumber(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).replace(/[,\s_]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Resolve every requested figure from the database.
 *
 * Nothing here writes, and nothing here reaches the network. A database that
 * is unreachable yields `unset` for everything rather than throwing, so the
 * desktop renders dashes instead of failing to render at all.
 */
export async function resolveAudienceStats(
  keys: string[] = PANEL_STAT_KEYS,
): Promise<ResolvedStats> {
  const entries = await Promise.all(
    keys.map(async (key): Promise<[string, ResolvedStat]> => {
      let override: number | null = null;
      let cached: number | null = null;
      let legacy: number | null = null;
      let fetchedAt: string | undefined;

      try {
        const [o, c, l, at] = await Promise.all([
          manualStats.get(overrideKey(key)).then(toNumber),
          manualStats.get(cacheKey(key)).then(toNumber),
          manualStats.get(key).then(toNumber),
          manualStats.get(fetchedAtKey(key)),
        ]);
        override = o;
        cached = c;
        legacy = l;
        fetchedAt = at || undefined;
      } catch {
        // No database configured, or it is unreachable. Nothing to resolve.
        return [key, { value: null, origin: "unset" }];
      }

      if (override !== null) return [key, { value: override, origin: "manual", fetchedAt }];
      if (cached !== null) return [key, { value: cached, origin: "live", fetchedAt }];
      if (legacy !== null) return [key, { value: legacy, origin: "manual" }];
      return [key, { value: null, origin: "unset" }];
    }),
  );

  return Object.fromEntries(entries);
}

/** Just the numbers, for callers that do not care where each came from. */
export function valuesOf(stats: ResolvedStats): Record<string, number | null> {
  return Object.fromEntries(
    Object.entries(stats).map(([key, stat]) => [key, stat.value]),
  );
}
