/**
 * Rich, macOS-style brand tiles for the DOTM MagnificationDock.
 * Each tile is a self-contained SVG that fills its parent (w-full h-full),
 * so it stays crisp at every magnified size. A shared <Gloss/> adds the
 * glassy top highlight that reads as a premium app icon.
 */

import Image from "next/image";

function Gloss() {
  return (
    <>
      <defs>
        <linearGradient id="tile-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="26" rx="12" fill="url(#tile-gloss)" />
    </>
  );
}

const TILE = "w-full h-full block";

/**
 * Inset for tiles whose art is a transparent glyph on a solid plate, rather
 * than edge-to-edge artwork. One constant so every inset tile reads at the
 * same optical weight — mixing 4/5 and 3/4 across tiles is exactly what makes
 * a dock look uneven.
 */
const INSET_ART = "w-4/5 h-4/5 object-contain";

export function NotesTile() {
  return (
    <svg viewBox="0 0 48 48" className={TILE} aria-hidden="true">
      <defs>
        <linearGradient id="nt-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7dc" />
          <stop offset="1" stopColor="#ffe9a8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#nt-bg)" />
      <rect x="0" y="0" width="48" height="12" rx="12" fill="#ffcf45" />
      <rect x="0" y="8" width="48" height="5" fill="#ffcf45" />
      <g stroke="#c9a23a" strokeWidth="2" strokeLinecap="round">
        <line x1="13" y1="21" x2="35" y2="21" />
        <line x1="13" y1="27" x2="35" y2="27" />
        <line x1="13" y1="33" x2="28" y2="33" />
      </g>
      <Gloss />
    </svg>
  );
}

/**
 * The music tile: a window onto a field of notes drifting past.
 *
 * `DockIcon` already clips this tile to a rounded box with a hairline ring —
 * a frame, in other words — and the artwork used to sit inside it perfectly
 * still. Every other tile on this dock opens a room; the player is the one
 * that plays, so its tile is the one that moves.
 *
 * WHAT DRIFTS IS THE DELIVERED ARTWORK, not glyphs redrawn here. It is already
 * a scattered field of notes and confetti in the DOTM palette, so sliding it
 * is enough — and the tile stays the same mark a returning visitor learned to
 * aim at, which a wholly new illustration would not be.
 *
 * TWO LAYERS AT DIFFERENT RATES. The far one is scaled up, dimmed and slowed
 * to roughly half speed; the near one runs at full strength. Two copies of one
 * image moving at one speed is a wipe. At two speeds it is depth — and depth
 * is what makes a frame read as a window rather than as a picture.
 *
 * The ground beneath is near-black rather than transparent. On the dock's
 * frosted glass a transparent tile let the wallpaper show through the gaps
 * between notes, so the "window" looked out onto the desktop it was sitting
 * on.
 *
 * Motion, timing and the reduced-motion stop live in `globals.css` under
 * `dock-music-drift`.
 */
export function MusicTile() {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a1620 0%, #0a0910 100%)" }}
    >
      <MusicDriftLayer
        className="dock-music-drift-slow opacity-30"
        style={{ transform: "scale(1.25)" }}
      />
      <MusicDriftLayer className="dock-music-drift" />

      {/* Feathered side edges, so a note arrives and leaves rather than
          appearing and vanishing against a hard border. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #0a0910 0%, rgba(10,9,16,0) 26%, rgba(10,9,16,0) 74%, #0a0910 100%)",
        }}
      />

      <Gloss48 />
    </div>
  );
}

/**
 * One drifting band: the artwork twice, side by side, in a track twice the
 * tile's width.
 *
 * The duplicate is what makes the loop seamless — at `-50%` the second copy
 * occupies exactly the frame the first held at `0%`, so the animation's two
 * ends are the same picture and there is no jump to disguise.
 *
 * `unoptimized` because both copies request one small PNG that already exceeds
 * the 96px it renders at; putting it through the optimizer twice per tile buys
 * nothing and costs a round trip on first paint.
 */
function MusicDriftLayer({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-0 flex w-[200%] ${className}`}
      style={style}
    >
      {[0, 1].map((i) => (
        <span key={i} className="relative block h-full w-1/2">
          <Image
            src="/images/dotm/music-icon.png"
            alt=""
            fill
            unoptimized
            className="object-contain p-[6%]"
            sizes="96px"
          />
        </span>
      ))}
    </span>
  );
}

/**
 * The shared `Gloss` as a standalone element.
 *
 * `Gloss` is an SVG fragment — a `<defs>` and a `<rect>` — and this tile is a
 * `<div>`, so it needs its own 48-unit canvas to live on. Same gradient and
 * same proportions, so this tile carries the identical highlight as its
 * neighbours.
 */
function Gloss48() {
  return (
    <svg
      viewBox="0 0 48 48"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <Gloss />
    </svg>
  );
}

export function ShowsTile() {
  return (
    <svg viewBox="0 0 48 48" className={TILE} aria-hidden="true">
      <defs>
        <linearGradient id="sh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#141416" />
          <stop offset="1" stopColor="#070708" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#sh-bg)" />
      <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1">
        <path d="M0 16 H48 M0 30 H48 M16 0 V48 M32 0 V48" />
      </g>
      <path
        d="M24 12c-4.4 0-8 3.4-8 7.7 0 5.4 8 14.3 8 14.3s8-8.9 8-14.3c0-4.3-3.6-7.7-8-7.7z"
        fill="#e11d2a"
        stroke="#fff"
        strokeWidth="1.4"
      />
      <circle cx="24" cy="19.6" r="2.8" fill="#fff" />
      <Gloss />
    </svg>
  );
}

export function DotmTile() {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/images/dotm/logo.jpg"
        alt="DOTM"
        fill
        priority
        className="object-cover"
        sizes="96px"
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
    </div>
  );
}

/**
 * Contact, as the looping handset-and-envelope animation.
 *
 * The delivered clip is a black handset beside a cyan envelope on a solid
 * white card. Both halves of that are wrong for this dock: the white card was
 * the `bg-white` plate this tile used to carry — the only opaque white square
 * on a row of dark, transparent-cornered marks — and a cyan envelope is a
 * second accent colour on a dock that already has one.
 *
 * `scripts/build-icon-alpha.mjs` inverts the clip so the ground goes black and
 * the mark goes white, then uses that inverted luminance as the alpha channel
 * over flat white. What ships is a white icon on nothing, which is what the
 * rest of the row is, and it needs no plate to sit on.
 *
 * The tile is declared `bare` on the dock, so nothing is drawn behind the mark
 * at all — the rounded ring every other tile wears was outlining an empty box
 * around a transparent glyph. Its own drop shadow is what gives it an edge now.
 *
 * A plain `<img>`, not `next/image`: the optimizer re-encodes animated WebP
 * into a still first frame, so the icon would simply stop moving.
 */
export function ContactTile() {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-[inherit]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/dotm/contact-icon.webp"
        alt=""
        width={160}
        height={160}
        aria-hidden="true"
        className={INSET_ART}
        style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.5))" }}
      />
    </div>
  );
}

/**
 * The artwork is a 512px RGBA mark with fully transparent corners, so it
 * never needed a plate behind it — the `bg-[#0a0a0a]` that used to sit here
 * drew a black square around a transparent icon and made this the only tile
 * on the dock with a visible box. Dropped, and the mark now fills the tile
 * rather than sitting at 80% inside it.
 */
export function PortfolioTile() {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-[inherit]">
      <Image
        src="/images/dotm/portfolio-icon.png"
        alt="Portfolio"
        width={48}
        height={48}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/**
 * Shoot on Sight — a viewfinder over a location pin.
 *
 * The crosshair says "sight", the pin says "location", and together they are
 * the name. Same 48-unit plate, same red-to-black ground as Drops below, so
 * the two sit at one weight in the dock rather than one leading the other.
 */
export function ShootOnSightTile() {
  return (
    <svg viewBox="0 0 48 48" className={TILE} aria-hidden="true">
      <defs>
        <linearGradient id="sos-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2a2e" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#sos-bg)" />
      <g
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.92"
      >
        {/* Four corners rather than a closed box: a full rectangle reads as a
            photo frame instead of as something being aimed. */}
        <path d="M11 17v-4h4M33 13h4v4M37 31v4h-4M15 35h-4v-4" />
      </g>
      {/* The pin takes the persona's red — the one saturated mark on the tile,
          where the eye should land. */}
      <path
        d="M24 34c4.6-5.6 6.9-9.5 6.9-12.5a6.9 6.9 0 1 0-13.8 0c0 3 2.3 6.9 6.9 12.5z"
        fill="#ff2244"
      />
      <circle cx="24" cy="21.2" r="2.6" fill="#0a0a0b" />
      <Gloss />
    </svg>
  );
}

export function DropsTile() {
  return (
    <svg viewBox="0 0 48 48" className={TILE} aria-hidden="true">
      <defs>
        <linearGradient id="dr-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e11d2a" />
          <stop offset="1" stopColor="#7c0011" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#dr-bg)" />
      <path
        d="M15 19h18l-1.6 16.2a2 2 0 0 1-2 1.8H18.6a2 2 0 0 1-2-1.8L15 19z"
        fill="#ffffff"
        fillOpacity="0.92"
      />
      <path
        d="M19.5 19v-2.5a4.5 4.5 0 0 1 9 0V19"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Gloss />
    </svg>
  );
}

/**
 * Live Stats, as the looping bar-chart animation.
 *
 * This was a flat SVG of three static green bars on a dark plate. The delivered
 * clip does the same job and builds itself, which is the point of a *live*
 * stats icon — the one tile on the dock whose numbers actually move.
 *
 * `scripts/build-icon-alpha.mjs` keys the clip's near-white card out to
 * transparency and keeps the artwork's own colours, the same treatment the
 * Vault locker gets. That leaves a mark with transparent corners, so the tile
 * is declared `bare` on the dock and carries no plate — see `DockItemData.bare`.
 * Without that it would sit inside a visible rounded outline drawn around
 * nothing, which is exactly the box the Contact tile also lost.
 *
 * Drawn a touch larger than `INSET_ART`: the chart's mass sits low and left,
 * so at the shared inset it optically read a size smaller than its neighbours.
 * The drop shadow is what separates its navy outlines from the frosted glass —
 * on dark chrome, navy on near-black has almost no edge of its own.
 *
 * A plain `<img>`, not `next/image`: the optimizer re-encodes animated WebP
 * into a still first frame, so the icon would simply stop moving.
 */
export function StatsTile() {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-[inherit]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/dotm/stats-icon.webp"
        alt=""
        width={160}
        height={160}
        aria-hidden="true"
        className="h-[92%] w-[92%] object-contain"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.65))" }}
      />
    </div>
  );
}

export function WelcomeTile() {
  return (
    <svg viewBox="0 0 48 48" className={TILE} aria-hidden="true">
      <defs>
        <linearGradient id="wl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a1418" />
          <stop offset="1" stopColor="#120507" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#wl-bg)" />
      <path
        d="M12 32c4-10 8-14 12-14s8 4 12 14"
        fill="none"
        stroke="#e11d2a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="18" r="3" fill="#f5f5f5" />
      <circle cx="12" cy="32" r="2.4" fill="#f5f5f5" fillOpacity="0.6" />
      <circle cx="36" cy="32" r="2.4" fill="#f5f5f5" fillOpacity="0.6" />
      <Gloss />
    </svg>
  );
}
