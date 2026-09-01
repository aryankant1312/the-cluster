import Image from "next/image";
import { Lock } from "lucide-react";
import dotmLogoImage from "../../../public/images/dev/dotm-logo.jpg";
import recycleBinIconImage from "../../../public/images/dev/recycle-bin-icon.png";
import myMusicIconImage from "../../../public/images/dev/my-music-icon.png";
import portfolioDesktopIconImage from "../../../public/images/dev/portfolio-icon-desktop.png";
import startTrayImage from "../../../public/images/dev/taskbar/start-icon.webp";
import homeTrayImage from "../../../public/images/dev/taskbar/home-icon.png";
import contactTrayImage from "../../../public/images/dev/taskbar/contact-icon.png";
import portfolioTrayImage from "../../../public/images/dev/taskbar/portfolio-folder-icon.png";
import recycleBinTrayImage from "../../../public/images/dev/taskbar/recycle-bin-icon-white.png";
import instagramTrayImage from "../../../public/images/dev/taskbar/instagram-icon.png";
import musicTrayImage from "../../../public/images/dev/taskbar/music-icon.jpg";

const TRAY_ICON_PROPS = { width: 16, height: 16, className: "w-4 h-4 object-contain" };

const LUCIDE_TRAY_PROPS = {
  size: 16,
  strokeWidth: 2,
  color: "#1a1a1a",
} as const;

export function MyMusicImageIcon() {
  return (
    <Image
      src={myMusicIconImage}
      alt=""
      width={40}
      height={40}
      className="w-full h-full object-cover"
    />
  );
}

/**
 * The Portfolio mark.
 *
 * Like My Music and Cluster Wall this sits bare on the wallpaper with no
 * win98 plate behind it, so it carries its own drop-shadow — a plate gives an
 * icon its edge for free, and without one a flat mark on a photograph has
 * nothing separating it from what is behind.
 */
export function PortfolioImageIcon() {
  return (
    <Image
      src={portfolioDesktopIconImage}
      alt=""
      width={40}
      height={40}
      className="w-full h-full object-contain"
      style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.6))" }}
    />
  );
}

/**
 * The Vault, as the looping locker animation.
 *
 * The source clip is a flat blue locker on a solid white card, which is why
 * the first cut of this sat in a white box on the wallpaper — the box was the
 * video, not a container around it. `scripts/build-icon-alpha.mjs` keys that
 * white out and re-encodes to an animated WebP with a real alpha channel, so
 * what ships is the locker and nothing else.
 *
 * ALPHA RATHER THAN A BLEND MODE. `mix-blend-mode: multiply` would also hide
 * white, but it hides it by multiplying against whatever is behind — and the
 * DEV wallpaper is a mid-blue (roughly rgb(18,71,156)), which would drag the
 * locker's navy outlines down into the wallpaper until the icon disappeared.
 * A keyed alpha channel is independent of the backdrop.
 *
 * A plain `<img>` rather than `next/image`: the optimizer re-encodes on the
 * fly and animated WebP does not survive that — it comes back as a still
 * first frame. `unoptimized` would opt out, but at that point `next/image` is
 * only adding a wrapper around the tag below.
 *
 * The drop-shadow is not decoration. With the plate gone the icon sits
 * directly on a photograph, and its lightest fills are close enough to the
 * wallpaper's blue to lose their edge without one.
 */
export function VaultIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/dev/vault-icon.webp"
      alt=""
      width={192}
      height={192}
      aria-hidden="true"
      className="pointer-events-none block h-full w-full object-contain"
      style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))" }}
    />
  );
}

/**
 * The tray-sized Vault mark, still the lock.
 *
 * A 16px video in a taskbar tile is unreadable — the clip's subject is gone
 * at that size — so the window tile keeps the glyph the desktop icon used to
 * carry.
 */
export function VaultTrayIcon() {
  return <Lock {...LUCIDE_TRAY_PROPS} />;
}

export function ClusterWallIcon() {
  return (
    <Image
      src={dotmLogoImage}
      alt=""
      width={64}
      height={64}
      className="w-full h-full object-cover"
    />
  );
}

/**
 * Shoot on Sight — a viewfinder over a pin.
 *
 * The crosshair says "sight" and the pin says "location", and the two together
 * are the whole name. Drawn at the same 34px and 1.8 stroke as `ShowsIcon`
 * beside it, so the column keeps one weight.
 */
export function ShootOnSightIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" width={34} height={34} aria-hidden="true">
      <g stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {/* The viewfinder's four corners, not a closed box: a full rectangle
            reads as a photo frame rather than as something being aimed. */}
        <path d="M5 12V7h5M30 7h5v5M35 28v5h-5M10 33H5v-5" />
        {/* The pin, centred in the sight. */}
        <path d="M20 30c4.2-5 6.3-8.6 6.3-11.4a6.3 6.3 0 1 0-12.6 0C13.7 21.4 15.8 25 20 30z" />
        <circle cx="20" cy="18.4" r="2.4" />
      </g>
    </svg>
  );
}

/**
 * Shows — the delivered microphone-and-LIVE mark, animated.
 *
 * WHAT THIS REPLACED. The same subject drawn here in SVG: a mic outline with
 * LIVE set under it in Arial, in flat white, which needed the black plate
 * behind it to be visible at all. This is the artwork, and it moves.
 *
 * A PLAIN `<img>`, NOT `next/image`. The optimizer re-encodes animated WebP
 * and hands back a still first frame, so the mark would simply stop moving —
 * the same trap already documented on the Vault icon and the DOTM login mark.
 *
 * `scripts/build-icon-alpha.mjs` keys the source GIF's white card out to
 * transparency and keeps the artwork's own colours, which is what lets the
 * desktop icon drop `iconBoxVariant="black"` and sit straight on the
 * wallpaper. The drop shadow gives it an edge against a bright sky.
 */
export function ShowsIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/dev/shows-icon.webp"
      alt=""
      width={160}
      height={160}
      aria-hidden="true"
      className="h-full w-full object-contain"
      style={{ filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.5))" }}
    />
  );
}

export function RecycleBinImageIcon() {
  return (
    <Image
      src={recycleBinIconImage}
      alt=""
      width={40}
      height={40}
      className="w-full h-full object-cover"
    />
  );
}

export function InstagramTrayIcon() {
  return <Image src={instagramTrayImage} alt="" width={20} height={20} className="w-5 h-5 object-contain" />;
}

export function YoutubeTrayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className="w-5 h-5" aria-hidden="true">
      <path
        d="M23.5 6.2c-.3-1.1-1.1-1.9-2.2-2.2C19.3 3.5 12 3.5 12 3.5s-7.3 0-9.3.5c-1.1.3-1.9 1.1-2.2 2.2C0 8.2 0 12 0 12s0 3.8.5 5.8c.3 1.1 1.1 1.9 2.2 2.2 2 .5 9.3.5 9.3.5s7.3 0 9.3-.5c1.1-.3 1.9-1.1 2.2-2.2.5-2 .5-5.8.5-5.8s0-3.8-.5-5.8z"
        fill="#FF0000"
      />
      <path d="M9.6 15.6V8.4L15.8 12l-6.2 3.6z" fill="#FFFFFF" />
    </svg>
  );
}

export function SpotifyTrayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} className="w-5 h-5" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#191414" />
      <circle cx="12" cy="12" r="8.5" fill="#1ED760" />
      <path
        d="M7.4 10c2.9-.8 6.6-.6 9.1.9"
        stroke="#191414"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7.8 12.8c2.4-.6 5.5-.5 7.6.8"
        stroke="#191414"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M8.2 15.4c2-.5 4.4-.4 6.1.6"
        stroke="#191414"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function MusicTrayIcon() {
  return (
    <Image
      src={musicTrayImage}
      alt=""
      width={20}
      height={20}
      className="w-5 h-5 object-cover rounded-sm"
    />
  );
}

export function StartTrayIcon() {
  return <Image src={startTrayImage} alt="" {...TRAY_ICON_PROPS} />;
}

/* ────────────────────────────────────────────────────────────────────────
   Tray glyphs for the surfaces that were previously reachable only from the
   Start menu. Drawn rather than imported so they share one stroke weight and
   one 20px box with the existing tray icons — a tray of mixed weights is
   what makes a taskbar look assembled from spare parts.
   ──────────────────────────────────────────────────────────────────────── */

const TRAY_SVG = "w-5 h-5";

/**
 * The quick-launch strip's icon size — Drops, Live Stats and Contact.
 *
 * One constant for all three, because they are one row and the row was not
 * uniform: two were 20px SVGs and Contact was a 16px raster, so the strip read
 * as three unrelated marks rather than as a set. 24px is a quarter up on the
 * larger pair, which is what the animated Stats mark needs to be legible at
 * all — its arrow and bars are fine strokes, and at 20px they silted up into a
 * smudge — and the other two come with it so the row stays even.
 *
 * `object-contain` matters for the raster marks: the artwork is not square to
 * the pixel, and `cover` would crop a hair off one edge of each.
 */
const QUICK_LAUNCH_PX = 24;
const QUICK_LAUNCH_ICON = "w-6 h-6 object-contain";
const TRAY_STROKE = {
  fill: "none",
  stroke: "#1a1a1a",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BookTrayIcon() {
  return (
    <svg viewBox="0 0 24 24" className={TRAY_SVG} aria-hidden="true">
      <g {...TRAY_STROKE}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </g>
      <circle cx="12" cy="15" r="2" fill="#b4001a" />
    </svg>
  );
}

/** Quick-launch strip — sized with its two neighbours, not with the tray. */
export function DropsTrayIcon() {
  return (
    <svg viewBox="0 0 24 24" className={QUICK_LAUNCH_ICON} aria-hidden="true">
      <g {...TRAY_STROKE}>
        <path d="M5 8h14l-1 12H6z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </g>
    </svg>
  );
}

/**
 * Live Stats, as the looping rising-arrow animation.
 *
 * This was three static bars drawn in SVG. The delivered clip draws the same
 * chart and then throws an arrow up over it, which is the difference between an
 * icon for "statistics" and an icon for *live* statistics — the one launcher on
 * this bar whose numbers actually move.
 *
 * `scripts/build-icon-alpha.mjs` keys the clip's near-white card out to
 * transparency and flattens everything left to solid black. The artwork ships
 * in two inks — a black arrow over teal bars — and keeping both was the bug:
 * on a #c0c0c0 bar at 24px the teal read as barely-there scratches beside a
 * solid black arrow, so half the mark went missing and what remained looked
 * like a different icon altogether. One ink, and the whole thing is legible.
 *
 * Black rather than white, unlike the DOTM contact mark: a Win98 bar is mid
 * grey, and white line art would disappear there just as thoroughly.
 *
 * A plain `<img>`, not `next/image`: the optimizer re-encodes animated WebP into
 * a still first frame, so the icon would simply stop moving.
 */
export function StatsTrayIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/dev/stats-icon.webp"
      alt=""
      width={QUICK_LAUNCH_PX}
      height={QUICK_LAUNCH_PX}
      aria-hidden="true"
      className={QUICK_LAUNCH_ICON}
    />
  );
}

export function ShowsTrayIcon() {
  return (
    <svg viewBox="0 0 24 24" className={TRAY_SVG} aria-hidden="true">
      <g {...TRAY_STROKE}>
        <rect x="9" y="2.5" width="6" height="9" rx="3" />
        <path d="M5.5 10v1.5a6.5 6.5 0 0 0 13 0V10M12 18v3M9 21h6" />
      </g>
    </svg>
  );
}

export function HomeTrayIcon() {
  return <Image src={homeTrayImage} alt="" {...TRAY_ICON_PROPS} />;
}

export function PortfolioTrayIcon() {
  return <Image src={portfolioTrayImage} alt="" {...TRAY_ICON_PROPS} />;
}

/** Quick-launch strip — sized with its two neighbours, not with the tray. */
export function ContactTrayIcon() {
  return (
    <Image
      src={contactTrayImage}
      alt=""
      width={QUICK_LAUNCH_PX}
      height={QUICK_LAUNCH_PX}
      className={QUICK_LAUNCH_ICON}
    />
  );
}

export function RecycleBinTrayIcon() {
  return <Image src={recycleBinTrayImage} alt="" {...TRAY_ICON_PROPS} />;
}
