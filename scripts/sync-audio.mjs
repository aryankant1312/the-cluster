#!/usr/bin/env node
/**
 * Copy delivered masters into `public/audio/`, named for their track id.
 *
 *   npm run sync:audio
 *
 * Same rule the lyric sheets already follow, and the same reason: the files
 * arrive named for a person browsing a folder ("Us Bhai Us.mp3") and the
 * player addresses them by id. Half the catalogue was silent on the site
 * purely because its masters had never been copied across under those ids.
 *
 * Which song a file belongs to is decided by `media-names.mjs`, which matches
 * on the name against the catalogue itself rather than against a table kept
 * by hand here.
 *
 * A master that matches nothing is reported, never guessed at, and nothing is
 * deleted. Rerun whenever masters are added; it is idempotent, and it skips a
 * file whose bytes are already in place.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTrackIndex, trackIdForFile } from "./media-names.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");

/** Where the delivered masters land — a shared folder beside the app. */
const SOURCE_DIR = resolve(APP, "..", "public", "audio");
const OUT_DIR = join(APP, "public", "audio");

const index = buildTrackIndex();
const copied = [];
const unchanged = [];
const unmapped = [];

mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(SOURCE_DIR)
  .filter((name) => name.toLowerCase().endsWith(".mp3"))
  .sort((a, b) => a.localeCompare(b, "en"));

for (const file of files) {
  const stem = file.slice(0, -".mp3".length);
  const trackId = trackIdForFile(stem, index);

  if (!trackId) {
    unmapped.push(stem);
    continue;
  }

  const from = join(SOURCE_DIR, file);
  const to = join(OUT_DIR, `${trackId}.mp3`);

  // Size is enough to tell "already synced" from "a new master": these are
  // whole audio files, and hashing every one on each run buys nothing.
  if (existsSync(to) && statSync(to).size === statSync(from).size) {
    unchanged.push(`${stem}  ==  ${trackId}.mp3`);
    continue;
  }

  copyFileSync(from, to);
  copied.push(`${stem}  ->  ${trackId}.mp3`);
}

const report = (title, rows) => {
  if (rows.length === 0) return;
  console.log(`\n${title}`);
  for (const row of rows) console.log(`  ${row}`);
};

console.log(`Read ${files.length} master(s) from ${SOURCE_DIR}`);
report(`Copied ${copied.length} into public/audio/`, copied);
report(`Already in place (${unchanged.length}):`, unchanged);
report("SKIPPED - no track in the catalogue matches this name:", unmapped);

if (unmapped.length) {
  console.log(
    "\nAdd the song to src/content/tracks.ts, or an alias to scripts/media-names.mjs," +
      "\nthen rerun. Nothing was guessed at.",
  );
}
