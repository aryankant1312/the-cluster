/**
 * Row shapes for the persistence layer.
 *
 * Every column is TEXT or INTEGER so a single DDL serves both SQLite and
 * Postgres, and every timestamp is an ISO-8601 string rather than a native
 * date type — the two dialects coerce dates differently and the difference
 * would leak into every read.
 */

export const ENQUIRY_TYPES = [
  "live_show",
  "festival",
  "brand_collab",
  "private_event",
  "feature",
  "interview",
  "other",
] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const ENQUIRY_LABELS: Record<EnquiryType, string> = {
  live_show: "Live show",
  festival: "Festival",
  brand_collab: "Brand collab",
  private_event: "Private event",
  feature: "Feature / music",
  interview: "Interview",
  other: "Other",
};

export type BookingStatus = "new" | "read" | "replied" | "archived";

export interface BookingRequest {
  id: string;
  enquiry_type: EnquiryType;
  city: string;
  /** ISO date, `YYYY-MM-DD`. Empty when the enquiry has no fixed date yet. */
  event_date: string;
  event_type: string;
  expected_audience: string;
  budget_range: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  message: string;
  status: BookingStatus;
  /** ISO-8601 UTC, e.g. `2026-08-16T09:12:04.220Z`. */
  created_at: string;
  /** 1 once the Resend notification has gone out. */
  emailed: number;
}

export type MediaProvider = "youtube" | "instagram" | "other";
export type PostStatus = "visible" | "removed";

export interface WallPost {
  id: string;
  author: string;
  /** The message. May be empty when the post is purely a media link. */
  body: string;
  /** Fan-supplied Instagram/YouTube URL. Empty for a text-only post. */
  media_url: string;
  media_provider: MediaProvider | "";
  /** Provider-specific id used to build an embed URL without re-parsing. */
  media_embed_id: string;
  status: PostStatus;
  created_at: string;
  /** Salted SHA-256 of the submitter's IP. Raw addresses are never stored. */
  ip_hash: string;
}

export interface PostReport {
  id: string;
  post_id: string;
  reason: string;
  created_at: string;
  ip_hash: string;
}

export type StatSource = "spotify" | "youtube" | "manual";

export interface StatSnapshot {
  id: string;
  /** `YYYY-MM-DD`; one row per source+metric+day. */
  captured_on: string;
  source: StatSource;
  metric: string;
  value: number;
}

export interface ManualStat {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * One row per tap. Voting is deliberately uncapped, so this is an event log
 * rather than a counter — `city_votes` is aggregated on read.
 */
export interface CityVote {
  id: string;
  /** Matches an id in `content/vote-cities.ts`. */
  city_id: string;
  created_at: string;
  ip_hash: string;
}

export interface NewsletterSubscriber {
  /** Primary key — re-subscribing overwrites rather than duplicating. */
  email: string;
  /** Which surface captured it, e.g. `dev-contact` or `dotm-contact`. */
  source: string;
  created_at: string;
  ip_hash: string;
}

/**
 * Keys used in `manual_stats`. These are values no public API exposes, so
 * they are entered in /admin and rendered labelled as manually kept.
 */
export const MANUAL_STAT_KEYS = {
  monthlyListeners: "spotify_monthly_listeners",
  instagramFollowers: "instagram_followers",
  youtubeSubscribers: "youtube_subscribers",
  mediaOutreach: "media_outreach",
} as const;

/* ────────────────────────────────────────────────────────────── Accounts */

export interface User {
  id: string;
  /** Lower-cased. The natural key, and uniquely indexed. */
  email: string;
  name: string;
  /** Avatar URL from the identity provider. Empty for OTP-only accounts. */
  picture: string;
  /**
   * Google's stable subject id. Empty until the account signs in with Google
   * at least once — an OTP-only account is a real account, not a stub.
   */
  google_sub: string;
  created_at: string;
  last_seen_at: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  /**
   * Which door this login came through — `"dev"` or `"dotm"`.
   *
   * A session proves somebody signed in at one entrance, not that they are
   * known in general, so each persona resolves only its own rows. Empty on any
   * row written before the column existed; those resolve to nobody and cost
   * their holder one more sign-in per door.
   *
   * Typed as `string` rather than the `Persona` union to match the two
   * `persona` columns already on the analytics tables, and to keep this module
   * free of imports.
   */
  persona: string;
  created_at: string;
  expires_at: string;
  user_agent: string;
  ip_hash: string;
}

/* ───────────────────────────────────────────────────────────── Analytics */

/**
 * The kinds of thing worth recording.
 *
 * A closed union rather than a free string: the whole value of this table is
 * being able to ask "how long in each window", and one caller writing
 * `"windowOpen"` where every other writes `"window_open"` silently halves the
 * answer.
 */
export const ANALYTICS_EVENT_TYPES = [
  "session_start",
  "session_end",
  "window_open",
  "window_close",
  "nav",
  "interaction",
  "auth",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export interface AnalyticsSession {
  id: string;
  /** Empty for a visit that never signed in. */
  user_id: string;
  persona: string;
  locale: string;
  referrer: string;
  user_agent: string;
  /** `WxH` in CSS pixels, e.g. `1440x900`. */
  viewport: string;
  started_at: string;
  /** Empty until the visit ends. */
  ended_at: string;
  ip_hash: string;
}

export interface AnalyticsEvent {
  id: string;
  session_id: string;
  user_id: string;
  type: AnalyticsEventType;
  /** What happened, within the type — e.g. `dock_click`, `track_play`. */
  name: string;
  persona: string;
  /** The window this concerns, for `window_open` / `window_close`. */
  window_id: string;
  route: string;
  /** Null on everything that does not measure a span. See the schema note. */
  duration_ms: number | null;
  /** JSON, or empty. Anything not worth its own column. */
  meta: string;
  created_at: string;
}
