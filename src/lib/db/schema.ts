import "server-only";

import { getDriver } from "./driver";

/**
 * Portable DDL. Every column is TEXT or INTEGER and every timestamp is an
 * ISO-8601 string, so one set of statements works unchanged on SQLite and
 * Postgres. Ids are application-generated strings rather than autoincrement
 * integers for the same reason.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS booking_requests (
    id TEXT PRIMARY KEY,
    enquiry_type TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    event_date TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL DEFAULT '',
    expected_audience TEXT NOT NULL DEFAULT '',
    budget_range TEXT NOT NULL DEFAULT '',
    contact_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    emailed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_booking_created
     ON booking_requests (created_at)`,

  `CREATE TABLE IF NOT EXISTS wall_posts (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL DEFAULT '',
    media_provider TEXT NOT NULL DEFAULT '',
    media_embed_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'visible',
    created_at TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_wall_visible
     ON wall_posts (status, created_at)`,

  `CREATE TABLE IF NOT EXISTS post_reports (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES wall_posts(id),
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_report_post ON post_reports (post_id)`,

  // One row per source+metric+day. The deltas the stats view shows
  // ("X new listeners in 30 days") are derived by diffing this series —
  // no upstream API exposes that number directly.
  `CREATE TABLE IF NOT EXISTS stat_snapshots (
    id TEXT PRIMARY KEY,
    captured_on TEXT NOT NULL,
    source TEXT NOT NULL,
    metric TEXT NOT NULL,
    value INTEGER NOT NULL,
    UNIQUE (captured_on, source, metric)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_snapshot_series
     ON stat_snapshots (source, metric, captured_on)`,

  `CREATE TABLE IF NOT EXISTS manual_stats (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`,

  // Append-only tap log rather than a counter column. Votes are deliberately
  // unlimited, so each tap is its own row and the leaderboard is a GROUP BY
  // over this table. Keeping the raw taps means the shape of a city's
  // interest over time stays recoverable, which a single incremented integer
  // would have thrown away.
  `CREATE TABLE IF NOT EXISTS city_votes (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_city_votes_city ON city_votes (city_id)`,

  // Up and down votes on the Cluster Wall's tiles.
  //
  // ONE ROW PER VOTER PER TILE, unlike `city_votes` directly above — which is
  // uncapped on purpose, because that board is a hype meter where every tap
  // counts. This is a score, and a score somebody can run up by holding a
  // button down is not one. `value` is +1 or -1, and changing your mind
  // rewrites the row rather than adding a second, so the pair of totals counts
  // people rather than clicks.
  //
  // `tile_id` IS NOT A FOREIGN KEY. The wall's tiles come from whatever sits
  // in `public/images/cluster-wall/` at build time — there is no table of them
  // to point at, and there should not be one, because the whole design of that
  // folder is that dropping a file in is the entire act of adding a tile. A
  // vote for a tile that has since been removed is simply never read.
  `CREATE TABLE IF NOT EXISTS wall_tile_votes (
    id TEXT PRIMARY KEY,
    tile_id TEXT NOT NULL,
    value INTEGER NOT NULL,
    voter_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_wall_tile_votes_tile ON wall_tile_votes (tile_id)`,
  // The lookup behind "has this person already voted on this tile", which runs
  // on every cast. Unique, so a race between two simultaneous casts from one
  // voter loses the second rather than double-counting it.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_wall_tile_votes_voter
     ON wall_tile_votes (tile_id, voter_hash)`,

  // A tile's baseline score, before any real vote is cast.
  //
  // WHY A SEED TABLE RATHER THAN SEED ROWS. The wall is ordered by score, and
  // a wall whose every tile sits at zero has no order to show — so tiles start
  // with a standing count. Expressing that as real `wall_tile_votes` rows
  // would mean tens of thousands of fabricated voters, one per point, each
  // with an invented hash occupying the unique index that exists to stop one
  // person voting twice. That is a great many rows to say one number, and it
  // would corrupt the only thing the votes table is authoritative about.
  //
  // So the baseline is one row per tile, kept apart from the real votes.
  // `/api/wall/votes` adds the two on read: the seed is the floor, genuine
  // votes move it, and nothing about "has this person already voted" is
  // touched. It is the same split `city_votes` already uses, where the seed
  // lives in `content/vote-cities.ts` — held in the database here because the
  // wall's tiles are generated from a folder and have no content file.
  `CREATE TABLE IF NOT EXISTS wall_tile_seeds (
    tile_id TEXT PRIMARY KEY,
    up INTEGER NOT NULL DEFAULT 0,
    down INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,

  // Email is the primary key: re-subscribing is an idempotent no-op rather
  // than a duplicate row, so the list never needs de-duplicating on export.
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    email TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_newsletter_created
     ON newsletter_subscribers (created_at)`,

  // Timed lyrics live in the database, not on disk. The tagger used to write
  // `public/lyrics/<id>.lrc` with writeFileSync, which works locally and
  // silently fails on any host with a read-only filesystem — every serverless
  // platform, including the one this deploys to. One row per track, keyed by
  // the permanent Track.id.
  `CREATE TABLE IF NOT EXISTS track_lyrics (
    track_id TEXT PRIMARY KEY,
    lrc TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`,

  /* ─────────────────────────────────────────────────────── Accounts ──── */

  // One row per person, keyed by a generated id rather than by the email, so
  // changing an address later is an UPDATE rather than a migration of every
  // row that referenced it.
  //
  // `email` is the natural key and is uniquely indexed below: somebody who
  // signed in with Google and somebody who typed the same address into the
  // OTP form are one person, and have to land on one row rather than on two
  // accounts each holding half their history.
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    picture TEXT NOT NULL DEFAULT '',
    google_sub TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)`,

  // One-time codes. The code itself is never stored, only a salted hash — for
  // the same reason a password would not be: this table is a list of live
  // credentials, and whoever reads it should still not be able to sign in as
  // anybody.
  //
  // `attempts` is what makes six digits safe. A million guesses is an
  // afternoon for a script; five is not.
  `CREATE TABLE IF NOT EXISTS auth_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_otp_email ON auth_otps (email, created_at)`,

  // Sessions live here rather than inside the cookie. The cookie carries a
  // signed id and nothing else, so signing somebody out is a DELETE that takes
  // effect at once — where a self-contained token stays valid in the holder's
  // browser until it expires, whatever the server has since decided.
  //
  // `persona` IS WHAT MAKES THE TWO DOORS SEPARATE. A session is proof of
  // having signed in *at one entrance*, not proof of identity in general —
  // signing in at DEV opens DEV, and DOTM asks for itself the first time.
  // Once somebody has done both they hold two live rows and neither door asks
  // again.
  //
  // Empty for any row written before this column existed. Those resolve to
  // nobody, so everybody signs in once more per door and never again.
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    persona TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
     ON auth_sessions (user_id, created_at)`,

  /* ────────────────────────────────────────────────────── Analytics ──── */

  // One row per visit. `user_id` is empty for anybody not signed in, which is
  // a real and common state: the gate stands in front of the two desktops
  // only, so /enter and both intros are walked through by people who have no
  // account yet.
  `CREATE TABLE IF NOT EXISTS analytics_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '',
    persona TEXT NOT NULL DEFAULT '',
    locale TEXT NOT NULL DEFAULT '',
    referrer TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    viewport TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started
     ON analytics_sessions (started_at)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user
     ON analytics_sessions (user_id, started_at)`,

  // Every event in one table rather than one table per kind.
  //
  // The columns are the questions actually asked of this data — which window,
  // on which persona, for how long — and anything else rides along in `meta`
  // as JSON. A table per event kind would mean a migration every time a new
  // one is recorded, and a join for every question that spans two of them.
  //
  // `duration_ms` is null except on events that measure a span (a window
  // closing, a visit ending). Zero would be a lie: zero is a real number
  // meaning "no time at all", and most events have no duration to report.
  `CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    persona TEXT NOT NULL DEFAULT '',
    window_id TEXT NOT NULL DEFAULT '',
    route TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER,
    meta TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_session
     ON analytics_events (session_id, created_at)`,
  // The index behind "how long did people spend in each window": type and
  // window are the filter, the timestamp is the range.
  `CREATE INDEX IF NOT EXISTS idx_events_window
     ON analytics_events (type, window_id, created_at)`,
];

/**
 * Columns added to tables that already exist.
 *
 * `CREATE TABLE IF NOT EXISTS` is a no-op against a database that already has
 * the table, so a column added to a definition above reaches new databases and
 * silently misses every existing one. Development boxes, the checked-in SQLite
 * file and production would each hold a different shape, and the first query
 * naming the new column would fail on exactly the machines nobody tested on.
 *
 * WHY FAILURES ARE SWALLOWED. There is no portable "add column if missing":
 * SQLite says `duplicate column name`, Postgres says `column already exists`,
 * and neither accepts the other's `IF NOT EXISTS` spelling across the versions
 * this has to run on. Re-running an ALTER that has already been applied is the
 * expected case, not an error — so each is attempted and its complaint
 * ignored.
 *
 * ADDITIVE ONLY. Nothing here may drop or retype a column: this runs
 * unattended at the first query of every cold start, which is no place for a
 * statement that can lose data.
 */
const MIGRATIONS = [
  `ALTER TABLE auth_sessions ADD COLUMN persona TEXT NOT NULL DEFAULT ''`,
];

let ready: Promise<void> | null = null;

/** Idempotent; safe to await before any query. Runs once per process. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await getDriver();
      for (const sql of STATEMENTS) await db.run(sql);
      for (const sql of MIGRATIONS) {
        try {
          await db.run(sql);
        } catch {
          // Already applied. See the note on MIGRATIONS.
        }
      }
    })();
  }
  return ready;
}
