/**
 * The timed-lyric layer over `tracks.ts`.
 *
 * Sheets live as plain `.lrc` files under `public/lyrics/`, named for the
 * track id they belong to, and are served straight off the CDN — no database
 * row, no admin tagger, no build step. Adding a song's lyrics is dropping one
 * file in that folder and pointing at it here.
 *
 * `lrc: null` is a normal state, not a gap to be filled with something
 * approximate: the player renders its own "no timed lyrics yet" line rather
 * than showing words nobody wrote to that timing.
 *
 * Ids are permanent — they key `tracks.ts` and the filenames together, so
 * renaming one silently unlinks a song from its sheet.
 */

export interface SongStory {
  /** Must match a `Track.id` in tracks.ts. */
  trackId: string;
  /** Path to a timed `.lrc` under public/, or null when none exists yet. */
  lrc: string | null;
}

/**
 * Delivered sheets, by track.
 *
 * Twenty of the twenty-two songs have one. Ten of those twenty were wired
 * only recently, and none of them needed a new file: seven sheets had been
 * delivered empty and were later replaced, and four more had arrived as plain
 * `.lrc` rather than `.lrc.txt`, which the sync script did not glob at all —
 * so Ikr, Khud Dukhi, No Blessings and Roll No. 666 sat on `lrc: null` with
 * their words already sitting in the folder.
 *
 * What is still unwired:
 *
 *   ekaki
 *     — the source file is empty (0 bytes)
 *   25th-birthday-confession
 *     — no sheet was ever delivered
 *
 * Roll No. 666 reads the `.lrc`, not the `.lrc.txt` beside it: that one is
 * byte-identical to Let Them Say, i.e. the wrong song's words, and the sync
 * script refuses it on those grounds.
 *
 * Replacing any of these is one line here plus the file itself — see
 * `scripts/sync-lyrics.mjs`, which does the copy and reports exactly this.
 */
export const songStories: SongStory[] = [
  { trackId: "badside-track", lrc: "/lyrics/badside-track.lrc" },
  { trackId: "bhala-kyun-mp3", lrc: "/lyrics/bhala-kyun-mp3.lrc" },
  { trackId: "count-down-mp3", lrc: "/lyrics/count-down-mp3.lrc" },
  { trackId: "dnd-trip-mp3", lrc: "/lyrics/dnd-trip-mp3.lrc" },
  { trackId: "dotm-mp3", lrc: "/lyrics/dotm-mp3.lrc" },
  { trackId: "gaddi-rok-mp3", lrc: "/lyrics/gaddi-rok-mp3.lrc" },
  { trackId: "goli-baari-mp3", lrc: "/lyrics/goli-baari-mp3.lrc" },
  { trackId: "ikr", lrc: "/lyrics/ikr.lrc" },
  { trackId: "khud-dukhi-mp3", lrc: "/lyrics/khud-dukhi-mp3.lrc" },
  { trackId: "let-them-say-mp3", lrc: "/lyrics/let-them-say-mp3.lrc" },
  { trackId: "lmnopqr-mp3", lrc: "/lyrics/lmnopqr-mp3.lrc" },
  { trackId: "no-blessings-track", lrc: "/lyrics/no-blessings-track.lrc" },
  { trackId: "paranoid", lrc: "/lyrics/paranoid.lrc" },
  { trackId: "roll-no-666", lrc: "/lyrics/roll-no-666.lrc" },
  { trackId: "selfish-log-track", lrc: "/lyrics/selfish-log-track.lrc" },
  { trackId: "sukoon", lrc: "/lyrics/sukoon.lrc" },
  { trackId: "thak-thak-mp3", lrc: "/lyrics/thak-thak-mp3.lrc" },
  { trackId: "touch-down-mp3", lrc: "/lyrics/touch-down-mp3.lrc" },
  { trackId: "us-bhai-us-track", lrc: "/lyrics/us-bhai-us-track.lrc" },
  { trackId: "winnie-pooh", lrc: "/lyrics/winnie-pooh.lrc" },

  { trackId: "ekaki", lrc: null },
  { trackId: "25th-birthday-confession", lrc: null },
];

export function songStoryFor(trackId: string): SongStory | undefined {
  return songStories.find((s) => s.trackId === trackId);
}

/** Path to a track's sheet, or null when it has none. */
export function lrcPathFor(trackId: string): string | null {
  return songStoryFor(trackId)?.lrc ?? null;
}
