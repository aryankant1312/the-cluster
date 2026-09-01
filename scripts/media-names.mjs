/**
 * Filename → track id, by string matching.
 *
 * Delivered masters and lyric sheets arrive named for a human browsing a
 * folder ("Us Bhai Us.mp3", "bhala kyun.lrc.txt"). The site addresses both by
 * track id, so every sync script has to answer the same question: which song
 * is this file?
 *
 * The answer is derived rather than typed out. Track ids and titles are read
 * straight from `content/tracks.ts` — the one place either is defined — and
 * both sides are reduced to a comparison key: lowercase, alphanumerics only.
 * `Us Bhai Us.mp3`, `us bhai us.lrc.txt` and the id `us-bhai-us-track` all
 * collapse to `usbhaius`, so the match holds without a hand-kept table that
 * can drift from the catalogue.
 *
 * The id suffixes (`-mp3`, `-track`) are historical and carry no meaning, so
 * they are stripped before comparing. ALIASES covers what no rule can reach:
 * a delivered file whose name is spelled differently from the release.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TRACKS_TS = resolve(here, "..", "src", "content", "tracks.ts");

/** Delivered spellings that differ from the release's own. */
const ALIASES = {
  // "gaadi rok.mp3" — the master is spelled with two a's, the release is not.
  gaadirok: "gaddi-rok-mp3",
};

/** Lowercase alphanumerics only, with the meaningless id suffixes removed. */
export function comparisonKey(name) {
  const flat = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  return flat.replace(/(mp3|track)$/, "");
}

/**
 * Every track id in the catalogue, keyed by every spelling that should reach
 * it — its own id and its release title.
 */
export function buildTrackIndex() {
  const source = readFileSync(TRACKS_TS, "utf8");
  const index = new Map();

  // `track("id", "Title", …)` is the single constructor every entry uses.
  const CALL = /track\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
  let match;
  while ((match = CALL.exec(source)) !== null) {
    const [, id, title] = match;
    index.set(comparisonKey(id), id);
    index.set(comparisonKey(title), id);
  }

  for (const [key, id] of Object.entries(ALIASES)) index.set(key, id);
  return index;
}

/** The track a delivered file belongs to, or null when nothing matches. */
export function trackIdForFile(stem, index) {
  return index.get(comparisonKey(stem)) ?? null;
}
