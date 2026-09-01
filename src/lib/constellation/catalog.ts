/**
 * THE STAR CATALOGUE — 1,000 stars, and the six figures drawn across them.
 *
 * The catalogue is generated rather than loaded. Thirty-eight of the stars are
 * real, carrying their catalogue right ascension, declination, magnitude and
 * spectral class, because the six official figures have to connect *something*
 * and connecting invented points would make the "Show known constellations"
 * layer a decoration rather than a fact. The remaining ~960 fill the sky.
 *
 * GENERATION IS DETERMINISTIC, AND THAT IS LOAD-BEARING. A shared sky is a
 * list of star indices in a URL. If the filler stars were seeded from
 * `Math.random()` the same link would draw a different shape in every browser
 * it was opened in — the share feature would look like it worked while
 * silently producing nonsense. `mulberry32` with a fixed seed means index 412
 * is the same star for everyone, forever. Changing SEED or STAR_COUNT
 * invalidates every link ever shared.
 *
 * Positions are stored as unit vectors on the celestial sphere alongside their
 * spherical coordinates. Both projections need the vector, the readout needs
 * the angles, and deriving either per frame for a thousand stars is work that
 * never changes.
 */

/**
 * Total stars in the sky.
 *
 * 2,400, up from 1,000, and this **invalidates every constellation link
 * shared before the change** — as does adding the six new figures, which push
 * every filler star's index along. That is the cost the note above warns
 * about, paid deliberately: a bigger sky was asked for, and there is no way
 * to add stars to a deterministic catalogue without moving the ones after
 * them. Nothing is broken by it — an old link still resolves to real stars
 * and still draws a shape — it is simply a different shape than the person
 * who sent it saw.
 *
 * If share links ever need to survive a resize, the fix is to append filler
 * rather than regenerate: keep the old sequence intact and draw the extra
 * stars from a second seeded stream after it. Not worth the machinery while
 * the feature is this young.
 */
export const STAR_COUNT = 2400;

/** Fixed seed for the filler stars. Part of the share format. */
const SEED = 0x5eed1e55;

export type SpectralClass = "O" | "B" | "A" | "F" | "G" | "K" | "M";

export interface Star {
  /** Index into the catalogue. This is what a share link stores. */
  id: number;
  /** Right ascension, in hours (0–24). */
  ra: number;
  /** Declination, in degrees (−90 to +90). */
  dec: number;
  /** Apparent visual magnitude. Lower is brighter. */
  mag: number;
  spect: SpectralClass;
  /** Proper name, for the 38 real stars. */
  name?: string;
  /** Unit vector on the celestial sphere, precomputed. */
  x: number;
  y: number;
  z: number;
  /** Twinkle phase and angular frequency, fixed per star. */
  phase: number;
  omega: number;
  /** Radius in px at unit zoom, from magnitude. */
  size: number;
  /** Base opacity, from magnitude. */
  alpha: number;
  /** `rgb(r, g, b)` for this spectral class. */
  color: string;
}

export interface Figure {
  id: string;
  name: string;
  /** Pairs of catalogue indices. */
  edges: Array<[number, number]>;
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

/**
 * Approximate sRGB for each spectral class, from black-body colour at that
 * class's effective temperature. Deliberately desaturated: a sky of fully
 * saturated blues and reds reads as confetti, not as stars.
 */
const SPECTRAL_COLOR: Record<SpectralClass, string> = {
  O: "rgb(155, 176, 255)",
  B: "rgb(170, 191, 255)",
  A: "rgb(213, 224, 255)",
  F: "rgb(249, 245, 255)",
  G: "rgb(255, 237, 227)",
  K: "rgb(255, 210, 161)",
  M: "rgb(255, 181, 138)",
};

export function colorOf(spect: SpectralClass): string {
  return SPECTRAL_COLOR[spect];
}

/**
 * Relative frequency of each class among the filler stars.
 *
 * Not the true stellar distribution — by count the galaxy is overwhelmingly M
 * dwarfs, and a sky drawn to that would be uniformly orange. These are the
 * proportions of what is *visible* to the eye, where hot luminous stars are
 * over-represented because they can be seen from much further away.
 */
const CLASS_WEIGHTS: Array<[SpectralClass, number]> = [
  ["O", 0.006],
  ["B", 0.09],
  ["A", 0.21],
  ["F", 0.19],
  ["G", 0.19],
  ["K", 0.2],
  ["M", 0.114],
];

/* ── Deterministic noise ────────────────────────────────────────────────── */

/** mulberry32 — small, fast, and identical across engines. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── The real stars ─────────────────────────────────────────────────────── */

/**
 * Catalogue rows for the stars the six figures are drawn through.
 *
 * `[name, RA hours, Dec degrees, magnitude, class]`. Coordinates are J2000,
 * rounded to the arcminute — finer than a screen can show at any zoom this
 * offers.
 */
type NamedRow = [string, number, number, number, SpectralClass];

const ORION: NamedRow[] = [
  ["Betelgeuse", 5.919, 7.407, 0.5, "M"],
  ["Rigel", 5.242, -8.202, 0.12, "B"],
  ["Bellatrix", 5.418, 6.35, 1.64, "B"],
  ["Mintaka", 5.533, -0.299, 2.23, "O"],
  ["Alnilam", 5.604, -1.202, 1.69, "B"],
  ["Alnitak", 5.679, -1.943, 1.77, "O"],
  ["Saiph", 5.796, -9.67, 2.06, "B"],
];

const URSA_MAJOR: NamedRow[] = [
  ["Dubhe", 11.062, 61.751, 1.79, "K"],
  ["Merak", 11.031, 56.382, 2.37, "A"],
  ["Phecda", 11.897, 53.695, 2.44, "A"],
  ["Megrez", 12.257, 57.033, 3.31, "A"],
  ["Alioth", 12.9, 55.96, 1.77, "A"],
  ["Mizar", 13.399, 54.925, 2.27, "A"],
  ["Alkaid", 13.792, 49.313, 1.86, "B"],
];

const CASSIOPEIA: NamedRow[] = [
  ["Segin", 1.907, 63.67, 3.38, "B"],
  ["Ruchbah", 1.43, 60.235, 2.68, "A"],
  ["Tsih", 0.945, 60.717, 2.47, "B"],
  ["Schedar", 0.675, 56.537, 2.24, "K"],
  ["Caph", 0.153, 59.15, 2.28, "F"],
];

const PEGASUS: NamedRow[] = [
  ["Markab", 23.079, 15.205, 2.49, "B"],
  ["Scheat", 23.063, 28.083, 2.42, "M"],
  ["Algenib", 0.22, 15.184, 2.83, "B"],
  ["Alpheratz", 0.14, 29.09, 2.06, "B"],
  ["Enif", 21.736, 9.875, 2.39, "K"],
  ["Homam", 22.692, 10.831, 3.4, "B"],
];

const SCORPIUS: NamedRow[] = [
  ["Antares", 16.49, -26.432, 0.96, "M"],
  ["Graffias", 16.09, -19.805, 2.62, "B"],
  ["Dschubba", 16.005, -22.622, 2.29, "B"],
  ["Fang", 15.982, -26.114, 2.89, "B"],
  ["Alniyat", 16.353, -25.593, 2.89, "B"],
  ["Paikauhale", 16.598, -28.216, 2.82, "B"],
  ["Shaula", 17.56, -37.104, 1.62, "B"],
  ["Sargas", 17.622, -42.998, 1.87, "F"],
];

const CYGNUS: NamedRow[] = [
  ["Deneb", 20.69, 45.28, 1.25, "A"],
  ["Sadr", 20.37, 40.257, 2.23, "F"],
  ["Albireo", 19.512, 27.96, 3.08, "K"],
  ["Gienah", 20.77, 33.97, 2.48, "K"],
  ["Fawaris", 19.749, 45.131, 2.87, "B"],
];

/* ── Six more figures ─────────────────────────────────────────────────────
   Same rules as the six above: real stars, J2000 coordinates rounded to the
   arcminute, real magnitudes and classes. Chosen to spread the named sky
   around the sphere rather than to be the six next-brightest — Orion,
   Cassiopeia, Pegasus and Cygnus are all northern and all within a few hours
   of each other in right ascension, so a visitor panning south used to find
   nothing labelled at all. Canis Major joins Scorpius in anchoring the south,
   Leo and Gemini carry the spring and winter sky, Lyra the summer triangle. */

const LYRA: NamedRow[] = [
  ["Vega", 18.615, 38.783, 0.03, "A"],
  ["Sheliak", 18.834, 33.363, 3.52, "B"],
  ["Sulafat", 18.982, 32.69, 3.24, "B"],
  ["Delta Lyrae", 18.908, 36.898, 4.3, "M"],
  ["Zeta Lyrae", 18.746, 37.605, 4.36, "A"],
];

const TAURUS: NamedRow[] = [
  ["Aldebaran", 4.599, 16.509, 0.85, "K"],
  ["Elnath", 5.438, 28.608, 1.65, "B"],
  ["Tianguan", 5.627, 21.143, 3.0, "B"],
  ["Theta Tauri", 4.477, 15.871, 3.4, "A"],
  ["Ain", 4.478, 19.18, 3.53, "K"],
  ["Lambda Tauri", 4.011, 12.49, 3.47, "B"],
];

const LEO: NamedRow[] = [
  ["Regulus", 10.14, 11.967, 1.35, "B"],
  ["Denebola", 11.818, 14.572, 2.14, "A"],
  ["Algieba", 10.333, 19.842, 2.08, "K"],
  ["Zosma", 11.235, 20.524, 2.56, "A"],
  ["Chertan", 11.237, 15.43, 3.32, "A"],
  ["Algenubi", 9.764, 23.774, 2.98, "G"],
  ["Adhafera", 10.278, 23.417, 3.44, "F"],
];

const GEMINI: NamedRow[] = [
  ["Pollux", 7.755, 28.026, 1.14, "K"],
  ["Castor", 7.577, 31.888, 1.58, "A"],
  ["Alhena", 6.629, 16.399, 1.93, "A"],
  ["Mebsuta", 6.732, 25.131, 2.98, "G"],
  ["Tejat", 6.383, 22.514, 2.88, "M"],
  ["Mekbuda", 7.068, 20.57, 3.79, "F"],
];

const CANIS_MAJOR: NamedRow[] = [
  ["Sirius", 6.752, -16.716, -1.46, "A"],
  ["Mirzam", 6.378, -17.956, 1.98, "B"],
  ["Wezen", 7.14, -26.393, 1.83, "F"],
  ["Adhara", 6.977, -28.972, 1.5, "B"],
  ["Aludra", 7.402, -29.303, 2.45, "B"],
  ["Furud", 6.339, -30.063, 3.02, "B"],
];

const AURIGA: NamedRow[] = [
  ["Capella", 5.278, 45.998, 0.08, "G"],
  ["Menkalinan", 5.995, 44.947, 1.9, "A"],
  ["Mahasim", 5.995, 37.213, 2.62, "A"],
  ["Hassaleh", 4.95, 33.166, 2.69, "K"],
  // Formally Beta Tauri, and already carried in the Taurus block above. Listed
  // again rather than cross-referenced: `FIGURE_SPECS` resolves each figure's
  // edges against its own block, so a star two figures both reach has to
  // appear in both. Same sky position either way, so the two rows land on top
  // of each other and read as the one star they are.
  ["Elnath", 5.438, 28.608, 1.65, "B"],
];

/**
 * Each figure, as offsets into its own block of named stars. Resolved to
 * catalogue indices below, once the blocks have been laid out in order.
 */
const FIGURE_SPECS: Array<{
  id: string;
  name: string;
  rows: NamedRow[];
  edges: Array<[number, number]>;
}> = [
  {
    id: "ori",
    name: "Orion",
    rows: ORION,
    // Shoulders, belt, and the two legs. 0 Betelgeuse, 1 Rigel, 2 Bellatrix,
    // 3 Mintaka, 4 Alnilam, 5 Alnitak, 6 Saiph.
    edges: [
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [3, 1],
      [5, 6],
      [1, 6],
    ],
  },
  {
    id: "uma",
    name: "Ursa Major",
    rows: URSA_MAJOR,
    // The bowl, then the handle out to Alkaid.
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    id: "cas",
    name: "Cassiopeia",
    rows: CASSIOPEIA,
    // The W, in order.
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    id: "peg",
    name: "Pegasus",
    rows: PEGASUS,
    // The Great Square, then the neck out to Enif. Alpheratz is formally in
    // Andromeda but closes the square, which is how anyone actually sees it.
    edges: [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
      [0, 5],
      [5, 4],
    ],
  },
  {
    id: "sco",
    name: "Scorpius",
    rows: SCORPIUS,
    // Claws down through Antares to the sting.
    edges: [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [0, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    id: "cyg",
    name: "Cygnus",
    rows: CYGNUS,
    // The Northern Cross: Sadr at the crossing, Deneb at the tail.
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
  },
  {
    id: "lyr",
    name: "Lyra",
    rows: LYRA,
    // Vega off the top of the lyre, then the parallelogram below it.
    // 0 Vega, 1 Sheliak, 2 Sulafat, 3 Delta, 4 Zeta.
    edges: [
      [0, 4],
      [4, 3],
      [3, 2],
      [2, 1],
      [1, 4],
    ],
  },
  {
    id: "tau",
    name: "Taurus",
    rows: TAURUS,
    // The V of the Hyades through Aldebaran, then the two horns.
    // 0 Aldebaran, 1 Elnath, 2 Tianguan, 3 Theta, 4 Ain, 5 Lambda.
    edges: [
      [5, 3],
      [3, 0],
      [0, 4],
      [4, 1],
      [0, 2],
    ],
  },
  {
    id: "leo",
    name: "Leo",
    rows: LEO,
    // The sickle from Regulus up through Algieba, then the hindquarters.
    // 0 Regulus, 1 Denebola, 2 Algieba, 3 Zosma, 4 Chertan, 5 Algenubi,
    // 6 Adhafera.
    edges: [
      [0, 2],
      [2, 6],
      [6, 5],
      [2, 3],
      [3, 1],
      [1, 4],
      [4, 0],
    ],
  },
  {
    id: "gem",
    name: "Gemini",
    rows: GEMINI,
    // The twins: two heads at the top, two bodies running down to Alhena.
    // 0 Pollux, 1 Castor, 2 Alhena, 3 Mebsuta, 4 Tejat, 5 Mekbuda.
    edges: [
      [1, 0],
      [1, 3],
      [3, 4],
      [0, 5],
      [5, 2],
    ],
  },
  {
    id: "cma",
    name: "Canis Major",
    rows: CANIS_MAJOR,
    // Sirius at the neck, down the body to the hind legs and the tail.
    // 0 Sirius, 1 Mirzam, 2 Wezen, 3 Adhara, 4 Aludra, 5 Furud.
    edges: [
      [1, 0],
      [0, 2],
      [2, 3],
      [3, 5],
      [2, 4],
    ],
  },
  {
    id: "aur",
    name: "Auriga",
    rows: AURIGA,
    // The pentagon, closing on Elnath — which Taurus also claims, and which is
    // why it appears in both blocks. 0 Capella, 1 Menkalinan, 2 Mahasim,
    // 3 Hassaleh, 4 Elnath.
    edges: [
      [0, 1],
      [1, 2],
      [2, 4],
      [4, 3],
      [3, 0],
    ],
  },
];

/* ── Assembly ───────────────────────────────────────────────────────────── */

/**
 * Apparent radius in px for a magnitude, at unit zoom.
 *
 * Magnitude is logarithmic and inverted — every 5 steps is a factor of 100 in
 * flux — so a linear map produces either a sky of identical dots or one where
 * Rigel is the size of a coin. The exponential keeps the brightest near 2.6px
 * and the faintest near 0.5px, the range that still reads as a star field once
 * the glow is composited on top.
 */
function sizeForMagnitude(mag: number): number {
  // WIDENED AGAIN, and this is the second time for the same reason. It went
  // `0.45 + 2.2·exp(…)` (≈0.5–2.6px) → `0.35 + 3.9·exp(…)` (≈0.35–4.4px) and
  // is now ≈0.28–8.2px, because 4.4px was still not enough separation for the
  // near/far reading to land: at that spread the sky was three or four
  // sizes of dot rather than a depth.
  //
  // The steeper exponent is what does the work. 0.42 flattened the curve
  // across the faint majority, so the ~90% of the sky between magnitude 3 and
  // 6.5 came out within half a pixel of each other; 0.52 pushes that crowd
  // down to genuinely small and lets the handful of bright stars run away.
  // Sirius at −1.46 now draws about 8px, the faintest about a quarter of one.
  return 0.28 + 7.9 * Math.exp(-0.52 * (mag + 1.5));
}

/**
 * A faint colour cast for a minority of stars, keyed off the star's index.
 *
 * Derived from the index by hash rather than drawn from the shared RNG. That
 * is not a style choice: the filler stars are generated from one seeded
 * sequence, and taking an extra `rand()` inside that loop would shift every
 * subsequent draw — moving every star after the first tinted one and silently
 * invalidating every share link ever made. Hashing the index leaves the
 * sequence untouched.
 *
 * The hints are deliberately weak. Stars are not actually green — the eye
 * never sees one, because a black body peaking in green emits enough red and
 * blue to read as white — so green appears here only as a trace on a handful
 * of stars, the way a faint aurora tint reads in a long exposure. Blue and
 * gold do most of the work, which is what the sky actually shows.
 */
const TINTS: Array<[number, number, number]> = [
  [255, 214, 120], // gold
  [120, 190, 255], // blue
  [255, 168, 110], // amber
  [150, 245, 200], // faint green
  [200, 170, 255], // violet
];

/** How strongly a tinted star pulls toward its hint, 0–1. */
const TINT_STRENGTH = 0.55;

function hash32(n: number): number {
  let x = (n + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function parseRgb(css: string): [number, number, number] {
  const m = css.match(/(\d+)\D+(\d+)\D+(\d+)/);
  if (!m) return [255, 255, 255];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * The star's drawn colour: its spectral colour, pulled part-way toward a hint
 * for roughly one star in nine. Blended rather than replaced, so a tinted star
 * still reads as the class it belongs to.
 */
function colorForStar(id: number, spect: SpectralClass): string {
  const h = hash32(id);
  // ~11% of stars carry a hint.
  if (h % 9 !== 0) return colorOf(spect);

  const [tr, tg, tb] = TINTS[(h >>> 8) % TINTS.length];
  const [br, bg, bb] = parseRgb(colorOf(spect));
  const mix = (base: number, tint: number) =>
    Math.round(base + (tint - base) * TINT_STRENGTH);
  return `rgb(${mix(br, tr)}, ${mix(bg, tg)}, ${mix(bb, tb)})`;
}

/**
 * Base opacity for a magnitude — and the rule that ties it to size.
 *
 * BIGGER MEANS NEARER MEANS BRIGHTER. Both this and `sizeForMagnitude` read
 * the same magnitude and both move the same way, so a star cannot come out
 * large and dim or small and blazing: the two channels always agree, which is
 * what makes the field read as depth rather than as scattered confetti.
 *
 * The old curve ran 0.35 → 1.0 across the whole sky, and 0.35 is not faint —
 * it is clearly visible, so the dimmest star sat only two-thirds of the way
 * below the brightest and the depth cue was carried almost entirely by size.
 * 0.14 → 1.0 on a squared falloff puts the faint majority genuinely far back:
 * squaring keeps the bright end where it was while dropping everything past
 * magnitude 4 much harder, which is the same shape the size curve above takes
 * and the reason the two now reinforce each other instead of competing.
 */
function alphaForMagnitude(mag: number): number {
  const t = Math.max(0, Math.min(1, (6.5 - mag) / 8));
  return 0.14 + 0.86 * t * t;
}

function makeStar(
  id: number,
  ra: number,
  dec: number,
  mag: number,
  spect: SpectralClass,
  rand: () => number,
  name?: string,
): Star {
  const raRad = (ra / 24) * Math.PI * 2;
  const decRad = (dec * Math.PI) / 180;
  const cosDec = Math.cos(decRad);

  return {
    id,
    ra,
    dec,
    mag,
    spect,
    name,
    x: cosDec * Math.cos(raRad),
    y: Math.sin(decRad),
    z: cosDec * Math.sin(raRad),
    phase: rand() * Math.PI * 2,
    // Between roughly 0.35 and 1.1 rad/s. Every star twinkling at one rate
    // pulses the whole sky in unison, which reads as a flickering screen.
    omega: 0.35 + rand() * 0.75,
    size: sizeForMagnitude(mag),
    alpha: alphaForMagnitude(mag),
    color: colorForStar(id, spect),
  };
}

function pickClass(r: number): SpectralClass {
  let acc = 0;
  for (const [cls, weight] of CLASS_WEIGHTS) {
    acc += weight;
    if (r <= acc) return cls;
  }
  return "M";
}

export interface Catalogue {
  stars: Star[];
  figures: Figure[];
  /** Indices belonging to a named figure, for the "known" layer. */
  figureStars: Set<number>;
}

let cached: Catalogue | null = null;

/**
 * The catalogue. Built once per page, then shared — every caller gets the same
 * array identity, so nothing downstream has to guard against it changing.
 */
export function getCatalogue(): Catalogue {
  if (cached) return cached;

  const rand = mulberry32(SEED);
  const stars: Star[] = [];
  const figures: Figure[] = [];
  const figureStars = new Set<number>();

  // Real stars first, so their indices are low, stable, and independent of
  // STAR_COUNT — a share link that references Betelgeuse keeps working even if
  // the filler count is ever retuned.
  for (const spec of FIGURE_SPECS) {
    const base = stars.length;
    for (const [name, ra, dec, mag, spect] of spec.rows) {
      figureStars.add(stars.length);
      stars.push(makeStar(stars.length, ra, dec, mag, spect, rand, name));
    }
    figures.push({
      id: spec.id,
      name: spec.name,
      edges: spec.edges.map(([a, b]) => [base + a, base + b] as [number, number]),
    });
  }

  // Filler. Declination is drawn as `asin(uniform(-1, 1))` rather than as a
  // uniform angle: uniform declination piles stars up at the poles, because
  // equal steps in declination cover less sky the closer they get to one.
  while (stars.length < STAR_COUNT) {
    const ra = rand() * 24;
    const dec = (Math.asin(rand() * 2 - 1) * 180) / Math.PI;

    // Magnitudes skewed faint, and skewed harder than before. `1 - r^0.55`
    // over the range 1–6.5 gave a sky whose brightest filler star was
    // magnitude 1, which put hundreds of stars in the size range the real
    // named ones occupy — so nothing stood out and the "some stars are much
    // nearer" reading had nothing to hang on.
    //
    // Two changes. The range starts at 0.4 rather than 1, so the rare bright
    // draw is genuinely bright; and the exponent drops to 0.40, which pushes
    // far more of the distribution toward the faint end. The result is a sky
    // that is mostly dim specks with a scattering of standouts, which is both
    // what the eye actually sees and what makes the new size and alpha curves
    // above legible.
    const mag = 0.4 + 6.1 * (1 - Math.pow(rand(), 0.4));
    stars.push(makeStar(stars.length, ra, dec, mag, pickClass(rand()), rand));
  }

  cached = { stars, figures, figureStars };
  return cached;
}

/** Formatted right ascension and declination, for the corner readout. */
export function formatCoords(ra: number, dec: number): string {
  const h = Math.floor(ra);
  const m = Math.floor((ra - h) * 60);
  const sign = dec < 0 ? "−" : "+";
  const d = Math.floor(Math.abs(dec));
  const dm = Math.floor((Math.abs(dec) - d) * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}h ${pad(m)}m  ${sign}${pad(d)}° ${pad(dm)}′`;
}
