/**
 * The two figures that count up on both desktops.
 *
 * `cluster` is Instagram followers + YouTube subscribers, and as of
 * 2026-09-01 the two halves no longer come from the same place.
 *
 * YOUTUBE IS LIVE. `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` are configured,
 * and `/api/audience` reports `youtube_subscribers` with `origin: "live"` off
 * the Data API v3 `channels?part=statistics` call. Note that what arrives is
 * YouTube's own *rounded* public count — 20,000, not the exact number, which
 * no public endpoint discloses.
 *
 * INSTAGRAM IS STILL BY HAND. `INSTAGRAM_USER_ID` and
 * `INSTAGRAM_ACCESS_TOKEN` are unset, and the Graph API will not answer at
 * all without a Business or Creator account linked to a Facebook Page, so
 * that half comes from the /admin row and reports `origin: "manual"`.
 *
 * The sum is therefore half live and half entered, which `/api/metrics`
 * handles by adding whatever each side resolved to. There is deliberately no
 * per-side fallback figure: publishing an invented follower count is worse
 * than showing a dash until the real one is set.
 *
 * `mediaOutreach` has a fixed, supplied value and so ships as a default that
 * /admin can still override.
 */

export interface DesktopMetric {
  id: "cluster" | "mediaOutreach";
  label: string;
  /** null renders a dash — "not set yet", never a guessed number. */
  value: number | null;
}

/** Supplied figure: 50,00,000 (fifty lakh). */
export const MEDIA_OUTREACH_DEFAULT = 5_000_000;

/**
 * Supplied figure: 41,765 — Instagram followers plus YouTube subscribers.
 *
 * A default rather than a hardcode: /admin still overrides it, and the moment
 * either platform figure is entered there the sum wins. This just means the
 * desktop shows the real number today instead of a dash.
 */
export const CLUSTER_DEFAULT = 41_765;

/**
 * The line under each figure — and the only line, now.
 *
 * There used to be a label above the number as well ("CLUSTER", "MEDIA
 * OUTREACH") and a caption below it saying what the number counted. Two
 * pieces of chrome around one figure on a wallpaper is one too many: the
 * label repeated what the caption already said, in smaller type, above
 * artwork it was competing with. What survives is the caption, promoted to
 * carry the name.
 */
export const METRIC_CAPTIONS = {
  cluster: "Cluster count",
  // Was "New cluster fam", which named an audience while the figure behind it
  // is the /admin row called Media outreach — reach, not people who joined.
  mediaOutreach: "Cluster outreach",
} as const;

/**
 * The window each figure is read over, set beneath the caption in a lighter
 * weight so it reads as a qualifier rather than as a second label.
 */
export const METRIC_PERIOD = "last 28 days";

/**
 * Indian digit grouping — 50,00,000 rather than 5,000,000. `en-IN` groups by
 * lakh and crore, which is how the audience for this site reads a number.
 */
export function formatIndian(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}
