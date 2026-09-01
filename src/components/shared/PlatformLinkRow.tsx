"use client";

import Image from "next/image";
import { platformLinksFor } from "@/content/platform-links";
import { cn } from "@/lib/utils";

import appleMusicMark from "../../../public/images/brands/apple-music.png";
import jioSaavnMark from "../../../public/images/brands/jiosaavn.png";
import youTubeMusicMark from "../../../public/images/brands/youtube-music.png";

/**
 * WHERE ELSE TO HEAR THIS — five marks in a row, under the record.
 *
 * Spotify is first, because it is the one whose id the site actually holds —
 * `tracks.ts` resolves artwork and durations from it — but it is not the only
 * way out.
 *
 * SPOTIFY IS DRAWN, THE REST ARE FILES. Not an inconsistency worth removing:
 * Spotify's mark is three arcs on a disc, a dozen lines of SVG that scale to
 * any size, while the others are supplied artwork. All five are boxed at the
 * same 38px on the same baseline, so the row reads as one set.
 *
 * EVERY MARK IS EITHER A REAL LINK OR VISIBLY DEAD. `platformLinksFor` used to
 * fall back to a search on each platform so that no icon was ever inert; that
 * is gone, and the reasoning sits on `platformLinksFor` itself. What it means
 * here is that the greyed placeholder — which already existed for the two
 * songs Spotify never pressed — is now the shared answer for any link not yet
 * filled in. The row keeps its geometry either way, so the marks never shuffle
 * sideways from track to track.
 */

const BOX = 38;

export function PlatformLinkRow({
  trackId,
  title,
  spotifyId,
  isDotm,
  className,
}: {
  trackId: string;
  title: string;
  /** Null for anything unreleased on Spotify. */
  spotifyId: string | null;
  isDotm: boolean;
  className?: string;
}) {
  const links = platformLinksFor(trackId);

  // The id on the record is the usual route; the table's `spotify` field is an
  // override for songs that have a page but no pressing id.
  const spotifyHref =
    links.spotify ?? (spotifyId ? `https://open.spotify.com/track/${spotifyId}` : null);

  return (
    /* A list, because that is what five sibling destinations are. A screen
       reader announces "list, 5 items", so the visitor knows how many ways out
       there are before hearing them all. */
    <ul className={cn("flex list-none items-center justify-center gap-2.5 p-0", className)}>
      <li>
        <Mark
          href={spotifyHref}
          label={`Open ${title} on Spotify`}
          disabledLabel="Not on Spotify yet"
          isDotm={isDotm}
        >
          <SpotifyMark size={BOX} />
        </Mark>
      </li>
      <li>
        <Mark
          href={links.appleMusic}
          label={`Open ${title} on Apple Music`}
          disabledLabel="Not linked on Apple Music yet"
          isDotm={isDotm}
        >
          <Image src={appleMusicMark} alt="" width={BOX} height={BOX} className="rounded-[9px]" />
        </Mark>
      </li>
      <li>
        <Mark
          href={links.jioSaavn}
          label={`Open ${title} on JioSaavn`}
          disabledLabel="Not linked on JioSaavn yet"
          isDotm={isDotm}
        >
          {/*
            BLACK IN DEV, ITS OWN TEAL IN DOTM.

            The supplied mark is a flat teal glyph on transparency — measured
            at rgb(31,205,177) — and DEV's window furniture is the tan
            `--_surface`, #d8cdb8. Two mid-tone colours of similar lightness
            laid over one another stop reading as a shape; on DOTM's near-black
            the same teal is bright and separates cleanly.

            `brightness-0` collapses every channel to black and leaves the
            alpha untouched, so what is left is the same silhouette in the
            colour the rest of that window's chrome is already drawn in.
            Filtering beats shipping a second file: one asset, and the two can
            never drift apart.
          */}
          <Image
            src={jioSaavnMark}
            alt=""
            width={BOX}
            height={BOX}
            className={cn(!isDotm && "brightness-0")}
          />
        </Mark>
      </li>
      <li>
        <Mark
          href={links.youtubeMusic}
          label={`Open ${title} on YouTube Music`}
          disabledLabel="Not linked on YouTube Music yet"
          isDotm={isDotm}
        >
          <Image src={youTubeMusicMark} alt="" width={BOX} height={BOX} />
        </Mark>
      </li>
      <li>
        <Mark
          href={links.amazonMusic}
          label={`Open ${title} on Amazon Music`}
          disabledLabel="Not linked on Amazon Music yet"
          isDotm={isDotm}
        >
          <AmazonMusicMark size={BOX} />
        </Mark>
      </li>
    </ul>
  );
}

/**
 * One mark, as a link — or as an inert placeholder when there is nowhere to go.
 *
 * The placeholder holds the row's geometry so the others do not shuffle
 * sideways on a track with a gap, and carries a title so hovering it explains
 * itself rather than looking broken.
 */
function Mark({
  href,
  label,
  disabledLabel,
  isDotm,
  children,
}: {
  href: string | null;
  label: string;
  disabledLabel?: string;
  isDotm: boolean;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <span
        title={disabledLabel}
        aria-label={disabledLabel}
        className="block opacity-25 grayscale"
        style={{ width: BOX, height: BOX }}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        "block rounded-full transition-transform duration-150 hover:scale-110",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isDotm
          ? "focus-visible:ring-white focus-visible:ring-offset-black"
          : "focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-transparent",
      )}
      style={{ width: BOX, height: BOX }}
    >
      {children}
    </a>
  );
}

/**
 * Amazon Music — the delivered artwork.
 *
 * A PLAIN `<img>` RATHER THAN `next/image`. The optimizer refuses SVG unless
 * `dangerouslyAllowSVG` is switched on in `next.config.ts`, and turning that on
 * globally to render one 3KB brand mark would widen the surface for every
 * remote image the site ever loads. Served straight out of `public/`, it costs
 * one request and needs no configuration at all.
 */
function AmazonMusicMark({ size }: { size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/brands/amazon-music.svg"
      alt=""
      width={size}
      height={size}
      className="rounded-[9px]"
    />
  );
}

/** Spotify's disc, drawn — the same mark the dock and the tray already use. */
function SpotifyMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="plr-sp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1ed760" />
          <stop offset="1" stopColor="#12a150" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#plr-sp-bg)" />
      <g stroke="#0a1f12" strokeLinecap="round" fill="none">
        <path d="M14 19c6-1.8 13.5-1.2 18.5 1.8" strokeWidth="2.6" />
        <path d="M15 25c5-1.4 11.5-1 15.5 1.6" strokeWidth="2.3" />
        <path d="M16 30.5c4-1.1 9-0.8 12.5 1.3" strokeWidth="2" />
      </g>
    </svg>
  );
}
