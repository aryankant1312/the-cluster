import { NextResponse } from "next/server";
import { resolveAudienceStats } from "@/lib/audience";
import { manualStats } from "@/lib/db/repositories";
import { PANEL_CHANGE_KEYS, PANEL_STAT_KEYS } from "@/content/stat-panels";

export const runtime = "nodejs";

/**
 * The figures behind the Live Stats window's three platform panels.
 *
 * All the thinking lives in `lib/audience.ts`: a figure typed into /admin
 * first, then whatever the sync job last collected, then any legacy entered
 * value. This route is the HTTP wrapper.
 *
 * No upstream API is called here or anywhere else in the site — collection
 * happens every two days in `scripts/sync-stats.mjs`, so serving this costs
 * one database read and no third-party quota. `dynamic = "force-dynamic"`
 * because a statically rendered response would freeze a figure at build time
 * and never pick up what the next sync writes.
 *
 * Reading is public — the same class of figure the desktop counters already
 * serve unauthenticated. Writing goes through the authenticated
 * `set_manual_stat` action on /api/admin, so this route is GET-only.
 *
 * An unset key comes back as null rather than 0, and the window renders a dash
 * for it: a number nobody has entered and no endpoint has ever returned is not
 * zero.
 *
 * `changes` rides alongside `values`: the period-on-period movement of each
 * figure, as a percentage, entered by hand in /admin. It does NOT go through
 * `resolveAudienceStats` — that resolver exists to prefer a live endpoint over
 * an entered figure, and no endpoint reports these; more to the point its
 * parser floors at zero, which is right for a follower count and wrong for a
 * change that can be negative. So these are read straight off `manual_stats`
 * with a parser that keeps the sign.
 */
export const dynamic = "force-dynamic";

/**
 * An entered percentage, sign intact, or null.
 *
 * Separators and a trailing `%` are forgiven, because the field is free text
 * and "+12%", "12" and "-4 %" are all the same thing typed by three different
 * people. A leading `+` is dropped for `Number()`, which does not accept one.
 * Anything still non-numeric stays null and draws nothing — a change nobody
 * entered is absent, not flat.
 */
function toSignedNumber(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).replace(/[,\s_%]/g, "").replace(/^\+/, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function resolveChanges(): Promise<Record<string, number | null>> {
  const rows = await Promise.all(
    PANEL_CHANGE_KEYS.map(async (key): Promise<[string, number | null]> => [
      key,
      toSignedNumber(await manualStats.get(key)),
    ]),
  );
  return Object.fromEntries(rows);
}

export async function GET() {
  try {
    const [stats, changes] = await Promise.all([
      resolveAudienceStats(),
      // A missing or unreachable database means no changes, which renders as
      // no pills — the figures themselves are the point and they resolve on
      // their own path.
      resolveChanges().catch(() => ({}) as Record<string, number | null>),
    ]);
    return NextResponse.json({
      values: Object.fromEntries(
        Object.entries(stats).map(([key, s]) => [key, s.value]),
      ),
      changes,
      // Which layer answered, per key. The client caches live and cached
      // figures locally and paints them instantly on the next visit.
      origins: Object.fromEntries(
        Object.entries(stats).map(([key, s]) => [key, s.origin]),
      ),
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    // The resolver swallows provider and database failures on its own, so
    // reaching here means something unforeseen. Every panel then shows dashes
    // — the same thing an unset key shows, so the window stays honest rather
    // than erroring.
    return NextResponse.json({
      values: Object.fromEntries(PANEL_STAT_KEYS.map((key) => [key, null])),
      changes: Object.fromEntries(PANEL_CHANGE_KEYS.map((key) => [key, null])),
      origins: Object.fromEntries(PANEL_STAT_KEYS.map((key) => [key, "unset"])),
      fetchedAt: new Date().toISOString(),
      degraded: true,
    });
  }
}
