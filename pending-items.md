# Pending items

Things that are finished as far as code goes but still need a decision, a key,
or an account somebody has to open. Nothing here is broken; everything here is
waiting on a human.

Last updated: 2026-08-31.

---

## 1. Google OAuth — one thing left to do in the Cloud console

The credentials are live. `.env.local` carries them, and `/api/auth/google` now
redirects to a real Google consent screen with the real client id (verified
against the running dev server).

**You must add this to the OAuth client, or sign-in fails with
`redirect_uri_mismatch`:**

```
http://localhost:3000/api/auth/google/callback
```

Google Cloud console → APIs & Services → Credentials → your OAuth 2.0 Client ID
→ **Authorised redirect URIs**. Add the production origin the same way when you
deploy (`https://<domain>/api/auth/google/callback`).

Note the path order — `/google/callback`, not `/callback/google`. Getting it
backwards is the single most common cause of that error.

### The credentials were in the wrong file

They were pasted into `.env.example`, which `.gitignore` explicitly
**un-ignores** (`.env*` on one line, `!.env.example` two lines later). It had
not been committed, so nothing leaked and nothing needs rotating — but a
`git add .` would have pushed the client secret to
`github.com/aryankant1312/the-cluster`. They now live in `.env.local`, which is
ignored, and the example file is blank again.

### Demo sign-in is now off

`demoModeEnabled()` returns false the moment real Google credentials exist, so
the "Continue (demo)" button is gone. The panel offers Google and the emailed
code. With no `RESEND_API_KEY` that code prints to the dev server console
instead of arriving by mail, which is still a complete, walkable flow.

---

## 2. Environment variables — what is required, and what each one buys

**Nothing in `.env.example` is dead code.** All 21 variables have at least one
live `process.env` reference, so none were deleted — "unused" here can only
mean "you have chosen not to configure it", which is your call rather than the
codebase's. Verified by grepping every name against `src/` and `scripts/`.

### Required before going live

| Variable | Why it cannot stay empty |
| --- | --- |
| `COOKIE_SECRET` | Signs the session, persona and locale cookies. Unset, it falls back to a **known** development string — and a known signing key means anybody can mint a valid session for anybody. |
| `IP_HASH_SALT` | Salts the hashes of submitter IPs on wall posts, reports and analytics. Unset, it falls back to a known dev value, which makes the hashes guessable. |
| `ADMIN_PASSWORD_HASH` | Guards `/admin`. Already set. |
| `DATABASE_DRIVER=postgres` + `DATABASE_URL` | **Deployment only.** Serverless filesystems are ephemeral and read-only, so a SQLite file is wiped on every deploy and cold start, taking bookings and wall posts with it. Local development stays on SQLite. |

### Configured and working

`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_ARTIST_ID`,
`SPOTIFY_MARKET`, `ADMIN_PASSWORD_HASH`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`.

### Optional — empty is a supported state

| Block | Unlocks | Cost to set up |
| --- | --- | --- |
| `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` | Live subscriber count in the Live Stats window, and **half** the wallpaper "cluster count" — the other half is Instagram. | ~5 minutes, in the Google Cloud project you already have open. Enable "YouTube Data API v3", create an API key, restrict it to that API. Public data, so no OAuth and no channel-owner consent. |
| `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | Follower count, 28-day views, and the other half of the wallpaper counter. | Materially more work: a Professional (Business/Creator) IG account linked to a Facebook Page, a Meta app, four permissions, and a long-lived **Page** token. That token survives indefinitely while in use but is invalidated by a password change — if the figures ever freeze, re-issue it first. |
| `RESEND_API_KEY`, `OTP_FROM_EMAIL`, `BOOKING_EMAIL` | Booking-request emails, and one-time sign-in codes arriving by mail rather than printing to the console. Without it, booking requests **still save to the database** and show as un-emailed in `/admin`. | ~10 minutes. `onboarding@resend.dev` works out of the box but is visibly a test sender; verify your own domain before launch. |
| `GOOGLE_REDIRECT_URI` | Only needed behind a proxy that rewrites the host. Leave blank otherwise. | — |
| `AUTH_DEMO_MODE` | Arms the local stand-in sign-in on a **production** build — for a staging box you want walkable before Google is configured. Never set it on the real site. | — |

### Permanently manual — no API can supply these

Entered in `/admin`, cached in the `manual_stats` table, updatable without a
redeploy:

- **YouTube unique viewers** — a YouTube Studio Analytics figure with no
  equivalent metric in any public API, OAuth or otherwise.
- **Spotify monthly listeners** and **playlist adds** — Spotify-for-Artists
  figures with no Web API endpoint at any access tier. Scraping the public
  artist page would breach the Developer Terms.
- **"New cluster fam"** — has no endpoint behind it at all.

---

## 3. Map tiles — Esri now, CARTO if you want the old look back

**The bug:** CARTO began stamping `API KEY REQUIRED / carto.com/basemaps/apikey`
diagonally across every basemap tile it serves without a key. The watermark is
*inside the PNG*. Nothing errored, nothing reached the console, and the tiles
returned `200` with valid image data — which is why this needed your screenshot
to diagnose rather than a log.

**The fix:** both maps moved to Esri's keyless grey canvases —
`World_Dark_Gray_Base` for the DOTM shows window, `World_Light_Gray_Base` for
the DEV `/shows` page.

**The trade, on the record:** the DEV map has gone from CARTO `voyager` (beige
land, blue water, colourful labels) to Esri grey. It sits well enough inside the
Win98 frame, but it is not the same picture.

**To get CARTO back:** a free CARTO account gives an API key. Append
`?api_key=<KEY>` to the old tile URLs and revert the two `<TileLayer>` blocks in
`DotmShowsMap.tsx` and `IndiaShowsMap.tsx`. Nothing else needs touching. Esri's
canvases stop at zoom 16, so both maps now set `maxNativeZoom={16}` and upscale
above it; CARTO reaches 20, and that line can go with it.

---

## 4. Drops window — the newsletter capture is gone

The "Coming Soon" window is now the swirl and nothing else, per your answer.
That removed a working newsletter form which posted to `/api/newsletter` with
`source: "drops-coming-soon"`.

**The endpoint, the table, and `MerchDrops.tsx` (a complete storefront) are all
still present and untouched** — only the form on this one screen went. If the
capture is wanted back without the countdown returning, it is a small component
to re-mount over the swirl's hollow centre.

---

## 5. Open question — where does the DND Trip audio belong?

Your note read: *"add DND Trip.mp3 audio from timestamp 1:53 to 2:18 as bg audio
for this page | the CTA for the user on this page will be login"*.

It has been built into the **Drops window**, bound to the play/pause control you
asked to keep — pressing pause stops the rings and the music together. That is
the reading in which the retained button has something to control.

The second half of that sentence does not fit the Drops window: a visitor inside
a persona desktop has already signed in, so "login" cannot be a call to action
there. If the audio was meant for the **DOTM door** instead — the fuzzy-text
screen, where login genuinely *is* the CTA — say so and it moves. It is one hook
in one file.

---

## 6. Hard-refresh re-login — removed

**This is no longer how the site behaves.** The "ask again on every hard
reload" rule was reported as a login loop and has been taken out.

It was too much friction, and for the reason this section warned about: with
Google live, every refresh sent the visitor out to the account chooser and
back, and the flag that was supposed to remember the round trip did not
survive it in any way that helped. The session decides on its own now — thirty
days, one sign-in per door — and `src/lib/auth-gate.ts` is deleted.

If a re-ask is ever wanted again, the honest version is an age check on the
session row rather than a per-document flag: re-ask when the session is older
than some interval, which is a question the server can answer and a page load
cannot.
