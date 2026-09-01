#!/usr/bin/env node
/**
 * Imports DOTM's real catalogue from the Spotify Web API into
 * `src/content/spotify-catalogue.json`.
 *
 * Run:  npm run import:catalogue
 *
 * Uses the Client Credentials flow — everything read here is public
 * catalogue data, so no user authorization, no scopes and no redirect URI.
 * Only documented, non-deprecated endpoints are called:
 *
 *   GET /v1/artists/{id}
 *   GET /v1/artists/{id}/albums
 *   GET /v1/albums/{id}/tracks
 *   GET /v1/tracks?ids=...        (for ISRC + preview_url)
 *
 * Artwork is stored as a Spotify CDN URL and hotlinked, never copied, in
 * line with the Developer Terms.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/content/spotify-catalogue.json");
const DEFAULT_ARTIST = "2AL0XQ1mbnWU5xVR6R4KRa";

/* ------------------------------------------------------------------- env */

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(ROOT, file), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* file absent is fine */
    }
  }
}

/* ----------------------------------------------------------------- fetch */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Honours Retry-After on 429, otherwise exponential backoff. Never loops tightly. */
async function politeFetch(url, init = {}, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;

    const header = Number(res.headers.get("retry-after"));
    const waitMs =
      Number.isFinite(header) && header > 0 ? header * 1000 : Math.min(30000, 2 ** i * 1000);
    if (i === attempts - 1) return res;
    console.warn(`  rate limited, waiting ${Math.round(waitMs / 1000)}s…`);
    await sleep(waitMs);
  }
}

async function getToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    console.error("\nMissing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.");
    console.error("Add them to .env.local, then run this again.\n");
    process.exit(1);
  }

  const res = await politeFetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    console.error(`\nToken request failed (${res.status}): ${await res.text()}\n`);
    process.exit(1);
  }
  return (await res.json()).access_token;
}

async function api(path, token) {
  const res = await politeFetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = (await res.json()).error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status} on ${path}: ${message}`);
  }
  return res.json();
}

/**
 * Walks a paged endpoint to the end.
 *
 * `limit` defaults to 10, not the documented 50: an app in development mode
 * (no extended quota) rejects anything above 10 on /artists/{id}/albums with
 * "Invalid limit". Callers that are known to tolerate more can pass it.
 */
async function all(path, token, limit = 10) {
  const items = [];
  let offset = 0;
  for (;;) {
    const sep = path.includes("?") ? "&" : "?";
    const page = await api(`${path}${sep}limit=${limit}&offset=${offset}`, token);
    items.push(...(page.items ?? []));
    if (!page.next) break;
    offset += limit;
  }
  return items;
}

/* ------------------------------------------------------------------ main */

async function main() {
  loadEnv();
  const artistId = process.env.SPOTIFY_ARTIST_ID || DEFAULT_ARTIST;
  const market = process.env.SPOTIFY_MARKET || "IN";
  const token = await getToken();

  console.log(`\nImporting catalogue for artist ${artistId}…`);

  const artist = await api(`/artists/${artistId}`, token);
  const followers = artist.followers?.total;
  console.log(
    `  artist: ${artist.name}` +
      (typeof followers === "number"
        ? ` (${followers} followers)`
        : " (follower count withheld — app lacks extended quota)"),
  );

  const albumPages = await all(
    `/artists/${artistId}/albums?include_groups=album,single,compilation&market=${market}`,
    token,
  );

  // The same release can appear more than once across groups.
  const albums = [...new Map(albumPages.map((a) => [a.id, a])).values()];
  console.log(`  releases: ${albums.length}`);

  const tracks = [];
  for (const album of albums) {
    // This endpoint accepts the documented 50 even in development mode.
    const albumTracks = await all(`/albums/${album.id}/tracks?market=${market}`, token, 50);
    for (const t of albumTracks) {
      tracks.push({
        spotifyId: t.id,
        title: t.name,
        durationMs: t.duration_ms,
        trackNumber: t.track_number,
        discNumber: t.disc_number,
        explicit: t.explicit,
        albumId: album.id,
        albumName: album.name,
        releaseDate: album.release_date ?? "",
        artworkUrl: album.images?.[0]?.url ?? "",
        isrc: "",
        previewUrl: null,
      });
    }
  }
  console.log(`  tracks: ${tracks.length}`);

  // ISRC only comes back from the full track object. The batch endpoint
  // (/tracks?ids=) returns 403 without extended quota, so each track is
  // fetched individually and any refusal is tolerated — an ISRC is useful
  // for distribution paperwork but nothing on the site depends on it.
  let isrcCount = 0;
  for (const t of tracks) {
    try {
      const full = await api(`/tracks/${t.spotifyId}?market=${market}`, token);
      t.isrc = full.external_ids?.isrc ?? "";
      t.previewUrl = full.preview_url ?? null;
      if (t.isrc) isrcCount++;
    } catch {
      /* leave isrc empty and carry on */
    }
    await sleep(60); // stay well clear of the rate limiter
  }
  console.log(`  ISRCs resolved: ${isrcCount}/${tracks.length}`);

  const withPreview = tracks.filter((t) => t.previewUrl).length;
  console.log(`  preview clips available: ${withPreview}/${tracks.length}`);
  if (withPreview === 0 && tracks.length > 0) {
    console.log("  (preview_url is withdrawn for newer Spotify apps — expected)");
  }

  const payload = {
    artist: {
      id: artist.id,
      name: artist.name,
      // null, not 0, when the field is withheld — "0 followers" would be a
      // lie, and the UI hides a null tile rather than rendering a zero.
      followers: typeof artist.followers?.total === "number" ? artist.followers.total : null,
      url: artist.external_urls?.spotify ?? `https://open.spotify.com/artist/${artist.id}`,
    },
    fetchedAt: new Date().toISOString(),
    market,
    albums: albums
      .map((a) => ({
        id: a.id,
        name: a.name,
        albumType: a.album_type,
        releaseDate: a.release_date ?? "",
        totalTracks: a.total_tracks,
        artworkUrl: a.images?.[0]?.url ?? "",
        url: a.external_urls?.spotify ?? "",
      }))
      .sort((x, y) => y.releaseDate.localeCompare(x.releaseDate)),
    tracks: tracks.sort((x, y) => y.releaseDate.localeCompare(x.releaseDate)),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${OUT}\n`);
}

main().catch((err) => {
  console.error(`\nImport failed: ${err.message}\n`);
  process.exit(1);
});
