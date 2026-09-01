/**
 * The Live Stats window, as three platform panels.
 *
 * This replaces the old four-group audience report, which was sixteen tiles
 * on a scroll — a wall of numbers where nothing was the headline. Each panel
 * here carries two figures, big enough to fill the window, so opening it
 * answers one question instead of posing sixteen.
 *
 * WHERE THE NUMBERS COME FROM. Each metric declares its own `source`, and
 * that declaration is the honest part of this file:
 *
 *   "api"    — collected automatically every two days by
 *              `scripts/sync-stats.mjs`, whether from a documented endpoint
 *              (YouTube, Spotify catalogue) or by reading a public page
 *              (Instagram followers, Spotify monthly listeners). The site
 *              itself calls nothing; it reads what that job stored.
 *   "manual" — reachable by neither. YouTube Studio's unique viewers,
 *              Instagram's insights and Spotify-for-Artists' playlist adds
 *              exist only behind a dashboard login and appear on no public
 *              page, so a person enters them in /admin.
 *
 * ON SCRAPING. Two of the "api" figures are scraped, which is against those
 * platforms' terms — a deliberate decision, not an oversight, taken because
 * the alternative was a permanently hand-typed number. It reads pages any
 * visitor can see, once every two days, from a scheduled job that is nowhere
 * near the request path.
 *
 * Whatever the source, the last collected value is stored, so a failed scrape
 * or an expired key shows the previous figure rather than a blank. A figure
 * typed into /admin overrides the collected one — see `lib/audience.ts` for
 * why that lives in its own row. An unset figure with nothing stored renders
 * an em dash: a missing number is honest, an invented one is not.
 *
 * This module is the single definition of the labels, the keys and the copy:
 * the window renders from it, the API reads from it, and /admin builds its
 * form from it. Adding a metric here makes it appear in all three.
 */

export type StatPlatform = "youtube" | "instagram" | "spotify";

/** Where a figure can come from. See the note above. */
export type StatSource = "api" | "manual";

export interface PanelMetric {
  /** Stable id, used for React keys. */
  id: string;
  /** The `manual_stats` row this reads. Permanent — renaming loses the value. */
  key: string;
  label: string;
  /** One line under the number, saying what it actually counts. */
  description: string;
  source: StatSource;
}

/**
 * The `manual_stats` row holding a figure's period-on-period change, as a
 * percentage.
 *
 * Derived from the figure's own key rather than declared alongside it, so a
 * metric cannot end up with a change row pointing at a different metric — the
 * failure mode of every parallel list.
 *
 * These are always entered by hand and always signed: a figure can fall, and
 * `-4` has to survive the round trip as -4 rather than being rejected the way
 * the follower-count parser rejects a negative. `lib/audience.ts` is not the
 * reader for these; see `PANEL_CHANGE_KEYS` and /api/audience.
 */
export function changeKeyFor(metricKey: string): string {
  return `${metricKey}_change_pct`;
}

/** An outbound button under a panel's figures. */
export interface PanelAction {
  label: string;
  href: string;
}

export interface StatPanel {
  id: StatPlatform;
  label: string;
  /** Brand colour for the active filter and the panel's accents. */
  accent: string;
  /** Readable on `accent`, for text that sits directly on it. */
  onAccent: string;
  /** One line under the panel title. */
  blurb: string;
  /**
   * The window these figures are read over, set above them. Omitted where
   * the figures are lifetime totals — labelling a running total "last 28
   * days" would be a plain misstatement of what the number is.
   */
  period?: string;
  metrics: PanelMetric[];
  action?: PanelAction;
}

/** The window Instagram and Spotify both report their rolling figures over. */
const ROLLING_WINDOW = "Last 28 days";

export const statPanels: StatPanel[] = [
  {
    id: "youtube",
    label: "YouTube",
    accent: "#ff0033",
    onAccent: "#ffffff",
    blurb: "The visual HQ: high-production visuals for a locked-in audience",
    metrics: [
      {
        id: "yt-subscribers",
        // Shared with the desktop counter, which sums this with Instagram
        // followers. One figure, one row, two places that read it.
        key: "youtube_subscribers",
        label: "Subscribers",
        description: "People subscribed to the channel right now.",
        source: "api",
      },
      {
        id: "yt-unique",
        key: "youtube_unique_viewers_28d",
        label: "Unique viewers",
        description:
          "People, not plays, in the last 28 days. Someone who watched six times counts once.",
        source: "manual",
      },
    ],
    action: {
      label: "Subscribe on YouTube",
      // `sub_confirmation=1` opens YouTube with the subscribe dialog already
      // raised, so the button does the thing it says rather than dropping the
      // visitor on a channel page to find it themselves.
      href: "https://www.youtube.com/@devilonthemic?sub_confirmation=1",
    },
  },
  {
    id: "instagram",
    label: "Instagram",
    accent: "#d62976",
    onAccent: "#ffffff",
    blurb: "Where lifestyle meets discography",
    period: ROLLING_WINDOW,
    action: {
      label: "Follow DOTM",
      href: "https://www.instagram.com/devilonthemic/",
    },
    metrics: [
      {
        id: "ig-followers",
        key: "instagram_followers",
        label: "Followers",
        description: "Accounts following the profile.",
        source: "api",
      },
      {
        id: "ig-views",
        key: "instagram_views_28d",
        label: "Views",
        description: "Every time a post, reel or story was seen.",
        // Insights-only. The follower count is on the public profile and gets
        // scraped; this is on no page at all, and reaching it would mean the
        // entire Graph API setup — Business account, linked Page, four
        // permissions, long-lived token — for this one figure.
        source: "manual",
      },
    ],
  },
  {
    id: "spotify",
    label: "Spotify",
    accent: "#1ed760",
    onAccent: "#062d16",
    blurb: "Pure catalog depth, high save rates, and endless repeat plays",
    period: ROLLING_WINDOW,
    action: {
      label: "Follow DOTM",
      href: "https://open.spotify.com/artist/2AL0XQ1mbnWU5xVR6R4KRa",
    },
    metrics: [
      {
        id: "sp-listeners",
        // The one key predating this module — /admin has kept it since before
        // the panels existed, so it is reused rather than duplicated.
        key: "spotify_monthly_listeners",
        label: "Monthly listeners",
        description: "Distinct listeners in the window, as Spotify counts them.",
        // Collected, but by a headless browser rather than an endpoint: the
        // figure exists nowhere in the Web API at any access tier, and the
        // artist page is client-rendered, so neither the raw HTML nor the
        // /embed/ JSON carries it.
        source: "api",
      },
      {
        id: "sp-playlist-adds",
        key: "spotify_playlist_adds_28d",
        label: "Playlist adds",
        description: "Times a track was added to someone's own playlist.",
        source: "manual",
      },
    ],
  },
];

/** Every key these panels read, for the API's single batched resolve. */
export const PANEL_STAT_KEYS: string[] = statPanels.flatMap((panel) =>
  panel.metrics.map((metric) => metric.key),
);

/**
 * Every change row, in the same order as `PANEL_STAT_KEYS`.
 *
 * Kept apart from the figures because they resolve differently: a figure can
 * come from a live endpoint and is never negative, a change is always entered
 * by hand and frequently is.
 */
export const PANEL_CHANGE_KEYS: string[] = PANEL_STAT_KEYS.map(changeKeyFor);

/** Keys a live endpoint can supply, when its credentials are configured. */
export const API_STAT_KEYS: string[] = statPanels.flatMap((panel) =>
  panel.metrics.filter((m) => m.source === "api").map((m) => m.key),
);
