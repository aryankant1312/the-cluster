/**
 * THE SKY ATLAS — the real night sky, as the Vault reads it.
 *
 * `public/data/sky-atlas.json` is built by `scripts/build-sky-atlas.mjs` from
 * two public datasets: the HYG star catalogue for the stars, and d3-celestial's
 * line figures for the 88 IAU constellations. This module is the only place
 * that knows the file's shape, plus the astronomy needed to turn a catalogue
 * row into something a renderer can draw: where a star sits on the sphere, how
 * big it should look, and what colour it is.
 *
 * The maths lives here rather than in the component because the build script
 * has to agree with it — constellation figures are snapped to catalogue stars
 * at build time using the same projection.
 */

/** Radius of the celestial sphere, in world units. Arbitrary but fixed. */
export const SKY_RADIUS = 100;

export interface SkyAtlas {
  meta: {
    stars: number;
    magLimit: number;
    starSource: string;
    figureSource: string;
  };
  /** Right ascension, in hours (0–24). Parallel to every other star array. */
  ra: number[];
  /** Declination, in degrees (−90–+90). */
  dec: number[];
  /** Apparent visual magnitude. Lower is brighter; Sirius is −1.44. */
  mag: number[];
  /** B−V colour index. Negative is blue-hot, positive is red-cool. */
  ci: number[];
  /** Sparse — only the ~350 stars with a proper name, keyed by star index. */
  names: Record<string, string>;
  /** Sparse — Bayer/Flamsteed designation, e.g. "Alpha CMa". */
  desig: Record<string, string>;
  /** Sparse — spectral classification, e.g. "A1Vm". */
  spect: Record<string, string>;
  /** Sparse — the three-letter constellation the star falls in. */
  con: Record<string, string>;
  /** Every IAU abbreviation to its full name. */
  constellations: Record<string, string>;
  figures: Array<{ id: string; name: string; edges: Array<[number, number]> }>;
}

/**
 * A star, assembled for display. Built on demand from the parallel arrays
 * rather than stored, because 8,920 objects is 8,920 objects and only one of
 * them is ever in a panel at a time.
 */
export interface StarFacts {
  index: number;
  /** Best available label: proper name, else designation, else catalogue id. */
  label: string;
  /** Set only when the star has both a proper name and a designation. */
  secondary: string | null;
  magnitude: number;
  spectralClass: string | null;
  constellation: string | null;
  ra: number;
  dec: number;
}

/**
 * Cartesian position on the celestial sphere.
 *
 * Right ascension increases eastward, and the sky is drawn as seen from
 * *inside* the sphere, so the angle is negated — otherwise every constellation
 * renders mirrored, which is the kind of bug nobody notices until an
 * astronomer does.
 */
export function sphericalToCartesian(
  raHours: number,
  decDeg: number,
  radius = SKY_RADIUS,
): [number, number, number] {
  const a = -(raHours / 24) * Math.PI * 2;
  const b = (decDeg / 180) * Math.PI;
  return [
    radius * Math.cos(b) * Math.cos(a),
    radius * Math.sin(b),
    radius * Math.cos(b) * Math.sin(a),
  ];
}

/** The inverse, for reading the coordinates the camera is pointed at. */
export function cartesianToSpherical(x: number, y: number, z: number) {
  const r = Math.hypot(x, y, z) || 1;
  const dec = (Math.asin(y / r) * 180) / Math.PI;
  let ra = (-Math.atan2(z, x) / (Math.PI * 2)) * 24;
  ra = ((ra % 24) + 24) % 24;
  return { ra, dec };
}

/**
 * Apparent size of a star, in the units the point shader expects.
 *
 * Magnitude is logarithmic — five magnitudes is a hundredfold in received
 * light — so taking drawing radius linearly from it gives either a sky of
 * identical dots or one where Sirius eats the screen. Radius comes from flux
 * raised to a fractional power instead, the standard trick for making a
 * magnitude range legible: the brightest stars stay clearly brightest while
 * the faintest stay visible.
 */
export function magnitudeToSize(mag: number): number {
  const flux = Math.pow(10, -0.4 * mag);
  return Math.min(9, Math.max(0.3, 3.4 * Math.pow(flux, 0.38)));
}

/** How much of the star's colour actually reaches the eye. */
export function magnitudeToBrightness(mag: number): number {
  return Math.min(1, Math.max(0.12, 0.16 + (0.84 * (6.7 - mag)) / 8.2));
}

/**
 * Colour index to RGB.
 *
 * Stops are interpolated rather than stepped, so a sky sorted by colour has no
 * visible banding. They are also deliberately desaturated against the textbook
 * values: real stars are near-white to the eye, and a sky of saturated
 * primaries reads as a screensaver rather than as a sky.
 */
const COLOUR_STOPS: Array<[number, [number, number, number]]> = [
  [-0.35, [0.61, 0.72, 1.0]],
  [0.0, [0.82, 0.88, 1.0]],
  [0.3, [1.0, 1.0, 0.98]],
  [0.58, [1.0, 0.96, 0.83]],
  [0.81, [1.0, 0.9, 0.67]],
  [1.4, [1.0, 0.79, 0.53]],
  [2.0, [1.0, 0.67, 0.47]],
];

export function colourIndexToRgb(ci: number): [number, number, number] {
  if (ci <= COLOUR_STOPS[0][0]) return COLOUR_STOPS[0][1];
  const last = COLOUR_STOPS[COLOUR_STOPS.length - 1];
  if (ci >= last[0]) return last[1];
  for (let i = 1; i < COLOUR_STOPS.length; i++) {
    const [hi, hiC] = COLOUR_STOPS[i];
    if (ci > hi) continue;
    const [lo, loC] = COLOUR_STOPS[i - 1];
    const t = (ci - lo) / (hi - lo);
    return [
      loC[0] + (hiC[0] - loC[0]) * t,
      loC[1] + (hiC[1] - loC[1]) * t,
      loC[2] + (hiC[2] - loC[2]) * t,
    ];
  }
  return last[1];
}

/** Coordinates in the notation an atlas would print them. */
export function formatCoordinates(raHours: number, decDeg: number): string {
  const rh = Math.floor(raHours);
  const rm = Math.floor((raHours - rh) * 60);
  const sign = decDeg < 0 ? "−" : "+";
  const ad = Math.abs(decDeg);
  const dd = Math.floor(ad);
  const dm = Math.floor((ad - dd) * 60);
  return (
    `${String(rh).padStart(2, "0")}h ${String(rm).padStart(2, "0")}m` +
    `  ${sign}${String(dd).padStart(2, "0")}° ${String(dm).padStart(2, "0")}′`
  );
}

/** Everything the info panel needs about one star. */
export function starFacts(atlas: SkyAtlas, index: number): StarFacts {
  const key = String(index);
  const proper = atlas.names[key];
  const designation = atlas.desig[key];
  const conKey = atlas.con[key];
  return {
    index,
    label: proper ?? designation ?? `Star ${index}`,
    secondary: proper && designation ? designation : null,
    magnitude: atlas.mag[index],
    spectralClass: atlas.spect[key] ?? null,
    constellation: conKey ? (atlas.constellations[conKey] ?? conKey) : null,
    ra: atlas.ra[index],
    dec: atlas.dec[index],
  };
}

/**
 * Fetch the atlas once per page load.
 *
 * The file is half a megabyte and never changes, so a second visit to the
 * Vault in the same session should not pay for it twice. The promise is
 * cached rather than the result, so two components mounting in the same tick
 * share one request instead of racing.
 */
let atlasPromise: Promise<SkyAtlas> | null = null;

export function loadSkyAtlas(): Promise<SkyAtlas> {
  if (!atlasPromise) {
    atlasPromise = fetch("/data/sky-atlas.json")
      .then((res) => {
        if (!res.ok) throw new Error(`sky atlas: ${res.status}`);
        return res.json() as Promise<SkyAtlas>;
      })
      .catch((err) => {
        // A failed fetch must not poison the cache — the next mount should be
        // allowed to try again rather than replay the rejection forever.
        atlasPromise = null;
        throw err;
      });
  }
  return atlasPromise;
}
