#!/usr/bin/env node
/**
 * Copy delivered `.lrc` sheets into `public/lyrics/`, named for their track id.
 *
 *   npm run sync:lyrics
 *
 * The sheets arrive named for a human browsing a folder ("bhala kyun.lrc.txt")
 * and are dropped into a shared folder outside the app. The player fetches
 * them by track id, so each has to be copied to its permanent name — the same
 * rule the audio masters follow, and the match is made by the same module.
 *
 * BOTH EXTENSIONS ARE READ. Sheets arrive as `.lrc.txt` and as plain `.lrc`,
 * and this script used to glob only the first — which is why Ikr, Khud Dukhi,
 * No Blessings and Roll No. 666 sat on `lrc: null` while their sheets were
 * already sitting in the folder.
 *
 * The script REFUSES two kinds of file rather than copying them, because both
 * are worse on the site than no lyrics at all:
 *
 *   - empty files, which would render as a song whose sheet loads and is blank
 *   - duplicates, where two track names carry byte-identical words, which
 *     means at least one of them is the wrong song
 *
 * When two delivered files both claim one track and only one survives those
 * checks, the survivor wins — that is exactly the Roll No. 666 case, where the
 * `.lrc.txt` carries Let Them Say's words and the `.lrc` carries its own.
 *
 * Nothing is deleted and nothing outside `public/lyrics/` is touched. Rerun it
 * whenever sheets are added or corrected; it is idempotent.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTrackIndex, trackIdForFile } from "./media-names.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");

/** Where the delivered files land — a shared folder beside the app, not in it. */
const SOURCE_DIR = resolve(APP, "..", "public", "lrc lyrics");
const OUT_DIR = join(APP, "public", "lyrics");

const index = buildTrackIndex();

const copied = [];
const empty = [];
const duplicate = [];
const unmapped = [];

/** md5 → the first delivered name that carried these exact bytes. */
const seen = new Map();
/** track id → the delivered name already written for it. */
const claimed = new Map();

mkdirSync(OUT_DIR, { recursive: true });

/** Strip whichever of the two extensions this file carries. */
function stemOf(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".lrc.txt")) return name.slice(0, -".lrc.txt".length);
  return name.slice(0, -".lrc".length);
}

const files = readdirSync(SOURCE_DIR)
  .filter((name) => /\.lrc(\.txt)?$/i.test(name))
  .sort((a, b) => a.localeCompare(b, "en"));

for (const file of files) {
  const stem = stemOf(file);
  const trackId = trackIdForFile(stem, index);

  if (!trackId) {
    unmapped.push(stem);
    continue;
  }

  const body = readFileSync(join(SOURCE_DIR, file), "utf8");

  if (body.trim() === "") {
    empty.push(stem);
    continue;
  }

  const hash = createHash("md5").update(body).digest("hex");
  const first = seen.get(hash);
  if (first) {
    duplicate.push(`${stem} (same words as ${first})`);
    continue;
  }
  seen.set(hash, stem);

  // Two files, one track, both clean. Nothing here can tell which is the
  // better transcription, so the first is kept and the second reported rather
  // than silently overwriting a sheet that already passed every check.
  const already = claimed.get(trackId);
  if (already) {
    duplicate.push(`${stem} (${trackId} already written from ${already})`);
    continue;
  }
  claimed.set(trackId, stem);

  // Normalised to LF on the way out: the parser splits on /\r?\n/ either way,
  // but a repo full of mixed line endings makes every future diff noisy.
  writeFileSync(join(OUT_DIR, `${trackId}.lrc`), body.replace(/\r\n/g, "\n"), "utf8");
  copied.push({ stem, trackId });
}

const report = (title, rows) => {
  if (rows.length === 0) return;
  console.log(`\n${title}`);
  for (const row of rows) console.log(`  ${row}`);
};

console.log(`Read ${files.length} file(s) from ${SOURCE_DIR}`);
report(
  `Wrote ${copied.length} sheet(s) to public/lyrics/`,
  copied.map((c) => `${c.stem}  ->  ${c.trackId}.lrc`),
);
report("SKIPPED - file is empty:", empty);
report("SKIPPED - duplicate content, so at least one is the wrong song:", duplicate);
report("SKIPPED - no track in the catalogue matches this name:", unmapped);

if (empty.length || duplicate.length || unmapped.length) {
  console.log(
    "\nEach skipped song stays on `lrc: null` in src/content/song-stories.ts." +
      "\nFix the source file, rerun, then point its row at the new path.",
  );
}
