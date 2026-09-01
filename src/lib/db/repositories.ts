import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getDriver } from "./driver";
import { ensureSchema } from "./schema";
import type {
  AnalyticsEventType,
  AnalyticsSession,
  AuthSession,
  BookingRequest,
  BookingStatus,
  ManualStat,
  MediaProvider,
  NewsletterSubscriber,
  StatSnapshot,
  StatSource,
  User,
  WallPost,
} from "./types";

async function db() {
  await ensureSchema();
  return getDriver();
}

const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
const nowIso = () => new Date().toISOString();

/** `YYYY-MM-DD` in UTC, the day key used by stat_snapshots. */
export const dayKey = (d: Date = new Date()) => d.toISOString().slice(0, 10);

/**
 * Raw IPs are never stored. The salt makes the hashes useless to anyone who
 * gets the database without also getting the environment.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "the-cluster-dev-salt";
  return "sha256:" + createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

/* -------------------------------------------------------------- Bookings */

export type NewBooking = Omit<BookingRequest, "id" | "status" | "created_at" | "emailed">;

export const bookings = {
  async create(input: NewBooking): Promise<BookingRequest> {
    const row: BookingRequest = {
      ...input,
      id: id("bk"),
      status: "new",
      created_at: nowIso(),
      emailed: 0,
    };
    const d = await db();
    await d.run(
      `INSERT INTO booking_requests
        (id, enquiry_type, city, event_date, event_type, expected_audience,
         budget_range, contact_name, contact_email, contact_phone, message,
         status, created_at, emailed)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        row.id, row.enquiry_type, row.city, row.event_date, row.event_type,
        row.expected_audience, row.budget_range, row.contact_name,
        row.contact_email, row.contact_phone, row.message, row.status,
        row.created_at, row.emailed,
      ],
    );
    return row;
  },

  async list(limit = 100): Promise<BookingRequest[]> {
    const d = await db();
    return d.all<BookingRequest>(
      `SELECT * FROM booking_requests ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
  },

  async setStatus(bookingId: string, status: BookingStatus): Promise<void> {
    const d = await db();
    await d.run(`UPDATE booking_requests SET status = ? WHERE id = ?`, [status, bookingId]);
  },

  async markEmailed(bookingId: string): Promise<void> {
    const d = await db();
    await d.run(`UPDATE booking_requests SET emailed = 1 WHERE id = ?`, [bookingId]);
  },
};

/* ------------------------------------------------------------ Wall posts */

export interface NewWallPost {
  author: string;
  body: string;
  media_url: string;
  media_provider: MediaProvider | "";
  media_embed_id: string;
  ip_hash: string;
}

export const wall = {
  async create(input: NewWallPost): Promise<WallPost> {
    const row: WallPost = { ...input, id: id("wp"), status: "visible", created_at: nowIso() };
    const d = await db();
    await d.run(
      `INSERT INTO wall_posts
        (id, author, body, media_url, media_provider, media_embed_id,
         status, created_at, ip_hash)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        row.id, row.author, row.body, row.media_url, row.media_provider,
        row.media_embed_id, row.status, row.created_at, row.ip_hash,
      ],
    );
    return row;
  },

  async listVisible(limit = 200): Promise<WallPost[]> {
    const d = await db();
    return d.all<WallPost>(
      `SELECT * FROM wall_posts WHERE status = 'visible'
       ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
  },

  /** Rate limiting: how many posts this submitter made since `sinceIso`. */
  async countSince(ipHash: string, sinceIso: string): Promise<number> {
    const d = await db();
    const row = await d.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM wall_posts WHERE ip_hash = ? AND created_at > ?`,
      [ipHash, sinceIso],
    );
    return Number(row?.n ?? 0);
  },

  async report(postId: string, reason: string, ipHash: string): Promise<void> {
    const d = await db();
    await d.run(
      `INSERT INTO post_reports (id, post_id, reason, created_at, ip_hash)
       VALUES (?,?,?,?,?)`,
      [id("rp"), postId, reason, nowIso(), ipHash],
    );
  },

  async remove(postId: string): Promise<void> {
    const d = await db();
    await d.run(`UPDATE wall_posts SET status = 'removed' WHERE id = ?`, [postId]);
  },

  /** Posts with at least one report, most-reported first — the admin queue. */
  async reported(): Promise<Array<WallPost & { report_count: number }>> {
    const d = await db();
    return d.all<WallPost & { report_count: number }>(
      `SELECT p.id, p.author, p.body, p.media_url, p.media_provider,
              p.media_embed_id, p.status, p.created_at, p.ip_hash,
              COUNT(r.id) AS report_count
         FROM wall_posts p
         JOIN post_reports r ON r.post_id = p.id
        WHERE p.status = 'visible'
        GROUP BY p.id, p.author, p.body, p.media_url, p.media_provider,
                 p.media_embed_id, p.status, p.created_at, p.ip_hash
        ORDER BY report_count DESC, p.created_at DESC`,
    );
  },
};

/* ----------------------------------------------------------------- Stats */

export const stats = {
  /**
   * One row per source+metric+day. Re-running on the same day overwrites, so
   * a page view that triggers a refresh cannot inflate the series.
   */
  async record(source: StatSource, metric: string, value: number, on = dayKey()): Promise<void> {
    const d = await db();
    const existing = await d.get<{ id: string }>(
      `SELECT id FROM stat_snapshots WHERE captured_on = ? AND source = ? AND metric = ?`,
      [on, source, metric],
    );
    if (existing) {
      await d.run(`UPDATE stat_snapshots SET value = ? WHERE id = ?`, [value, existing.id]);
      return;
    }
    await d.run(
      `INSERT INTO stat_snapshots (id, captured_on, source, metric, value)
       VALUES (?,?,?,?,?)`,
      [id("ss"), on, source, metric, value],
    );
  },

  async latest(source: StatSource, metric: string): Promise<StatSnapshot | undefined> {
    const d = await db();
    return d.get<StatSnapshot>(
      `SELECT * FROM stat_snapshots WHERE source = ? AND metric = ?
       ORDER BY captured_on DESC LIMIT 1`,
      [source, metric],
    );
  },

  /**
   * Change in a metric over `days`. Returns null when no snapshot is old
   * enough to compare against — a fresh install must say "not enough history
   * yet" rather than imply zero growth.
   */
  async delta(
    source: StatSource,
    metric: string,
    days = 30,
  ): Promise<{ current: number; previous: number; change: number; since: string } | null> {
    const d = await db();
    const current = await stats.latest(source, metric);
    if (!current) return null;

    const cutoff = dayKey(new Date(Date.now() - days * 86_400_000));
    const previous = await d.get<StatSnapshot>(
      `SELECT * FROM stat_snapshots
        WHERE source = ? AND metric = ? AND captured_on <= ?
        ORDER BY captured_on DESC LIMIT 1`,
      [source, metric, cutoff],
    );
    if (!previous) return null;

    return {
      current: Number(current.value),
      previous: Number(previous.value),
      change: Number(current.value) - Number(previous.value),
      since: previous.captured_on,
    };
  },

  async series(source: StatSource, metric: string, days = 90): Promise<StatSnapshot[]> {
    const d = await db();
    const cutoff = dayKey(new Date(Date.now() - days * 86_400_000));
    return d.all<StatSnapshot>(
      `SELECT * FROM stat_snapshots
        WHERE source = ? AND metric = ? AND captured_on >= ?
        ORDER BY captured_on ASC`,
      [source, metric, cutoff],
    );
  },
};

/* ----------------------------------------------------------- City votes */

/**
 * "Where should DOTM play next?" — every tap counts, by design. There is no
 * per-voter cap, so this is an insert-only log and the leaderboard is derived
 * with a GROUP BY rather than read from a counter.
 *
 * The seed numbers in `content/vote-cities.ts` stay the baseline; a city's
 * displayed total is that seed plus the taps recorded here. That keeps the
 * board from reading as all-zeroes on a fresh database.
 */
export const cityVotes = {
  async add(cityId: string, ipHash = ""): Promise<void> {
    const d = await db();
    await d.run(
      `INSERT INTO city_votes (id, city_id, created_at, ip_hash) VALUES (?,?,?,?)`,
      [id("cv"), cityId, nowIso(), ipHash],
    );
  },

  /** `{ [cityId]: tapCount }` for every city that has ever been tapped. */
  async tally(): Promise<Record<string, number>> {
    const d = await db();
    const rows = await d.all<{ city_id: string; n: number }>(
      `SELECT city_id, COUNT(*) AS n FROM city_votes GROUP BY city_id`,
    );
    return Object.fromEntries(rows.map((r) => [r.city_id, Number(r.n)]));
  },
};

/* ------------------------------------------------- Cluster Wall voting */

export interface WallTileTally {
  up: number;
  down: number;
}

export const wallTileVotes = {
  /**
   * Record one person's verdict on one tile.
   *
   * Casting the same way twice takes the vote back — what every interface with
   * a pair of arrows does, and what people try first when they mean to undo.
   * Casting the other way flips it. Neither adds a second row.
   *
   * Returns the voter's standing position, so the interface can light the
   * arrow they are on without a second round trip to find out.
   */
  async cast(tileId: string, value: 1 | -1, voterHash: string): Promise<1 | -1 | 0> {
    const d = await db();
    const existing = await d.get<{ id: string; value: number }>(
      `SELECT id, value FROM wall_tile_votes WHERE tile_id = ? AND voter_hash = ?`,
      [tileId, voterHash],
    );

    if (!existing) {
      await d.run(
        `INSERT INTO wall_tile_votes (id, tile_id, value, voter_hash, created_at)
         VALUES (?,?,?,?,?)`,
        [id("wtv"), tileId, value, voterHash, nowIso()],
      );
      return value;
    }

    if (existing.value === value) {
      await d.run(`DELETE FROM wall_tile_votes WHERE id = ?`, [existing.id]);
      return 0;
    }

    await d.run(`UPDATE wall_tile_votes SET value = ?, created_at = ? WHERE id = ?`, [
      value,
      nowIso(),
      existing.id,
    ]);
    return value;
  },

  /**
   * Every tile's two totals, in one query.
   *
   * One round trip for the whole wall rather than one per tile: the grid draws
   * twenty-five tiles at once, and twenty-five requests to put a number under
   * each of them would be slower than the images they sit on.
   */
  async tally(): Promise<Record<string, WallTileTally>> {
    const d = await db();
    const rows = await d.all<{ tile_id: string; value: number; n: number }>(
      `SELECT tile_id, value, COUNT(*) AS n FROM wall_tile_votes GROUP BY tile_id, value`,
    );
    const out: Record<string, WallTileTally> = {};
    for (const row of rows) {
      const entry = (out[row.tile_id] ??= { up: 0, down: 0 });
      if (Number(row.value) > 0) entry.up = Number(row.n);
      else entry.down = Number(row.n);
    }
    return out;
  },

  /**
   * Each tile's baseline, which the real votes are added to.
   *
   * See the note on `wall_tile_seeds` in the schema for why the floor is one
   * row per tile rather than a great many fabricated votes.
   */
  async seeds(): Promise<Record<string, WallTileTally>> {
    const d = await db();
    const rows = await d.all<{ tile_id: string; up: number; down: number }>(
      `SELECT tile_id, up, down FROM wall_tile_seeds`,
    );
    return Object.fromEntries(
      rows.map((r) => [r.tile_id, { up: Number(r.up), down: Number(r.down) }] as const),
    );
  },

  /** Set or replace one tile's baseline. Idempotent — `tile_id` is the key. */
  async setSeed(tileId: string, up: number, down: number): Promise<void> {
    const d = await db();
    const existing = await d.get<{ tile_id: string }>(
      `SELECT tile_id FROM wall_tile_seeds WHERE tile_id = ?`,
      [tileId],
    );
    if (existing) {
      await d.run(`UPDATE wall_tile_seeds SET up = ?, down = ? WHERE tile_id = ?`, [
        up,
        down,
        tileId,
      ]);
      return;
    }
    await d.run(
      `INSERT INTO wall_tile_seeds (tile_id, up, down, created_at) VALUES (?,?,?,?)`,
      [tileId, up, down, nowIso()],
    );
  },

  /** Which way this voter has already gone, per tile. Drives the lit arrow. */
  async mine(voterHash: string): Promise<Record<string, 1 | -1>> {
    const d = await db();
    const rows = await d.all<{ tile_id: string; value: number }>(
      `SELECT tile_id, value FROM wall_tile_votes WHERE voter_hash = ?`,
      [voterHash],
    );
    return Object.fromEntries(
      rows.map((r) => [r.tile_id, Number(r.value) > 0 ? 1 : -1] as const),
    );
  },
};

/* ----------------------------------------------------------- Newsletter */

export const newsletter = {
  /**
   * Idempotent. Email is the primary key, so a repeat sign-up refreshes the
   * source/timestamp instead of creating a second row — the export never
   * needs de-duplicating. Returns true when this was a genuinely new address.
   */
  async subscribe(email: string, source: string, ipHash = ""): Promise<boolean> {
    const d = await db();
    const key = email.trim().toLowerCase();
    const existing = await d.get<{ email: string }>(
      `SELECT email FROM newsletter_subscribers WHERE email = ?`,
      [key],
    );
    if (existing) {
      await d.run(
        `UPDATE newsletter_subscribers SET source = ?, created_at = ? WHERE email = ?`,
        [source, nowIso(), key],
      );
      return false;
    }
    await d.run(
      `INSERT INTO newsletter_subscribers (email, source, created_at, ip_hash)
       VALUES (?,?,?,?)`,
      [key, source, nowIso(), ipHash],
    );
    return true;
  },

  async list(limit = 500): Promise<NewsletterSubscriber[]> {
    const d = await db();
    return d.all<NewsletterSubscriber>(
      `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
  },

  async count(): Promise<number> {
    const d = await db();
    const row = await d.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM newsletter_subscribers`,
    );
    return Number(row?.n ?? 0);
  },
};

/* --------------------------------------------------------- Timed lyrics */

/**
 * `.lrc` bodies, keyed by the permanent `Track.id`.
 *
 * Stored here rather than as files under `public/lyrics/` because the tagger
 * has to be able to save from a deployed admin page, and every serverless
 * host has a read-only filesystem. Static files still work as a fallback for
 * anything committed to the repo.
 */
export const lyrics = {
  async get(trackId: string): Promise<string | null> {
    const d = await db();
    const row = await d.get<{ lrc: string }>(
      `SELECT lrc FROM track_lyrics WHERE track_id = ?`,
      [trackId],
    );
    return row?.lrc ? row.lrc : null;
  },

  async set(trackId: string, lrc: string): Promise<void> {
    const d = await db();
    const existing = await d.get<{ track_id: string }>(
      `SELECT track_id FROM track_lyrics WHERE track_id = ?`,
      [trackId],
    );
    if (existing) {
      await d.run(`UPDATE track_lyrics SET lrc = ?, updated_at = ? WHERE track_id = ?`, [
        lrc, nowIso(), trackId,
      ]);
      return;
    }
    await d.run(`INSERT INTO track_lyrics (track_id, lrc, updated_at) VALUES (?,?,?)`, [
      trackId, lrc, nowIso(),
    ]);
  },

  /** Track ids that have a stored sheet — drives the "has lyrics" badge. */
  async taggedIds(): Promise<string[]> {
    const d = await db();
    const rows = await d.all<{ track_id: string }>(
      `SELECT track_id FROM track_lyrics WHERE lrc <> ''`,
    );
    return rows.map((r) => r.track_id);
  },
};

/* --------------------------------------------------- Manually-kept values */

export const manualStats = {
  async get(key: string): Promise<string | undefined> {
    const d = await db();
    const row = await d.get<ManualStat>(`SELECT * FROM manual_stats WHERE key = ?`, [key]);
    return row?.value;
  },

  async set(key: string, value: string): Promise<void> {
    const d = await db();
    const existing = await d.get<ManualStat>(`SELECT key FROM manual_stats WHERE key = ?`, [key]);
    if (existing) {
      await d.run(`UPDATE manual_stats SET value = ?, updated_at = ? WHERE key = ?`, [
        value, nowIso(), key,
      ]);
      return;
    }
    await d.run(`INSERT INTO manual_stats (key, value, updated_at) VALUES (?,?,?)`, [
      key, value, nowIso(),
    ]);
  },

  async all(): Promise<ManualStat[]> {
    const d = await db();
    return d.all<ManualStat>(`SELECT * FROM manual_stats ORDER BY key ASC`);
  },
};

/* ------------------------------------------------------------- Accounts */

/**
 * An account is created the first time somebody proves an email address,
 * whichever way they prove it.
 *
 * There is no sign-up step and no sign-up form. Both routes in — Google, and a
 * one-time code — end in the same place: an address the holder has
 * demonstrably got access to. Asking them to pick a password on top of that
 * would add a secret to store and nothing to know.
 */
export const users = {
  async upsertByEmail(input: {
    email: string;
    name?: string;
    picture?: string;
    googleSub?: string;
  }): Promise<User> {
    const d = await db();
    const email = input.email.trim().toLowerCase();
    const now = nowIso();

    const existing = await d.get<User>(`SELECT * FROM users WHERE email = ?`, [email]);

    if (existing) {
      // Only ever fills blanks in. Somebody who signed in by code first and
      // with Google later gains a name and an avatar; somebody who did it the
      // other way round does not lose them to an OTP sign-in that carries
      // neither.
      const next: User = {
        ...existing,
        name: input.name || existing.name,
        picture: input.picture || existing.picture,
        google_sub: input.googleSub || existing.google_sub,
        last_seen_at: now,
      };
      await d.run(
        `UPDATE users SET name = ?, picture = ?, google_sub = ?, last_seen_at = ?
          WHERE id = ?`,
        [next.name, next.picture, next.google_sub, next.last_seen_at, next.id],
      );
      return next;
    }

    const row: User = {
      id: id("usr"),
      email,
      name: input.name ?? "",
      picture: input.picture ?? "",
      google_sub: input.googleSub ?? "",
      created_at: now,
      last_seen_at: now,
    };
    await d.run(
      `INSERT INTO users (id, email, name, picture, google_sub, created_at, last_seen_at)
       VALUES (?,?,?,?,?,?,?)`,
      [
        row.id, row.email, row.name, row.picture, row.google_sub,
        row.created_at, row.last_seen_at,
      ],
    );
    return row;
  },

  async byId(userId: string): Promise<User | undefined> {
    const d = await db();
    return d.get<User>(`SELECT * FROM users WHERE id = ?`, [userId]);
  },

  async count(): Promise<number> {
    const d = await db();
    const row = await d.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`);
    return Number(row?.n ?? 0);
  },
};

/** A row in `auth_otps`. Internal to the sign-in flow. */
export interface AuthOtpRow {
  id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string;
  attempts: number;
  created_at: string;
  ip_hash: string;
}

/**
 * One-time codes.
 *
 * Issuing supersedes: any code still outstanding for an address is consumed
 * the moment a new one is asked for, so pressing "resend" cannot leave two
 * live codes behind and double the surface to guess at.
 */
export const otps = {
  async issue(input: {
    email: string;
    codeHash: string;
    ttlMs: number;
    ipHash?: string;
  }): Promise<void> {
    const d = await db();
    const email = input.email.trim().toLowerCase();
    const now = nowIso();

    await d.run(
      `UPDATE auth_otps SET consumed_at = ? WHERE email = ? AND consumed_at = ''`,
      [now, email],
    );
    await d.run(
      `INSERT INTO auth_otps
        (id, email, code_hash, expires_at, consumed_at, attempts, created_at, ip_hash)
       VALUES (?,?,?,?,'',0,?,?)`,
      [
        id("otp"),
        email,
        input.codeHash,
        new Date(Date.now() + input.ttlMs).toISOString(),
        now,
        input.ipHash ?? "",
      ],
    );
  },

  /** The live code for an address, if there is one. */
  async pending(email: string): Promise<AuthOtpRow | undefined> {
    const d = await db();
    return d.get<AuthOtpRow>(
      `SELECT * FROM auth_otps
        WHERE email = ? AND consumed_at = '' AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1`,
      [email.trim().toLowerCase(), nowIso()],
    );
  },

  async recordAttempt(otpId: string): Promise<void> {
    const d = await db();
    await d.run(`UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?`, [otpId]);
  },

  async consume(otpId: string): Promise<void> {
    const d = await db();
    await d.run(`UPDATE auth_otps SET consumed_at = ? WHERE id = ?`, [nowIso(), otpId]);
  },
};

export const authSessions = {
  async create(input: {
    userId: string;
    /** The door this login came through. Not optional — see `resolve`. */
    persona: "dev" | "dotm";
    ttlMs: number;
    userAgent?: string;
    ipHash?: string;
  }): Promise<AuthSession> {
    const row: AuthSession = {
      id: id("ses"),
      user_id: input.userId,
      persona: input.persona,
      created_at: nowIso(),
      expires_at: new Date(Date.now() + input.ttlMs).toISOString(),
      user_agent: (input.userAgent ?? "").slice(0, 400),
      ip_hash: input.ipHash ?? "",
    };
    const d = await db();
    await d.run(
      `INSERT INTO auth_sessions (id, user_id, persona, created_at, expires_at, user_agent, ip_hash)
       VALUES (?,?,?,?,?,?,?)`,
      [
        row.id,
        row.user_id,
        row.persona,
        row.created_at,
        row.expires_at,
        row.user_agent,
        row.ip_hash,
      ],
    );
    return row;
  },

  /**
   * The account behind a session id *at this door*, or null.
   *
   * `persona` IS REQUIRED, NOT OPTIONAL. Every caller of this function is a
   * gate standing in front of one of the two desktops, and a gate that forgets
   * to say which desktop it guards would accept the other one's session —
   * which is precisely the thing the column was added to prevent. Making it
   * mandatory means that mistake cannot be made silently; it is a type error.
   *
   * A mismatch is NOT treated as an expiry. The row belongs to the other door
   * and is perfectly valid there, so it is left alone and this door simply
   * answers "nobody". Deleting it here would sign somebody out of DEV for the
   * crime of visiting DOTM.
   *
   * An expired row is deleted rather than merely ignored: this is the only
   * code path that ever visits it again, so it is the only chance to tidy up
   * without a scheduled job to do it.
   */
  async resolve(sessionId: string, persona: "dev" | "dotm"): Promise<User | null> {
    const d = await db();
    const row = await d.get<AuthSession>(`SELECT * FROM auth_sessions WHERE id = ?`, [
      sessionId,
    ]);
    if (!row) return null;
    if (row.expires_at <= nowIso()) {
      await d.run(`DELETE FROM auth_sessions WHERE id = ?`, [sessionId]);
      return null;
    }
    // Rows written before the column existed carry "" and match no door, so
    // their holders sign in once more per persona and never again.
    if (row.persona !== persona) return null;

    const user = await d.get<User>(`SELECT * FROM users WHERE id = ?`, [row.user_id]);
    return user ?? null;
  },

  async destroy(sessionId: string): Promise<void> {
    const d = await db();
    await d.run(`DELETE FROM auth_sessions WHERE id = ?`, [sessionId]);
  },
};

/* ------------------------------------------------------------ Analytics */

/**
 * A client-supplied timestamp, or now.
 *
 * Events are buffered in the browser and posted late, so their real time is
 * the client's. But a clock that is wrong — or a hand-written POST — can put a
 * row anywhere in history, and a single row dated 2031 ruins every range query
 * over this table. Anything more than a day either side of the server's own
 * clock is discarded in favour of it.
 */
function plausibleTime(at: string | undefined): string {
  if (!at) return nowIso();
  const t = Date.parse(at);
  if (Number.isNaN(t)) return nowIso();
  const drift = Math.abs(t - Date.now());
  return drift > 24 * 60 * 60 * 1000 ? nowIso() : new Date(t).toISOString();
}

/**
 * Visits, and what happened in them.
 *
 * Writes are best-effort by design — see the route that calls them. Nothing a
 * visitor is doing should fail because a metric could not be filed.
 */
export const analytics = {
  async startSession(input: {
    persona?: string;
    locale?: string;
    referrer?: string;
    userAgent?: string;
    viewport?: string;
    userId?: string;
    ipHash?: string;
  }): Promise<string> {
    const row: AnalyticsSession = {
      id: id("vis"),
      user_id: input.userId ?? "",
      persona: input.persona ?? "",
      locale: input.locale ?? "",
      // Truncated hard. All three are caller-controlled strings and none of
      // them is worth a row the size of a page.
      referrer: (input.referrer ?? "").slice(0, 400),
      user_agent: (input.userAgent ?? "").slice(0, 400),
      viewport: (input.viewport ?? "").slice(0, 20),
      started_at: nowIso(),
      ended_at: "",
      ip_hash: input.ipHash ?? "",
    };
    const d = await db();
    await d.run(
      `INSERT INTO analytics_sessions
        (id, user_id, persona, locale, referrer, user_agent, viewport, started_at, ended_at, ip_hash)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        row.id, row.user_id, row.persona, row.locale, row.referrer,
        row.user_agent, row.viewport, row.started_at, row.ended_at, row.ip_hash,
      ],
    );
    return row.id;
  },

  async endSession(sessionId: string): Promise<void> {
    const d = await db();
    await d.run(
      `UPDATE analytics_sessions SET ended_at = ? WHERE id = ? AND ended_at = ''`,
      [nowIso(), sessionId],
    );
  },

  /**
   * Attach an account to a visit already under way.
   *
   * Somebody arrives anonymous and signs in part-way through, and everything
   * they did before that is still theirs. Backfilling the events as well as
   * the session is what makes "what did this person do" answerable from the
   * moment they landed rather than from the moment they signed in.
   */
  async identify(sessionId: string, userId: string): Promise<void> {
    const d = await db();
    await d.run(`UPDATE analytics_sessions SET user_id = ? WHERE id = ?`, [
      userId,
      sessionId,
    ]);
    await d.run(`UPDATE analytics_events SET user_id = ? WHERE session_id = ?`, [
      userId,
      sessionId,
    ]);
  },

  /**
   * A batch of events, in one call.
   *
   * The client buffers and flushes rather than posting per event: a dock is
   * clicked in bursts, and a request per click is a request per click.
   */
  async record(
    sessionId: string,
    userId: string,
    events: Array<{
      type: AnalyticsEventType;
      name?: string;
      persona?: string;
      windowId?: string;
      route?: string;
      durationMs?: number | null;
      meta?: unknown;
      at?: string;
    }>,
  ): Promise<number> {
    if (events.length === 0) return 0;
    const d = await db();

    for (const e of events) {
      await d.run(
        `INSERT INTO analytics_events
          (id, session_id, user_id, type, name, persona, window_id, route, duration_ms, meta, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id("evt"),
          sessionId,
          userId,
          e.type,
          (e.name ?? "").slice(0, 80),
          (e.persona ?? "").slice(0, 12),
          (e.windowId ?? "").slice(0, 60),
          (e.route ?? "").slice(0, 200),
          // `?? null`, not `?? 0`: a missing duration is unknown, and zero is
          // a measurement.
          e.durationMs ?? null,
          e.meta === undefined ? "" : JSON.stringify(e.meta).slice(0, 1000),
          plausibleTime(e.at),
        ],
      );
    }
    return events.length;
  },
};
