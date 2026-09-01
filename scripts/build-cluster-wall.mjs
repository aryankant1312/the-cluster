/**
 * The Cluster Wall manifest, generated from whatever is in the folder.
 *
 * DROP FILES IN, RUN NOTHING. This is wired to `predev` and `prebuild`, so
 * replacing the contents of `public/images/cluster-wall/` is the whole of
 * changing the wall. No list to edit, no ids to invent, nothing to forget.
 *
 * WHY DIMENSIONS ARE READ RATHER THAN GUESSED. The wall is a masonry: each
 * column is a stack of tiles at their own proportions, and a tile whose
 * declared aspect ratio is wrong either crops its image or leaves a gap under
 * it. The old hand-kept `cluster-wall.ts` carried a `height` field that had to
 * be recomputed by hand whenever the art changed, and it silently rotted.
 * Reading the header is exact and free.
 *
 * NO IMAGE LIBRARY. Four header formats, a few dozen lines, versus a
 * dependency in the build path — and those four are the only ones a browser
 * will animate or display here anyway. Anything unrecognised is skipped
 * loudly rather than shipped with a made-up size.
 *
 * ORDER IS THE FILESYSTEM'S. Alphabetical by filename, which is stable across
 * machines and is what a folder listing already shows. Prefix names with
 * `01-`, `02-` if a particular order is ever wanted; nothing here has to
 * change for that to work.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = join(HERE, "..", "public", "images", "cluster-wall");
const OUT_FILE = join(HERE, "..", "src", "content", "cluster-wall.generated.ts");

/** What a browser will actually render inline, animated or not. */
const RENDERABLE = new Set([".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif"]);

/**
 * The moving tiles, which are video rather than GIF.
 *
 * WHY NOT ACTUAL GIFs. The clips supplied for the wall are phone video, and a
 * GIF of one is both enormous — a few seconds runs to tens of megabytes at 256
 * colours — and silent, because the format has no audio track at all. The
 * speaker control the wall now carries could therefore never do anything on a
 * real GIF. A muted, looping, inline `<video>` reads exactly like a GIF and
 * keeps its sound, so the speaker has something to turn on.
 *
 * As far as anyone looking at the wall is concerned these are still the gifs.
 * That is the point.
 */
const MOTION = new Set([".mp4", ".webm", ".mov"]);

/* ────────────────────────────────────────────────────── Header readers ── */

/** GIF87a/GIF89a: width and height are little-endian at bytes 6..9. */
function gifSize(buf) {
  if (buf.length < 10 || buf.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

/** PNG: the IHDR chunk always comes first, big-endian at bytes 16..23. */
function pngSize(buf) {
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * JPEG: walk the segment chain to the first Start-Of-Frame.
 *
 * There is no fixed offset — a JPEG opens with any number of application and
 * quantisation segments, each declaring its own length — so the only way to
 * the dimensions is to step over them. SOF0/1/2/3, 9/10/11 and 13/14/15 all
 * carry the size; C4, C8 and CC are Huffman/extension markers that do not.
 */
function jpegSize(buf) {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);

    const isSof =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/** WebP: three sub-formats, three different places to look. */
function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    // Canvas size, 24-bit little-endian, stored as (value - 1).
    return {
      width: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  if (chunk === "VP8 ") {
    // Lossy: 14 bits each, after the 3-byte start code.
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    // Lossless: 14 bits each, packed across four bytes as (value - 1).
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function imageSize(buf) {
  return gifSize(buf) ?? pngSize(buf) ?? jpegSize(buf) ?? webpSize(buf);
}

/* ────────────────────────────────────────────────────────────── ISO-BMFF ── */

/**
 * MP4/MOV: walk the box tree for the video track's size and whether there is
 * any sound.
 *
 * NO ffprobe, FOR THE SAME REASON THERE IS NO IMAGE LIBRARY. This runs on
 * `prebuild`, which means it runs on the deploy host, and a build that shells
 * out to a binary the host may not have is a build that fails there and
 * nowhere else. The two numbers and the one boolean wanted here are a few
 * dozen lines of header walking.
 *
 * An ISO base media file is a flat list of length-prefixed boxes, each of
 * which may contain more of the same: `moov` holds one `trak` per track, and a
 * `trak` holds a `tkhd` (the geometry) and an `mdia` > `hdlr` (what kind of
 * track it is). Only the handler distinguishes a video track from an audio
 * one, which is why both have to be found rather than assuming track order.
 */
function walkBoxes(buf, start, end, visit) {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    let header = 8;

    // 1 means the real size is a 64-bit value in the next eight bytes; 0 means
    // "everything to the end of the file", and is only legal on the last box.
    if (size === 1) {
      if (offset + 16 > end) return;
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) return;

    visit(type, offset + header, offset + size);
    offset += size;
  }
}

function mp4Info(buf) {
  let moov = null;
  walkBoxes(buf, 0, buf.length, (type, from, to) => {
    if (type === "moov") moov = [from, to];
  });
  if (!moov) return null;

  let size = null;
  let hasAudio = false;

  walkBoxes(buf, moov[0], moov[1], (type, trakFrom, trakTo) => {
    if (type !== "trak") return;

    let handler = "";
    let tkhd = null;

    walkBoxes(buf, trakFrom, trakTo, (t, from, to) => {
      if (t === "tkhd") tkhd = [from, to];
      if (t !== "mdia") return;
      walkBoxes(buf, from, to, (mt, mFrom) => {
        // `hdlr`: version+flags (4), predefined (4), then the four-character
        // handler type — `vide` for picture, `soun` for sound.
        if (mt === "hdlr") handler = buf.toString("ascii", mFrom + 8, mFrom + 12);
      });
    });

    if (handler === "soun") hasAudio = true;
    if (handler !== "vide" || !tkhd) return;

    // Width and height are the last eight bytes of a `tkhd` payload in every
    // version of the box, as 16.16 fixed-point. Reading from the end avoids
    // having to branch on the version's differently sized time fields.
    const w = buf.readUInt32BE(tkhd[1] - 8) / 65536;
    const h = buf.readUInt32BE(tkhd[1] - 4) / 65536;
    if (w >= 1 && h >= 1) size = { width: Math.round(w), height: Math.round(h) };
  });

  return size ? { ...size, hasAudio } : null;
}

/* ───────────────────────────────────────────────────────────── Naming ── */

/** `LTS 1.png` → `lts-1`. Stable, URL-safe, and unique within one folder. */
const slug = (stem) =>
  stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * `credits-KUVVET-6` → `Credits KUVVET 6`.
 *
 * Separators become spaces and lowercase words are capitalised; a word already
 * carrying capitals is left exactly as typed, so `LTS` and `KUVVET` survive
 * rather than becoming `Lts` and `Kuvvet`.
 */
const titleize = (stem) =>
  stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) =>
      /[A-Z]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");

/* ─────────────────────────────────────────────────────────────── Build ── */

function main() {
  if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });

  const tiles = [];
  const skipped = [];

  for (const name of readdirSync(MEDIA_DIR).sort()) {
    const ext = extname(name).toLowerCase();
    const isMotion = MOTION.has(ext);
    if (!RENDERABLE.has(ext) && !isMotion) {
      skipped.push(`${name} (not a renderable image or clip)`);
      continue;
    }

    const buf = readFileSync(join(MEDIA_DIR, name));
    const size = isMotion ? mp4Info(buf) : imageSize(buf);
    if (!size || !size.width || !size.height) {
      skipped.push(`${name} (could not read dimensions)`);
      continue;
    }

    const stem = basename(name, extname(name));
    tiles.push({
      id: slug(stem),
      // Encoded, not raw: filenames here carry spaces and parentheses, and an
      // un-encoded space in a `src` is a broken request.
      src: `/images/cluster-wall/${encodeURIComponent(name)}`,
      title: titleize(stem),
      width: size.width,
      height: size.height,
      kind: isMotion ? "video" : "image",
      // Only a clip that actually carries a sound track gets a speaker. A
      // still photograph never does, and neither does a silent clip — a
      // control that unmutes silence is a broken control.
      hasAudio: Boolean(size.hasAudio),
    });
  }

  const body = tiles
    .map(
      (t) =>
        `  { id: ${JSON.stringify(t.id)}, src: ${JSON.stringify(t.src)}, ` +
        `title: ${JSON.stringify(t.title)}, width: ${t.width}, height: ${t.height}, ` +
        `kind: ${JSON.stringify(t.kind)}, hasAudio: ${t.hasAudio} },`,
    )
    .join("\n");

  writeFileSync(
    OUT_FILE,
    `// GENERATED FILE — DO NOT EDIT.
//
// Written by \`scripts/build-cluster-wall.mjs\`, which runs on \`predev\` and
// \`prebuild\`. To change the wall, change the contents of
// \`public/images/cluster-wall/\` — every file in there that a browser can
// render becomes a tile, at its own proportions, in filename order.

export interface ClusterWallTile {
  id: string;
  src: string;
  title: string;
  /** Intrinsic pixel size, read from the file header. Drives the masonry. */
  width: number;
  height: number;
  /** \`video\` tiles loop muted like a GIF and can be unmuted; images cannot. */
  kind: "image" | "video";
  /** True only for a clip carrying a real sound track. Gates the speaker. */
  hasAudio: boolean;
}

export const clusterWallTiles: ClusterWallTile[] = [
${body}
];
`,
    "utf8",
  );

  console.log(
    `cluster wall: ${tiles.length} tile(s) → src/content/cluster-wall.generated.ts`,
  );
  for (const line of skipped) console.warn(`  skipped: ${line}`);
  if (tiles.length === 0) {
    console.warn("  the wall is empty — drop images into public/images/cluster-wall/");
  }
}

main();
