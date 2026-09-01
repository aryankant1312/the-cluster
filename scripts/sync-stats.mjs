/**
 * The only writer of platform figures.
 *
 * Runs on a schedule in GitHub Actions, never on Vercel. The website reads
 * these rows and calls no upstream API at all, which is what makes a page load
 * one database read instead of a fan-out to three third parties that can each
 * be slow, rate-limited or down. A blocked scraper costs a stale number, never
 * a hanging request.
 *
 * WHERE EACH FIGURE COMES FROM, and why it is not uniform:
 *
 *   youtube_subscribers      YouTube Data API. Public data, an API key, no
 *                            OAuth. Cheap and exact — always prefer it.
 *   spotify followers etc.   Spotify Web API, client-credentials. Public
 *                            catalogue data, no user scope.
 *   instagram_followers      SCRAPED. The Graph API needs a Business account,
 *                            a linked Facebook Page, four permissions and a
 *                            long-lived Page token. The public profile gives
 *                            the same number to a crawler user-agent in one
 *                            HTTP request — but ROUNDED ("18K"), because
 *                            Instagram does not publish the exact figure to
 *                            anonymous visitors at all. An exact number typed
 *                            into /admin overrides this.
 *   spotify_monthly_listeners  SCRAPED, and needs a real browser: the artist
 *                            page is client-rendered, and neither the raw HTML
 *                            nor the /embed/ JSON carries the figure. There is
 *                            no Web API endpoint for it at any access tier.
 *
 * On scraping: this reads pages any visitor can see, once every two days. It
 * is nonetheless against both platforms' terms — a decision taken deliberately
 * rather than an oversight. The realistic failure mode is an IP block or a
 * markup change, and both degrade to "the last good number" rather than to a
 * broken site.
 *
 * FAILURE IS LOUD ON PURPOSE. A collector that was configured but produced no
 * number exits non-zero so GitHub emails the repo owner. Silence is the
 * dangerous outcome: the site would keep serving a cached figure that looks
 * live while drifting months out of date.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Nothing to write to.");
  process.exit(1);
}

/** Last value seen for a metric. The site reads these. */
const CACHE_PREFIX = "cache:";
/** When that value was obtained. Surfaced in /admin so staleness is visible. */
const FETCHED_AT_PREFIX = "fetched_at:";

const SPOTIFY_ARTIST = process.env.SPOTIFY_ARTIST_ID || "2AL0XQ1mbnWU5xVR6R4KRa";
const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET || "IN";
const INSTAGRAM_HANDLE = process.env.INSTAGRAM_HANDLE || "devilonthemic";

/** The public profile is served to crawlers and login-walled to browsers. */
const CRAWLER_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const nowIso = () => new Date().toISOString();
const dayKey = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ helpers */

/**
 * "18.5K" / "1.2M" / "18,432" as a number.
 *
 * Returns null rather than a guess for anything unparseable. A wrong follower
 * count published as fact is worse than no figure at all.
 */
function parseCompactNumber(raw) {
  if (typeof raw !== "string") return null;
  const m = raw.trim().replace(/,/g, "").match(/^([\d.]+)\s*([KMB])?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase()] ?? 1;
  return Math.round(n * mult);
}

/**
 * Fetch that honours a 429 rather than hammering through it.
 *
 * `baseMs` sets how patient the backoff is, because the endpoints are not
 * alike: an API returning 429 usually means "you were briefly too quick", but
 * Instagram returning 429 means "this IP is throttled", and a one-second
 * retry against that is just a second request into the same wall.
 */
async function politeFetch(url, init = {}, { attempts = 3, baseMs = 1000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status !== 429) return res;
      // Retry-After is authoritative when present, and is in seconds.
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** i * baseMs;
      if (i === attempts - 1) return res;
      await new Promise((r) => setTimeout(r, Math.min(90_000, waitMs)));
    } catch {
      if (i === attempts - 1) return null;
      await new Promise((r) => setTimeout(r, 2 ** i * baseMs));
    }
  }
  return null;
}

/* --------------------------------------------------------------- collectors */

/* Each returns {values} on success, {skipped} when unconfigured, or throws. */

async function collectYouTube() {
  const key = process.env.YOUTUBE_API_KEY;
  const channel = process.env.YOUTUBE_CHANNEL_ID;
  if (!key || !channel) return { skipped: "YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID not set" };

  const res = await politeFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channel)}&key=${encodeURIComponent(key)}`,
  );
  if (!res?.ok) throw new Error(`YouTube API returned ${res?.status ?? "no response"}`);
  const json = await res.json();
  const s = json.items?.[0]?.statistics;
  // A handle or URL in YOUTUBE_CHANNEL_ID returns an empty items array with
  // HTTP 200 — the silent failure this check exists to make loud.
  if (!s) throw new Error("YouTube returned no channel — is YOUTUBE_CHANNEL_ID a UC... id?");

  return {
    values: [
      { source: "youtube", metric: "subscribers", key: "youtube_subscribers", value: Number(s.subscriberCount) },
      { source: "youtube", metric: "views", value: Number(s.viewCount) },
      { source: "youtube", metric: "videos", value: Number(s.videoCount) },
    ],
  };
}

async function collectSpotifyApi() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return { skipped: "SPOTIFY_CLIENT_ID / SECRET not set" };

  const tokenRes = await politeFetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes?.ok) throw new Error(`Spotify token request returned ${tokenRes?.status ?? "no response"}`);
  const token = (await tokenRes.json()).access_token;
  if (!token) throw new Error("Spotify returned no access token");

  const res = await politeFetch(`https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res?.ok) throw new Error(`Spotify artist request returned ${res?.status ?? "no response"}`);
  const artist = await res.json();

  // An app without extended quota gets a stripped artist object with no
  // followers and no popularity. Recording those as 0 would publish a figure
  // that is simply false, so a missing field contributes no row.
  const values = [];
  if (typeof artist.followers?.total === "number") {
    values.push({ source: "spotify", metric: "followers", value: artist.followers.total });
  }
  if (typeof artist.popularity === "number") {
    values.push({ source: "spotify", metric: "popularity", value: artist.popularity });
  }
  // Release count comes from the albums endpoint rather than the deprecated
  // top-tracks one, and is best-effort: losing it must not cost the follower
  // count, which is the figure that actually matters.
  const albumsRes = await politeFetch(
    `https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST}/albums?include_groups=album,single&limit=1&market=${SPOTIFY_MARKET}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (albumsRes?.ok) {
    const albums = await albumsRes.json();
    if (typeof albums.total === "number") {
      values.push({ source: "spotify", metric: "releases", value: albums.total });
    }
  }

  if (!values.length) {
    // Known upstream behaviour, not a bug here: an app without extended quota
    // gets an artist object with these fields absent and HTTP 200.
    console.warn("  [spotify-api] artist object carried neither followers nor popularity");
  }
  return { values };
}

/**
 * Instagram followers, from the public profile.
 *
 * A browser user-agent gets a login wall; a crawler user-agent gets the real
 * page, where the count reads as "18K Followers" — rounded, which is all
 * anonymous access can see.
 */
async function collectInstagram() {
  // Four attempts backing off 15s, 30s, 60s — about two minutes of patience.
  // Instagram throttles datacenter ranges hard, and GitHub's runners live in
  // one, so a 429 here is the expected failure rather than a surprise.
  const res = await politeFetch(
    `https://www.instagram.com/${INSTAGRAM_HANDLE}/`,
    { headers: { "User-Agent": CRAWLER_UA, "Accept-Language": "en-US,en;q=0.9" } },
    { attempts: 4, baseMs: 15_000 },
  );

  if (res?.status === 429) {
    throw new Error(
      "Instagram rate-limited the runner (429) after four attempts. This IP range is " +
        "throttled, not briefly busy — the last known follower count stays on the site, " +
        "and an exact figure can be entered as an override in /admin.",
    );
  }
  if (!res?.ok) throw new Error(`Instagram returned ${res?.status ?? "no response"}`);
  const html = await res.text();

  // Entities and non-breaking spaces are the reason a parser that works from
  // one machine fails from another: the same page can arrive as
  // `18K&nbsp;Followers`, which no amount of `\s+` will match.
  const text = html
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/ /g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"');

  // Most exact first. `edge_followed_by` is the real count, not the rounded
  // one, and appears in the embedded JSON when Instagram includes it.
  const exact = text.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (exact) {
    return {
      values: [
        { source: "instagram", metric: "followers", key: "instagram_followers", value: Number(exact[1]) },
      ],
      note: "exact, from embedded JSON",
    };
  }

  const followerCount = text.match(/"follower_count"\s*:\s*(\d+)/);
  if (followerCount) {
    return {
      values: [
        {
          source: "instagram",
          metric: "followers",
          key: "instagram_followers",
          value: Number(followerCount[1]),
        },
      ],
      note: "exact, from embedded JSON",
    };
  }

  // Then the rounded figure, wherever it appears — the meta description is
  // where it usually is, but not always.
  const rounded =
    text.match(/content="([\d.,]+\s*[KMB]?)\s*Followers/i) ??
    text.match(/([\d.,]+\s*[KMB]?)\s*Followers/i);
  const value = rounded ? parseCompactNumber(rounded[1].replace(/\s+/g, "")) : null;

  if (value === null) {
    // Say what actually arrived. A scraper that fails without describing the
    // page it failed on makes every future run a guess.
    const title = text.match(/<title[^>]*>([^<]{0,120})/i)?.[1]?.trim() ?? "(none)";
    const sawWord = /followers/i.test(text);
    const sawLogin = /loginForm|Log in to Instagram|accounts\/login/i.test(text);
    throw new Error(
      `Instagram returned ${res.status}, ${html.length} bytes, title "${title}". ` +
        `Contains the word "followers": ${sawWord}. Looks like a login wall: ${sawLogin}. ` +
        (sawLogin
          ? "The crawler user-agent no longer gets the public page."
          : "The page came through but the count could not be parsed from it."),
    );
  }

  return {
    values: [{ source: "instagram", metric: "followers", key: "instagram_followers", value }],
    note: `rounded as published ("${rounded[1].trim()}")`,
  };
}

/**
 * Spotify monthly listeners, which exists only after the page's JavaScript runs.
 *
 * Two extraction routes, most robust first. Intercepting the page's own JSON
 * survives a redesign; reading rendered text does not, because Spotify changes
 * markup constantly. The text route is the fallback, not the plan.
 */
async function collectSpotifyListeners() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return { skipped: "playwright not installed (API-only run)" };
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ locale: "en-US" });
    let fromJson = null;

    page.on("response", async (response) => {
      if (fromJson !== null) return;
      if (!/pathfinder|api-partner|query/i.test(response.url())) return;
      try {
        const body = await response.text();
        const m = body.match(/"monthlyListeners"\s*:\s*(\d+)/);
        if (m) fromJson = Number(m[1]);
      } catch {
        // A body that cannot be read is not worth failing the run over.
      }
    });

    await page.goto(`https://open.spotify.com/artist/${SPOTIFY_ARTIST}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    if (fromJson !== null) {
      return {
        values: [{ source: "spotify", metric: "monthly_listeners", key: "spotify_monthly_listeners", value: fromJson }],
        note: "intercepted JSON",
      };
    }

    const text = await page.textContent("body");
    const m = text?.match(/([\d.,]+[KMB]?)\s+monthly listeners/i);
    const value = m ? parseCompactNumber(m[1]) : null;
    if (value === null) {
      throw new Error("Spotify page rendered but neither its JSON nor its text carried monthly listeners");
    }
    return {
      values: [{ source: "spotify", metric: "monthly_listeners", key: "spotify_monthly_listeners", value }],
      note: "rendered text — the JSON intercept missed, worth investigating",
    };
  } finally {
    await browser.close();
  }
}

/* -------------------------------------------------------------------- main */

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// The app creates its schema lazily on first request, so this job cannot
// assume the tables exist — it may well run before anyone has visited.
await client.query(`CREATE TABLE IF NOT EXISTS manual_stats (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
)`);
await client.query(`CREATE TABLE IF NOT EXISTS stat_snapshots (
  id TEXT PRIMARY KEY,
  captured_on TEXT NOT NULL,
  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL,
  UNIQUE (captured_on, source, metric)
)`);

async function setManual(key, value) {
  await client.query(
    `INSERT INTO manual_stats (key, value, updated_at) VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [key, String(value), nowIso()],
  );
}

async function recordSnapshot(source, metric, value) {
  await client.query(
    `INSERT INTO stat_snapshots (id, captured_on, source, metric, value) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (captured_on, source, metric) DO UPDATE SET value = EXCLUDED.value`,
    [`ss_${Math.random().toString(36).slice(2, 12)}`, dayKey(), source, metric, Math.round(value)],
  );
}

const COLLECTORS = [
  ["youtube-api", collectYouTube],
  ["spotify-api", collectSpotifyApi],
  ["instagram-scrape", collectInstagram],
  ["spotify-listeners-scrape", collectSpotifyListeners],
];

let failures = 0;
let written = 0;

for (const [name, run] of COLLECTORS) {
  try {
    const result = await run();
    if (result.skipped) {
      console.log(`- ${name}: skipped (${result.skipped})`);
      continue;
    }
    for (const v of result.values ?? []) {
      if (!Number.isFinite(v.value)) continue;
      await recordSnapshot(v.source, v.metric, v.value);
      if (v.key) {
        await setManual(CACHE_PREFIX + v.key, Math.round(v.value));
        await setManual(FETCHED_AT_PREFIX + v.key, nowIso());
      }
      written++;
      console.log(`  ${name}: ${v.source}.${v.metric} = ${v.value}${v.key ? ` -> ${v.key}` : ""}`);
    }
    console.log(`+ ${name}: ok${result.note ? ` (${result.note})` : ""}`);
  } catch (error) {
    failures++;
    console.error(`! ${name}: FAILED — ${error.message}`);
  }
}

await client.end();

console.log(`\n${written} value(s) written, ${failures} collector(s) failed.`);

// Exit non-zero so GitHub emails on failure. A scraper that silently stops
// working is the failure mode this whole design exists to avoid.
process.exit(failures > 0 ? 1 : 0);
