/**
 * Vendor the Google faces into `assets/fonts/`, once.
 *
 * WHY THIS EXISTS. `next/font/google` downloads at build time, and on a
 * machine that cannot reach fonts.googleapis.com every one of the eight faces
 * silently falls back — the dev log carried 11,072 copies of "Failed to
 * download X from Google Fonts. Using a fallback font instead." A site whose
 * whole conceit is two typographic costumes was rendering in neither.
 *
 * Self-hosting removes the network from the equation entirely: the files are
 * in the repo, `next/font/local` reads them off disk, and the build behaves
 * the same offline, on CI, and on a plane.
 *
 * LATIN SUBSET ONLY, matching what `layout.tsx` already asked for. The CSS API
 * returns one @font-face per subset with a `unicode-range`; anything whose
 * range does not cover Basic Latin is skipped, which is the difference between
 * ~30KB and ~300KB per weight.
 *
 * Run once: `npm run fetch:fonts`. The output is committed.
 */

import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets", "fonts");

/**
 * A modern browser UA is what makes Google serve woff2 rather than ttf.
 * The API sniffs the agent and hands back whatever it believes you can read.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** family → the weights `src/app/layout.tsx` actually uses. */
const FAMILIES = [
  { family: "VT323", weights: [400] },
  { family: "IBM Plex Mono", weights: [400, 500, 600] },
  { family: "Space Mono", weights: [400, 700] },
  { family: "Inter", weights: [400, 500, 600, 700] },
  { family: "Cinzel Decorative", weights: [400, 700, 900] },
  { family: "Cormorant Garamond", weights: [400, 500, 600, 700] },
  { family: "Cinzel", weights: [400, 500, 600] },
  { family: "Anton", weights: [400] },
];

/** `Cormorant Garamond` → `cormorant-garamond`, which is the filename stem. */
const slug = (family) => family.toLowerCase().replace(/\s+/g, "-");

/**
 * Does this @font-face cover Basic Latin?
 *
 * Google splits a family across latin, latin-ext, cyrillic and greek blocks,
 * all under one `font-family`. Only the block containing U+0041 is wanted;
 * the rest are alphabets this site never sets.
 */
function coversBasicLatin(unicodeRange) {
  if (!unicodeRange) return true;
  return /U\+0000-00FF|U\+0-FF/i.test(unicodeRange);
}

async function fetchCss(family, weights) {
  const url =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family).replace(/%20/g, "+") +
    `:wght@${weights.join(";")}&display=swap`;

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${family}: CSS request failed (${res.status})`);
  return res.text();
}

/** Split the stylesheet into blocks, keeping weight and source URL together. */
function parseFaces(css) {
  const faces = [];
  for (const block of css.split("@font-face").slice(1)) {
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (!coversBasicLatin(range)) continue;

    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const src = block.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (weight && src) faces.push({ weight, src });
  }
  return faces;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const written = [];

  for (const { family, weights } of FAMILIES) {
    const faces = parseFaces(await fetchCss(family, weights));
    if (faces.length === 0) throw new Error(`${family}: no latin face in the stylesheet`);

    for (const { weight, src } of faces) {
      const res = await fetch(src, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${family} ${weight}: download failed (${res.status})`);

      const name = `${slug(family)}-${weight}.woff2`;
      const bytes = Buffer.from(await res.arrayBuffer());
      await writeFile(join(OUT, name), bytes);
      written.push(`${name} (${(bytes.length / 1024).toFixed(1)}KB)`);
    }
  }

  console.log(`Wrote ${written.length} files to assets/fonts:`);
  for (const line of written) console.log(`  ${line}`);
  console.log("\nFolder now holds:", (await readdir(OUT)).join(", "));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
