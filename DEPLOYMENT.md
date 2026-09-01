# Deploying THE CLUSTER

Free tier today, paid later, without a rewrite in between.

The stack is Next.js 16 (App Router, Turbopack) on **Vercel**, with **Neon
Postgres** for anything that has to survive a deploy. Both have free tiers;
both scale into paid plans by changing a setting, not the code.

---

## Why Postgres and not the SQLite file

The app talks to a driver interface (`src/lib/db/driver.ts`), never to a
concrete database. Locally that resolves to `node:sqlite` and a file in
`.data/`. **That file cannot come to production.** Serverless filesystems are
ephemeral and read-only: the database would be wiped on every deploy and every
cold start, taking each booking request, wall post, vote and subscriber with
it.

So local runs on SQLite, production runs on Postgres, and the only difference
is two environment variables. `pg` is already a dependency.

The same constraint is why timed lyrics live in the `track_lyrics` table
rather than as `.lrc` files under `public/` — the admin tagger has to be able
to save from a deployed page.

---

## One-time setup

### 1. Create the database (Neon, free)

1. Sign up at <https://neon.tech> and create a project.
2. Pick **AWS ap-southeast-1 (Singapore)**.

   Neon has **no Mumbai region**. The AWS list is `us-east-1`, `us-east-2`,
   `us-west-2`, `eu-central-1`, `eu-west-2`, `ap-southeast-1`,
   `ap-southeast-2` and `sa-east-1`; the Azure regions are deprecated and
   closed to new projects. Singapore is the nearest to an Indian audience, at
   roughly 60ms from Mumbai against about 200ms to Ohio.

   `vercel.json` puts the functions in `sin1` for the same reason, so the two
   sit in one region. That matters more than being nearest the visitor,
   because a gated page does a session lookup *and then* a data query: in one
   region both are about 1ms and the visitor pays a single 60ms hop; split
   apart they would be two 60ms hops.

   **A project's region cannot be changed after creation** — moving means a
   new project and a migration, so it is worth the moment now.

   When you add the `preview` branch, **untick "Automatically delete branch
   after"**. Neon ticks it by default with a 30-day maximum, and an expired
   branch is deleted permanently along with its compute endpoint.
3. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://user:password@ep-something-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

   Pooled, not direct: serverless functions open many short-lived connections
   and will exhaust a direct connection limit.

> **Never put real values in `.env.example`.** It is committed on purpose (it
> is the template), and Next.js never loads it anyway — only `.env`,
> `.env.local`, `.env.development`, `.env.production` and their `.local`
> variants are read. Local values belong in `.env.local`, which is gitignored;
> production values belong in the Vercel dashboard.

No migration step is needed. `ensureSchema()` runs the DDL lazily and
idempotently before the first query, so the tables create themselves on the
first request.

### 2. Push to GitHub

The remote already exists:

```bash
git push -u origin master
```

### 3. Import into Vercel

1. <https://vercel.com/new> → import `aryankant1312/the-cluster`.
2. Framework preset: **Next.js** (auto-detected; `vercel.json` pins it anyway).
3. Do **not** deploy yet — add the environment variables first.

### 4. Environment variables

Set these in **Project → Settings → Environment Variables**, for
_Production_ and _Preview_.

| Variable | Value | Required |
| --- | --- | --- |
| `DATABASE_DRIVER` | `postgres` | **Yes** — without it, data is silently lost |
| `DATABASE_URL` | Neon pooled connection string | **Yes** |
| `IP_HASH_SALT` | long random string | **Yes** before launch |
| `ADMIN_PASSWORD_HASH` | scrypt hash (see below) | **Yes**, or `/admin` is disabled |
| `SPOTIFY_ARTIST_ID` | defaults to the Dock's artist | optional — only builds the attribution link |
| `SPOTIFY_MARKET` | `IN` | optional |
| `RESEND_API_KEY` | Resend key | optional — bookings still save without it |
| `BOOKING_EMAIL` | where booking mail lands | optional |
| `COOKIE_SECRET` | long random string | **Yes** — see below |
| `GOOGLE_CLIENT_ID` | OAuth client id | **Yes** — see below |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | **Yes** — see below |
| `GOOGLE_REDIRECT_URI` | leave unset unless behind a rewriting proxy | optional |
| `OTP_FROM_EMAIL` | sender for one-time codes | optional |
| `AUTH_DEMO_MODE` | leave **unset** | never set on the real site |

> **The platform credentials are not here.** `SPOTIFY_CLIENT_ID`,
> `SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` belong in
> **GitHub Actions secrets**, not in Vercel — the website never calls an
> upstream API, so it has no use for them. See "Where the figures come from"
> below.

Generate the salt (and `COOKIE_SECRET`, which wants its own separate value):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4a. The two that will take the whole site down if you skip them

Both doors gate on a session — `dev/layout.tsx` and `dotm/layout.tsx` redirect
anyone without one back to the door. So sign-in is not a feature of this site,
it is the way in, and misconfiguring it locks everybody out including you.

**`COOKIE_SECRET`.** Unset, it falls back to a known development value. A known
signing key means anybody can mint a valid session for anybody. Set it.

**Google OAuth, and its redirect URI.** In Google Cloud Console →
Credentials → your OAuth client, add the production callback to *Authorised
redirect URIs*:

```
https://<your-project>.vercel.app/api/auth/google/callback
```

Note the order — `/google/callback`, not `/callback/google`. Getting it wrong
gives `redirect_uri_mismatch`, which is the single most common cause of a
deploy where nobody can sign in. Keep the localhost entry alongside it so local
development keeps working, and add the custom domain's callback later when you
attach one.

The demo sign-in stand-in **refuses to arm in production** unless
`AUTH_DEMO_MODE=1` is set deliberately, so a forgotten Google variable fails
closed rather than leaving the front door open.

`ADMIN_PASSWORD_HASH` is a scrypt hash, never the password itself — see
`src/lib/admin-auth.ts` for the expected format.

**The desktop counters are not environment variables.** They live in
`manual_stats` and update without a redeploy — mostly written by the sync job
described next, with anything it cannot reach entered at `/admin`.

---

## Where the figures come from

**The website never calls an upstream API.** Every figure on every panel and
counter is one database read. Collection happens in
`.github/workflows/sync-stats.yml`, which runs `scripts/sync-stats.mjs` every
two days in GitHub Actions and is the only writer.

That split is the point: a rate limit, an expired key or a blocked scraper can
leave a figure unchanged but can never slow down or break a page, and API
quota is spent once per cycle rather than once per visitor.

| Figure | How |
| --- | --- |
| YouTube subscribers, views, videos | YouTube Data API v3 |
| Spotify followers, popularity, releases | Spotify Web API, client credentials |
| Instagram followers | **Scraped** from the public profile |
| Spotify monthly listeners | **Scraped**, via headless Chromium |
| YouTube unique viewers, Instagram views, playlist adds | Entered at `/admin` — dashboard-only, on no public page |

Two figures are scraped because no API will supply them. Instagram's Graph API
wants a Business account, a linked Facebook Page, four permissions and a
long-lived Page token to return a number the public profile gives a crawler in
one request — though only **rounded** ("18K"), which is all anonymous access
can see, so `/admin` carries an override for when you want the exact figure.
Spotify's monthly listeners exist in no Web API endpoint at any access tier,
and the artist page is client-rendered, so a browser has to run.

This is against both platforms' terms. It is a deliberate decision, not an
oversight: it reads pages any visitor can see, once every two days, from a job
nowhere near the request path. The realistic failure is an IP block or a markup
change, and the job **exits non-zero** so GitHub emails you rather than letting
a stale number quietly pass for a live one.

**Secrets go in GitHub, not Vercel:** `DATABASE_URL` (the production string —
the job writes what the live site reads), `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`, `SPOTIFY_ARTIST_ID`, `YOUTUBE_API_KEY`,
`YOUTUBE_CHANNEL_ID`, `INSTAGRAM_HANDLE`.

> `YOUTUBE_CHANNEL_ID` takes the `UC...` id and nothing else. A URL or an
> `@handle` returns an empty result with HTTP 200 and no error — the sync job
> raises that as a failure rather than recording nothing. Find it at
> youtube.com/account_advanced, or resolve a handle once with:
>
> ```bash
> curl -s "https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=YOURHANDLE&key=YOUR_KEY"
> ```

**A fresh database has no figures**, so every tile shows a dash until the job
has run once. Fire it from the repository's Actions tab → *Sync platform
stats* → **Run workflow**; `/admin` links to exactly that page.

### 5. Deploy

Push to `master` and Vercel builds it. Every other branch and PR gets its own
preview URL automatically.

---

## After the first deploy

1. Visit `/admin`, sign in, and fill in **Desktop metrics** — until then the
   Cluster tile shows a dash rather than a made-up number.
2. Check `/api/metrics` returns real values.
3. Cast a vote in Shows, then confirm `/api/votes` reflects it — that proves
   Postgres is actually connected. If the response contains
   `"degraded": true`, `DATABASE_URL` is wrong or unreachable.

---

## Free-tier limits worth knowing

**Vercel Hobby** — 100 GB bandwidth/month, one concurrent build, and function
durations clamped to the plan's ceiling (`vercel.json` requests 15s; Hobby
will cap it lower). Its terms cover **non-commercial** use: move to Pro before
selling merch or tickets through the site.

**Neon Free** — 0.5 GB storage, one project. Compute **auto-suspends after
5 minutes idle**, so the first request after a quiet spell pays a cold start
of roughly a second. For a launch-day site that is invisible; if it ever
grates, Neon's paid tier removes the suspend.

---

## Moving to paid hosting later

Nothing in the app is Vercel-specific — no Vercel SDK, no platform-only APIs,
just `next build` and `next start`.

- **Staying on Vercel:** upgrade to Pro. No code change.
- **A Node host** (Railway, Render, Fly, a VPS): run `npm run build` then
  `npm run start`. Keep `DATABASE_DRIVER=postgres` and point `DATABASE_URL`
  wherever the database moves.
- **Docker / Kubernetes:** add `output: "standalone"` to `next.config.ts` for
  a minimal runtime image.
- **Back to SQLite** on a host with a real, persistent disk: set
  `DATABASE_DRIVER=sqlite` and `SQLITE_PATH` to a mounted volume. The
  repository layer does not change.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Bookings/posts vanish after a deploy | `DATABASE_DRIVER` is still `sqlite` |
| `/api/votes` returns `degraded: true` | `DATABASE_URL` unset or unreachable |
| `/admin` returns 503 | `ADMIN_PASSWORD_HASH` not set |
| Live Stats window is empty | The sync job has never run, or its GitHub secrets are missing. Run it from the Actions tab; by design a figure nobody has collected shows a dash rather than a wrong number |
| A figure never changes, however often the job runs | An override is set for it in `/admin`. The panel there shows the synced value beneath your figure, and says which one the site is using |
| Sync job fails every run | Check its log in the Actions tab. Instagram serving a login wall means the crawler user-agent stopped working; "no follower count found" means the markup moved |
| Cluster metric shows a dash | Expected until the figures are entered at `/admin` |
| Tagger "couldn't save the lyrics" | Database unreachable; lyrics live in `track_lyrics`, not on disk |
| Build fails on type errors | Run `npx next build` locally first — Vercel runs the same type check |
| Nobody can sign in; `redirect_uri_mismatch` | Production callback not added in Google Cloud Console — see 4a |
| Sessions drop at random | `COOKIE_SECRET` differs between Production and Preview, or is unset |
| YouTube tiles empty but the key is set | `YOUTUBE_CHANNEL_ID` holds a URL or `@handle` instead of the `UC...` id |
| Map shows shapes but no city names | The Esri `..._Reference` labels layer is missing — the `..._Base` service has no text on it by design |
