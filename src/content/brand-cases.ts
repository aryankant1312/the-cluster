import type { StaticImageData } from "next/image";
import nothingCmfLogo from "../../public/images/brands/brand-nothing-cmf-mark.png";
import rouletteLogo from "../../public/images/brands/brand-roulette-mark.png";
import saregamaLogo from "../../public/images/brands/brand-saregama-mark.png";
import spotifyLogo from "../../public/images/brands/brand-spotify-mark.png";
import tunecoreLogo from "../../public/images/brands/brand-tunecore-mark.png";
import heroLogo from "../../public/images/brands/brand-hero-mark.png";
import mtvLogo from "../../public/images/brands/brand-mtv-mark.png";

/**
 * LOGO ARTWORK — why every import above ends in `-mark`.
 *
 * The delivered logos were flat artwork: each one had its own background
 * baked in as opaque pixels — a black plate for six of them, brand orange for
 * Nothing/CMF, plus a light frame around the Spotify app icon. Dropped onto a
 * black card they read as a box sitting *on* the card rather than as a logo
 * *in* it, which is what the Spotify tile looked wrong for.
 *
 * The `-mark` files are those same logos with the plate keyed out to real
 * transparency and the result cropped to the artwork, so the card colour is
 * the only background there is. The key is a soft luminance ramp (a hard cut
 * would have left the anti-aliased edges jagged); Nothing/CMF is keyed by
 * distance from its orange instead.
 *
 * Two of them are rebuilt by `npm run build:marks` rather than by hand, because
 * both needed more than a key — see `scripts/build-brand-marks.mjs`:
 *
 *   nothing-cmf — the old mark was cropped through its own artwork, cutting the
 *                 `c` off at the left edge and slicing `by NOTHING` in half at
 *                 the bottom. It is re-cut from the delivered card to the true
 *                 lockup and padded square, so `object-contain` centres the
 *                 logo instead of centring a clipped crop. `by NOTHING` is
 *                 dilated, since dot-matrix type that fine vanished on the belt.
 *
 *   spotify     — now the full wordmark, not the app icon's green disc. It was
 *                 delivered black on a near-white plate, which is invisible on a
 *                 black tile, so the plate is keyed out and the artwork inverted
 *                 to white.
 *
 * The originals are kept beside them, unmodified, as the source artwork.
 */

export type CampaignVideo =
  | { kind: "youtube"; id: string }
  | { kind: "file"; src: string };

export interface BrandCase {
  id: string;
  name: string;
  logo: StaticImageData;
  /** Sampled from the logo's own artwork, not a generic white card. */
  bg: string;
  /**
   * How much of the card the mark is allowed to occupy, 0–1.
   *
   * `object-contain` alone sizes by bounding box, which is not the same as
   * sizing by visual weight: TuneCore's hairline wordmark is 5.6:1 and would
   * come out a whisper, while Spotify's solid disc is 1:1 and would come out
   * shouting. Each value is set so every tile on the belt reads at the same
   * strength.
   */
  fit: number;
  campaign: string;
  role: string;
  /** `YYYY`, or empty while unconfirmed. */
  year: string;
  /**
   * Metrics stay `null` until real figures are supplied. The UI renders an
   * explicit "not published yet" state for null rather than a
   * plausible-looking number — a brand checking whether DOTM can deliver
   * must never be shown an invented statistic.
   */
  reach: string | null;
  views: string | null;
  deliverables: string[];
  video: CampaignVideo | null;
  /** Flip to true only once the numbers above are confirmed real. */
  verified: boolean;
}

export const brandCases: BrandCase[] = [
  {
    id: "nothing-cmf",
    name: "Nothing — CMF",
    logo: nothingCmfLogo,
    bg: "#fb5b31",
    fit: 0.7,
    campaign: "CMF Phone 2",
    role: "Artist / Creator / Campaign Face",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Music video", "Social content", "Product integration"],
    video: null,
    verified: false,
  },
  {
    id: "mtv-hustle",
    name: "MTV / Jio Hotstar",
    logo: mtvLogo,
    bg: "#000000",
    fit: 0.52,
    campaign: "MTV Hustle — Season 04",
    role: "Contestant / Performing artist",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Televised performances", "Original tracks", "Press appearances"],
    video: null,
    verified: false,
  },
  {
    id: "saregama",
    name: "Saregama",
    logo: saregamaLogo,
    bg: "#000000",
    fit: 0.62,
    campaign: "Label release",
    role: "Recording artist / Composer",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Studio release", "Promotional campaign"],
    video: null,
    verified: false,
  },
  {
    id: "hero-xtreme",
    name: "Hero — Xtreme 160R",
    logo: heroLogo,
    bg: "#000000",
    fit: 0.74,
    campaign: "Xtreme 160R",
    role: "Soundtrack / Featured artist",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Campaign soundtrack", "Brand film"],
    video: null,
    verified: false,
  },
  {
    id: "spotify",
    name: "Spotify",
    logo: spotifyLogo,
    bg: "#000000",
    // Was 0.46, sized for a lone 1:1 disc. The mark is now the full 3.6:1
    // wordmark, so the tile's width is what constrains it rather than its
    // height; 0.46 would have set the whole lockup at half the height the
    // disc alone used to have.
    fit: 0.74,
    campaign: "Editorial & artist programming",
    role: "Featured artist",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Playlist features", "Artist canvas", "Editorial support"],
    video: null,
    verified: false,
  },
  {
    id: "roulette",
    name: "Roulette",
    logo: rouletteLogo,
    bg: "#000000",
    fit: 0.74,
    campaign: "Brand collaboration",
    role: "Featured artist",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Social content"],
    video: null,
    verified: false,
  },
  {
    id: "tunecore",
    name: "TuneCore",
    logo: tunecoreLogo,
    bg: "#000000",
    fit: 0.82,
    campaign: "Distribution partnership",
    role: "Independent artist",
    year: "",
    reach: null,
    views: null,
    deliverables: ["Catalogue distribution"],
    video: null,
    verified: false,
  },
];

export function brandCaseById(id: string): BrandCase | undefined {
  return brandCases.find((b) => b.id === id);
}
