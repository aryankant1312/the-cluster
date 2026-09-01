/**
 * Standard `.lrc` parsing.
 *
 * Format: `[mm:ss.xx] line text`, with optional metadata tags such as
 * `[ti:Title]`, `[ar:Artist]` and `[offset:-200]` (milliseconds). One line
 * may carry several timestamps when a phrase repeats, so each is emitted as
 * its own cue.
 */

export interface LrcCue {
  /** Seconds from the start of the track. */
  time: number;
  text: string;
}

export interface ParsedLrc {
  title: string;
  artist: string;
  /** Global shift in seconds; positive delays the lyrics. */
  offset: number;
  cues: LrcCue[];
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const META_TAG = /^\[(ti|ar|al|by|offset):(.*)\]$/i;

export function parseLrc(source: string): ParsedLrc {
  const result: ParsedLrc = { title: "", artist: "", offset: 0, cues: [] };

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const meta = META_TAG.exec(line);
    if (meta) {
      const key = meta[1].toLowerCase();
      const value = meta[2].trim();
      if (key === "ti") result.title = value;
      else if (key === "ar") result.artist = value;
      else if (key === "offset") result.offset = (Number(value) || 0) / 1000;
      continue;
    }

    TIME_TAG.lastIndex = 0;
    const stamps: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = TIME_TAG.exec(line)) !== null) {
      const [, mm, ss, frac = "0"] = match;
      // A 2-digit fraction is centiseconds, 3-digit is milliseconds.
      const fractional = Number(frac) / Math.pow(10, frac.length);
      stamps.push(Number(mm) * 60 + Number(ss) + fractional);
    }
    if (stamps.length === 0) continue;

    const text = line.replace(TIME_TAG, "").trim();
    for (const time of stamps) result.cues.push({ time, text });
  }

  result.cues.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Index of the cue that should be highlighted at `seconds`, or -1 before the
 * first cue. Binary search — this runs on every timeupdate.
 */
export function activeCueIndex(cues: LrcCue[], seconds: number, offset = 0): number {
  const t = seconds - offset;
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].time <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
