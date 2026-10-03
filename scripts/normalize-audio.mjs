#!/usr/bin/env node
/**
 * Master every local catalogue track to the site's playback target.
 *
 *   npm run master:audio
 *
 * This is a two-pass EBU R128/FFmpeg loudnorm pass. The first pass measures
 * each complete track; the second uses those measurements to land at -14 LUFS
 * integrated loudness with a codec-safe -2 dBTP ceiling and 11 LU loudness
 * range. The extra peak headroom prevents MP3 encoding from creating
 * inter-sample overs above the common -1 dBTP delivery ceiling. A file
 * already within tolerance is measured but not encoded again, which makes the
 * command safe to run after every master import.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const AUDIO_DIR = join(APP, "public", "audio");

const TARGET_I = -14;
const TARGET_TP = -2;
const DELIVERY_TP_CEILING = -1;
const TARGET_LRA = 11;
const LUFS_TOLERANCE = 0.5;

function runFfmpeg(args) {
  try {
    return execFileSync("ffmpeg", ["-hide_banner", "-nostats", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error?.stderr?.toString?.() || error?.message || String(error);
    throw new Error(detail.trim());
  }
}

function measure(file) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-af",
      `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.error) throw result.error;
  const diagnostic = result.stderr || "";

  const start = diagnostic.lastIndexOf("{");
  const end = diagnostic.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`Could not read loudness measurements.\n${diagnostic.trim()}`);
  }
  return JSON.parse(diagnostic.slice(start, end + 1));
}

function alreadyMastered(stats) {
  const integrated = Number(stats.input_i);
  const truePeak = Number(stats.input_tp);
  return (
    Number.isFinite(integrated) &&
    Number.isFinite(truePeak) &&
    Math.abs(integrated - TARGET_I) <= LUFS_TOLERANCE &&
    truePeak <= DELIVERY_TP_CEILING
  );
}

function master(file, stats) {
  const temporary = `${file}.mastering.mp3`;
  const backup = `${file}.pre-master`;
  rmSync(temporary, { force: true });
  rmSync(backup, { force: true });

  const filter = [
    `loudnorm=I=${TARGET_I}`,
    `TP=${TARGET_TP}`,
    `LRA=${TARGET_LRA}`,
    `measured_I=${stats.input_i}`,
    `measured_TP=${stats.input_tp}`,
    `measured_LRA=${stats.input_lra}`,
    `measured_thresh=${stats.input_thresh}`,
    `offset=${stats.target_offset}`,
    "linear=true",
    "print_format=summary",
  ].join(":");

  runFfmpeg([
    "-y",
    "-i",
    file,
    "-map_metadata",
    "0",
    "-af",
    filter,
    "-ar",
    "48000",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    temporary,
  ]);

  // Swap only after FFmpeg has produced the complete replacement. The backup
  // makes an interrupted or failed rename recoverable without touching the
  // separately delivered masters outside this app.
  renameSync(file, backup);
  try {
    renameSync(temporary, file);
    rmSync(backup, { force: true });
  } catch (error) {
    if (!existsSync(file) && existsSync(backup)) renameSync(backup, file);
    rmSync(temporary, { force: true });
    throw error;
  }
}

const files = readdirSync(AUDIO_DIR)
  .filter((name) => name.toLowerCase().endsWith(".mp3"))
  .sort((a, b) => a.localeCompare(b, "en"));

let changed = 0;
let unchanged = 0;
for (const name of files) {
  const file = join(AUDIO_DIR, name);
  const stats = measure(file);
  const before = `${Number(stats.input_i).toFixed(1)} LUFS / ${Number(stats.input_tp).toFixed(1)} dBTP`;

  if (alreadyMastered(stats)) {
    unchanged++;
    console.log(`✓ ${name}  ${before}`);
    continue;
  }

  master(file, stats);
  const verified = measure(file);
  changed++;
  console.log(
    `→ ${name}  ${before}  →  ${Number(verified.input_i).toFixed(1)} LUFS / ${Number(verified.input_tp).toFixed(1)} dBTP`,
  );
}

console.log(
  `Mastered ${changed} track(s); ${unchanged} already at ${TARGET_I} LUFS (${files.length} total).`,
);
