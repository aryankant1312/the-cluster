#!/usr/bin/env node
/**
 * Build `public/data/sky-atlas.json` — the real night sky, compacted for the
 * Vault's constellation table.
 *
 *   node scripts/build-sky-atlas.mjs <hygdata.csv.gz> <constellations.lines.json>
 *
 * Two public datasets go in, one asset comes out:
 *
 *   - HYG v4.0 (astronexus/HYG-Database, CC BY-SA 2.5) — every star, with
 *     right ascension, declination, apparent magnitude, colour index,
 *     spectral class and, for the few hundred that have one, a proper name.
 *   - d3-celestial constellation line figures (ofrohn/d3-celestial,
 *     BSD-3-Clause) — the 88 IAU stick figures as RA/Dec polylines.
 *
 * The raw pair is ~14 MB. The Vault only ever draws stars a human eye could
 * see, so everything fainter than magnitude 6.5 is dropped — that is the
 * naked-eye limit, and it takes 120k stars down to ~8.9k.
 *
 * The figures arrive as loose coordinates rather than as references to
 * catalogue entries, which would have drawn constellation lines that miss the
 * stars they connect by a fraction of a degree. Each vertex is snapped here,
 * at build time, to the nearest catalogue star, so a figure is stored as pairs
 * of indices into the star arrays and every line lands exactly on a rendered
 * star.
 *
 * Output shape is parallel arrays, not an array of objects: a `{ra, dec, mag,
 * ci}` per star costs about four times the bytes and has to be re-flattened
 * into typed arrays for WebGL anyway.
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const OUT = resolve(APP, "public/data/sky-atlas.json");

/** The naked-eye limit. Fainter stars are invisible to the eye and to us. */
const MAG_LIMIT = 6.5;

const [, , hygPath, figuresPath] = process.argv;
if (!hygPath || !figuresPath) {
  console.error("usage: node scripts/build-sky-atlas.mjs <hygdata.csv.gz> <constellations.lines.json>");
  process.exit(1);
}

/** The 88 IAU constellations, keyed by the abbreviation both datasets use. */
const CONSTELLATION_NAMES = {
  And: "Andromeda", Ant: "Antlia", Aps: "Apus", Aqr: "Aquarius", Aql: "Aquila",
  Ara: "Ara", Ari: "Aries", Aur: "Auriga", Boo: "Boötes", Cae: "Caelum",
  Cam: "Camelopardalis", Cnc: "Cancer", CVn: "Canes Venatici", CMa: "Canis Major",
  CMi: "Canis Minor", Cap: "Capricornus", Car: "Carina", Cas: "Cassiopeia",
  Cen: "Centaurus", Cep: "Cepheus", Cet: "Cetus", Cha: "Chamaeleon", Cir: "Circinus",
  Col: "Columba", Com: "Coma Berenices", CrA: "Corona Australis", CrB: "Corona Borealis",
  Crv: "Corvus", Crt: "Crater", Cru: "Crux", Cyg: "Cygnus", Del: "Delphinus",
  Dor: "Dorado", Dra: "Draco", Equ: "Equuleus", Eri: "Eridanus", For: "Fornax",
  Gem: "Gemini", Gru: "Grus", Her: "Hercules", Hor: "Horologium", Hya: "Hydra",
  Hyi: "Hydrus", Ind: "Indus", Lac: "Lacerta", Leo: "Leo", LMi: "Leo Minor",
  Lep: "Lepus", Lib: "Libra", Lup: "Lupus", Lyn: "Lynx", Lyr: "Lyra",
  Men: "Mensa", Mic: "Microscopium", Mon: "Monoceros", Mus: "Musca", Nor: "Norma",
  Oct: "Octans", Oph: "Ophiuchus", Ori: "Orion", Pav: "Pavo", Peg: "Pegasus",
  Per: "Perseus", Phe: "Phoenix", Pic: "Pictor", Psc: "Pisces", PsA: "Piscis Austrinus",
  Pup: "Puppis", Pyx: "Pyxis", Ret: "Reticulum", Sge: "Sagitta", Sgr: "Sagittarius",
  Sco: "Scorpius", Scl: "Sculptor", Sct: "Scutum", Ser: "Serpens", Sex: "Sextans",
  Tau: "Taurus", Tel: "Telescopium", Tri: "Triangulum", TrA: "Triangulum Australe",
  Tuc: "Tucana", UMa: "Ursa Major", UMi: "Ursa Minor", Vel: "Vela", Vir: "Virgo",
  Vol: "Volans", Vul: "Vulpecula",
};

/** Greek letters as HYG spells them in `bf`, expanded for display. */
const BAYER = {
  Alp: "Alpha", Bet: "Beta", Gam: "Gamma", Del: "Delta", Eps: "Epsilon",
  Zet: "Zeta", Eta: "Eta", The: "Theta", Iot: "Iota", Kap: "Kappa",
  Lam: "Lambda", Mu: "Mu", Nu: "Nu", Xi: "Xi", Omi: "Omicron", Pi: "Pi",
  Rho: "Rho", Sig: "Sigma", Tau: "Tau", Ups: "Upsilon", Phi: "Phi",
  Chi: "Chi", Psi: "Psi", Ome: "Omega",
};

/**
 * One CSV row, honouring quoted fields. HYG quotes its string columns and at
 * least one proper name contains a comma, so splitting on "," corrupts the
 * row from that column onward.
 */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * `Alp CMa` → `Alpha CMa`. HYG stores the Bayer letter abbreviated and the
 * constellation as its three-letter code; the genitive form ("Canis Majoris")
 * is not in the dataset, so the code is kept rather than guessed at.
 */
function designation(bf) {
  const raw = bf.trim();
  if (!raw) return "";
  const [letter, ...rest] = raw.split(/\s+/);
  const expanded = BAYER[letter] ?? letter;
  return rest.length ? `${expanded} ${rest.join(" ")}` : expanded;
}

console.log("reading catalogue…");
const csv = gunzipSync(readFileSync(hygPath)).toString("utf8");
const lines = csv.split("\n");
const header = splitCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
const col = Object.fromEntries(header.map((h, i) => [h, i]));

const ra = [];
const dec = [];
const mag = [];
const ci = [];
/** Sparse, keyed by star index — most stars have none of these. */
const names = {};
const desig = {};
const spect = {};
const con = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  const f = splitCsvLine(line);
  // id 0 is the Sun, which is not a thing you can point at in a night sky.
  if (f[col.id] === "0") continue;

  const m = Number.parseFloat(f[col.mag]);
  if (!Number.isFinite(m) || m > MAG_LIMIT) continue;

  const r = Number.parseFloat(f[col.ra]);
  const d = Number.parseFloat(f[col.dec]);
  if (!Number.isFinite(r) || !Number.isFinite(d)) continue;

  const idx = ra.length;
  ra.push(Number(r.toFixed(4)));
  dec.push(Number(d.toFixed(4)));
  mag.push(Number(m.toFixed(2)));
  ci.push(Number((Number.parseFloat(f[col.ci]) || 0).toFixed(3)));

  const proper = (f[col.proper] ?? "").trim();
  if (proper) names[idx] = proper;
  const bf = designation(f[col.bf] ?? "");
  if (bf) desig[idx] = bf;
  const sp = (f[col.spect] ?? "").trim();
  if (sp) spect[idx] = sp;
  const c = (f[col.con] ?? "").trim();
  if (c) con[idx] = c;
}

console.log(`kept ${ra.length} stars brighter than magnitude ${MAG_LIMIT}`);

/* ---------------------------------------------------------------------- */

/**
 * Unit vector on the celestial sphere. Shared with the runtime so the snap
 * done here and the placement done there agree exactly.
 */
function unit(raHours, decDeg) {
  const a = (raHours / 24) * Math.PI * 2;
  const b = (decDeg / 180) * Math.PI;
  return [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];
}

const unitVectors = ra.map((r, i) => unit(r, dec[i]));

/** Nearest catalogue star to a point on the sphere, by chord length. */
function nearestStar(raHours, decDeg) {
  const [x, y, z] = unit(raHours, decDeg);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < unitVectors.length; i++) {
    const v = unitVectors[i];
    const dx = v[0] - x, dy = v[1] - y, dz = v[2] - z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  // Chord → degrees. Anything further than a degree is not the star the
  // figure meant, so the segment is dropped rather than drawn wrong.
  const deg = (2 * Math.asin(Math.min(1, Math.sqrt(bestD) / 2)) * 180) / Math.PI;
  return { index: best, deg };
}

console.log("snapping constellation figures to catalogue stars…");
const geo = JSON.parse(readFileSync(figuresPath, "utf8"));
const figures = [];
let dropped = 0;

for (const feature of geo.features) {
  const id = feature.id;
  const edges = [];
  for (const path of feature.geometry.coordinates) {
    let prev = null;
    for (const [raDeg, decDeg] of path) {
      // d3-celestial writes RA in degrees over -180..180; the catalogue uses
      // hours over 0..24.
      const raHours = (((raDeg % 360) + 360) % 360) / 15;
      const hit = nearestStar(raHours, decDeg);
      const node = hit.deg <= 1 ? hit.index : null;
      if (prev !== null && node !== null && prev !== node) edges.push([prev, node]);
      else if (prev !== null && node === null) dropped++;
      prev = node;
    }
  }
  if (edges.length) {
    figures.push({ id, name: CONSTELLATION_NAMES[id] ?? id, edges });
  }
}

console.log(`built ${figures.length} figures (${dropped} vertices had no star within 1°)`);

const atlas = {
  meta: {
    stars: ra.length,
    magLimit: MAG_LIMIT,
    starSource: "HYG v4.0 — astronexus/HYG-Database (CC BY-SA 2.5)",
    figureSource: "d3-celestial constellation lines — ofrohn/d3-celestial (BSD-3-Clause)",
    builtBy: "scripts/build-sky-atlas.mjs",
  },
  ra,
  dec,
  mag,
  ci,
  names,
  desig,
  spect,
  con,
  constellations: CONSTELLATION_NAMES,
  figures,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(atlas));
console.log(`wrote ${OUT} (${(JSON.stringify(atlas).length / 1024).toFixed(0)} KB)`);
