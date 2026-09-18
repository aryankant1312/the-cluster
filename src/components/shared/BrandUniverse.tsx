"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { brandCases, type BrandCase } from "@/content/brand-cases";
import { pressKit } from "@/content/press-kit";
import { cn } from "@/lib/utils";

/**
 * The brand conveyor belt: the marks, running past, over the artwork.
 *
 * Hovering or keyboard focus pauses the belt. Each mark opens a folder-backed
 * campaign viewer whose mosaic is derived from the media currently present,
 * so adding an asset requires only a file copy and reload.
 */

// Duplicated once back-to-back so the CSS scroll loop is seamless.
const BELT = [...brandCases, ...brandCases];

/**
 * The one press-kit download, resolved once at module load.
 *
 * The press kit used to be a window of its own on both desktops, reached from
 * its own icon. Everyone who opened it wanted the same thing — the PDF — and
 * the audience for it is the same audience already looking at the brand work.
 * So it lives here now, as one button, next to the proof it accompanies.
 */
const PRESS_KIT_PDF = pressKit.downloads.find((d) => d.id === "full" && d.available);

/**
 * WHERE THE BELT SITS, as fractions of the window — now in both personas.
 *
 * DEV used to centre its belt in whatever height was left under the heading.
 * That was right while its ground was a flat colour and wrong the moment it
 * became a photograph: a strip of logos across the middle of a picture covers
 * the picture. Both sides now run the belt low, which is where the DOTM window
 * always had it.
 *
 * The DOTM window's ground is a photograph of a round table, and the belt runs
 * *below* its surface on purpose — the marks then read as things standing on
 * the floor of that room rather than as a strip floating over the picture.
 *
 * 0.71 is measured, not guessed. The backdrop is `object-cover` at `50% 50%`,
 * so the crop moves with the window — and the window's own content box is the
 * viewport minus two *absolute* amounts, the dock reserve and the titlebar,
 * which is why the rim does not land at one fixed fraction:
 *
 *     image is 1280×964; the table's front rim is row 600, 62.2% down the frame
 *     1920×1080 viewport → content 1882×939 → rim at 68.5%
 *     1280×720  viewport → content 1254×579 → rim at 70.0%
 *
 * So the belt starts at 71%, which is clear of the rim at both ends of that
 * range rather than tuned to one of them, and runs down to 93% — where the
 * window's own bottom padding begins.
 */
const BELT_TOP = 0.71;
const BELT_HEIGHT = 0.22;

interface BrandMediaAsset {
  name: string;
  src: string;
  type: "image" | "video";
}

/**
 * THE DEV BACKDROP NO LONGER ZOOMS OUT, AND THE FILE CHANGE IS WHY.
 *
 * `DEV_BACKDROP_ZOOM = 0.8` used to live here, with a blurred full-bleed copy
 * underneath to fill what the zoom-out exposed. Both existed to solve one
 * problem: a 1920x1136 photograph (aspect 1.69) inside a 98vw window (aspect
 * 2.41) is cropped by about 161px at the top and 161px at the foot, taking
 * the tent and the subject's legs with them.
 *
 * `portfolio-backdrop-2.jpg` is 5740x3027 - aspect 1.896 - and the window is
 * now sized to that same ratio in `(persona)/dev/page.tsx`. Cover therefore
 * crops almost nothing, the picture reaches all four edges by itself, and a
 * zoom-out would only reintroduce the bands the old value was paying for. The
 * surround went with it: at zoom 1 there is nothing for it to fill, so it was
 * a second full-size decode of a layer that could never be seen.
 *
 * If the window's aspect and the file's ever drift apart again, this is the
 * pair to bring back rather than a taller crop.
 */

export function BrandUniverse() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const [selected, setSelected] = useState<BrandCase | null>(null);
  const [assets, setAssets] = useState<BrandMediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [beltHovered, setBeltHovered] = useState(false);
  const [beltFocused, setBeltFocused] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const openCampaign = async (brand: BrandCase) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSelected(brand);
    setAssets([]);
    setLoading(true);

    try {
      const response = await fetch(`/api/brand-media/${brand.id}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Brand media request failed: ${response.status}`);
      const body = (await response.json()) as { assets?: BrandMediaAsset[] };
      setAssets(Array.isArray(body.assets) ? body.assets : []);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setAssets([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const beltPaused = beltHovered || beltFocused || selected !== null;

  return (
    <div
      className={cn(
        // The two grounds pull in opposite directions, so the type does too:
        // DOTM's photograph is a near-black room and takes white, DEV's is a
        // pale sheet and takes black. A shared colour would have failed on one
        // of them.
        "relative h-full w-full overflow-hidden",
        isDotm ? "bg-[#050505] text-white" : "bg-[#e9e9e7] text-black",
      )}
    >
      {/* BOTH GROUNDS ARE A PHOTOGRAPH — DOTM's round table, DEV's Paranoid
          artwork. Three layers each, in order: the picture, a grade that opens
          a clear band across the middle of it, and (on DOTM) the persona's red
          wash on top.

          The grade is heavy at the top and heavy at the foot and almost absent
          between: the heading needs something to sit on, the belt needs
          something to sit on, and the picture between them is the part worth
          actually seeing. A flat scrim strong enough for the type would have
          flattened the image out with it.

          BOTH SIDES ARE A PHOTOGRAPH NOW. DEV used to be a flat pale-blue
          window; it takes the Paranoid artwork the way DOTM takes the table
          shot, with a grade over it running in that persona's own direction —
          DOTM towards black, DEV towards its window blue — so that the heading
          and the belt each keep something to sit on. */}
      <Image
        /*
          `portfolio-backdrop.jpg`, NOT `portfolio-bg.jpg`, and the rename is
          the fix rather than tidying.

          DEV's backdrop was replaced by overwriting `portfolio-bg.jpg` in
          place. The path did not change, so Next's image optimizer went on
          serving the variant it had already cached for that URL — the previous
          artwork — and the window kept showing the old picture. It was easy to
          miss because both are snow scenes: the give-away was `naturalWidth`
          reporting 1411×793 (16:9) for a file that is 1920×1136 on disk.

          A new filename is a new cache key, so nothing stale can shadow it.
          Overwrite this file and the same trap returns; add a new name
          instead, or clear `.next/cache/images`.
        */
        src={
          isDotm
            ? "/images/dotm/portfolio-bg-blue-coat.jpg"
            : "/images/dev/portfolio-backdrop-2.jpg"
        }
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="98vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDotm
            ? "linear-gradient(to bottom, rgba(5,5,5,0.90) 0%, rgba(5,5,5,0.52) 20%, rgba(5,5,5,0.16) 40%, rgba(5,5,5,0.16) 56%, rgba(5,5,5,0.66) 74%, rgba(5,5,5,0.92) 100%)"
            : // BARELY THERE, because the DEV artwork is light. Measured on the
              // file: top luma 189, middle 203, foot 190 — a pale sheet, where
              // the DOTM shot is a near-black room. Anything like DOTM's grade
              // turns it grey and throws the picture away, which is what "do
              // not darken the bg too much" is about.
              //
              // So this is a white veil rather than a dark one: enough at the
              // very top and the very foot to keep dark type off a busy patch,
              // and nothing at all across the middle.
              "linear-gradient(to bottom, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.16) 18%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.20) 82%, rgba(255,255,255,0.38) 100%)",
        }}
      />
      {isDotm && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,51,0.14)_0%,rgba(0,0,0,0)_60%)]"
        />
      )}

      <div className="relative z-10 flex h-full flex-col gap-6 px-6 pt-8 pb-10">
        {/* `relative` so the DOTM press-kit button can be parked against the
            left edge of this block while the wordmark stays optically centred
            in the window. Centring the heading inside a flex row with the
            button as a sibling would have centred it in the space *left over*
            by the button, which is not the middle of anything. */}
        <div className={cn("relative shrink-0", isDotm ? "text-right" : "text-center")}>
          {isDotm ? (
            <>
              {/*
                Set in the decorative display face rather than the chrome face
                the rest of the window uses. The belt below is a run of flat
                brand marks in a straight line; competing with it on the same
                typeface left the heading reading as one more label. A
                different face, a bigger size and pure white against the
                surrounding 45% grey give it somewhere to be loud, and "bled"
                keeps the accent to itself.
              */}
              <p
                aria-label="The brands I've bled for"
                className="ml-auto font-sans text-[clamp(1.65rem,3.4vw,3.6rem)] font-black uppercase leading-[0.84] tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.85)]"
              >
                <span aria-hidden="true" className="block">THE BRANDS</span>
                <span aria-hidden="true" className="block">I&apos;VE <span className="text-[#ff2244]">BLED</span></span>
                <span aria-hidden="true" className="block">FOR</span>
              </p>
              <div className="ml-auto mt-3.5 h-[3px] w-28 bg-[#ff2244]" />
            </>
          ) : (
            <p className="font-chrome text-xl tracking-wide text-black [text-shadow:0_1px_10px_rgba(255,255,255,0.9)] sm:text-2xl">
              The Brands I have worked with...
            </p>
          )}
          {/* The belt itself carries the affordance on hover/focus, so a second
              instruction line would compete with the campaign viewer. */}

          {/* Same line, far left, in both personas. The download used to sit
              centred under DEV's heading — a second piece of centred type
              directly below the first, which read as a subtitle rather than as
              the one action on the screen. Pinning it left in both makes the
              header one shape: an action at the edge, a wordmark in the
              middle. */}
          <PressKitButton
            isDotm={isDotm}
            className="absolute left-0 top-1/2 mt-0 -translate-y-1/2"
          />
        </div>

        <AnimatePresence mode="wait">
          {selected && (
            <CampaignViewer
              key={selected.id}
              brand={selected}
              assets={assets}
              loading={loading}
              isDotm={isDotm}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>

        {/* THE BELT.
            DEV centres it in whatever height is left under the heading. DOTM
            pins it under the table line in the photograph behind — see
            `DOTM_BELT_TOP` for where that line actually falls and why the
            figure is the one it is. Absolute rather than in the flow, because a
            flow position depends on how tall the heading above it happens to
            render, and the line this has to clear is a feature of the picture,
            not of the type. */}
        <div
          className="absolute inset-x-0 px-6"
          style={{
            top: `${BELT_TOP * 100}%`,
            height: `${BELT_HEIGHT * 100}%`,
          }}
        >
          <div
            className="h-full w-full overflow-hidden"
            onMouseEnter={() => setBeltHovered(true)}
            onMouseLeave={() => setBeltHovered(false)}
            onFocusCapture={() => setBeltFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setBeltFocused(false);
            }}
          >
            <div
              className="portfolio-belt-track flex h-full items-center gap-9"
              style={{ animationPlayState: beltPaused ? "paused" : "running" }}
            >
              {/* Repeated buttons keep the seamless visual loop, while every
                  copy opens the same campaign by stable brand id. */}
              {BELT.map((brand, i) => (
                <button
                  type="button"
                  key={`${brand.id}-${i}`}
                  onClick={() => void openCampaign(brand)}
                  aria-label={`Open ${brand.name}: ${brand.campaign}`}
                  // NO EDGE, AND ONE COLOUR. The tiles carried a hairline ring
                  // on DOTM and a bevelled Win98 border on DEV, plus each
                  // brand's own `bg` — so the belt read as a row of framed
                  // swatches in eight different colours rather than as a run
                  // of marks. Flat black under every one of them, with nothing
                  // drawn around it, lets the logos be the only thing with a
                  // shape.
                  className="group/brand relative aspect-[3/2] h-full shrink-0 cursor-pointer overflow-hidden bg-black text-left outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#ff2244] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {/*
                    A soft wash from the tile's own colour, so a card whose
                    mark has been keyed clear of its plate still has some
                    depth instead of reading as a flat rectangle of paint.
                    Behind the mark, never over it.
                  */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background:
                        "radial-gradient(120% 90% at 50% 40%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%)",
                    }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full bg-gradient-to-t from-black/95 to-transparent px-4 pb-3 pt-10 font-chrome text-[10px] uppercase tracking-[0.22em] text-white transition-transform duration-300 group-hover/brand:translate-y-0 group-focus-visible/brand:translate-y-0">
                    View campaign
                  </span>
                  {/*
                    Sized by `fit` rather than by a fixed inset: the marks run
                    from a 1:1 disc to a 5.6:1 hairline wordmark, and a single
                    inset sizes those by bounding box, not by how heavy they
                    actually look.
                  */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: `${brand.fit * 100}%`, height: `${brand.fit * 100}%` }}
                  >
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      fill
                      className="object-contain"
                      sizes="360px"
                      quality={95}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function CampaignViewer({
  brand,
  assets,
  loading,
  isDotm,
  onClose,
}: {
  brand: BrandCase;
  assets: BrandMediaAsset[];
  loading: boolean;
  isDotm: boolean;
  onClose: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ type: "spring", stiffness: 330, damping: 28 }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${brand.name} campaign media`}
      className={cn(
        "absolute z-20 flex min-h-0 flex-col overflow-hidden border border-white/20 text-white",
        "shadow-[0_28px_80px_-22px_rgba(0,0,0,0.88),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl",
        isDotm ? "rounded-[24px]" : "rounded-[12px]",
      )}
      style={{
        top: isDotm ? "9%" : "11%",
        left: 0,
        right: 0,
        width: isDotm ? "54%" : "62%",
        maxWidth: isDotm ? "1040px" : "820px",
        height: isDotm ? "58%" : "56%",
        marginLeft: "auto",
        marginRight: "auto",
        background:
          "radial-gradient(circle at 12% 0%, rgba(255,34,68,0.24), transparent 40%), linear-gradient(145deg, rgba(24,7,12,0.66), rgba(8,8,10,0.56) 52%, rgba(36,6,12,0.62))",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "linear-gradient(to bottom, black, transparent 72%)",
        }}
      />

      <header className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-chrome text-[9px] uppercase tracking-[0.34em] text-[#ff6a80] sm:text-[10px]">
            {brand.name}
          </p>
          <h2 className="truncate font-sans text-xl font-black uppercase leading-none tracking-[-0.03em] text-white sm:text-2xl lg:text-3xl">
            {brand.campaign}
          </h2>
        </div>
        <CommentsButton brand={brand} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close campaign"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ff6378] bg-[#d90f2f] text-white shadow-[0_6px_20px_-8px_rgba(255,34,68,0.95)] transition hover:scale-105 hover:bg-[#ff2244] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg
            viewBox="0 0 20 20"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4l12 12M16 4 4 16" />
          </svg>
        </button>
      </header>

      <div className="relative z-10 min-h-0 flex-1 p-3 sm:p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#ff2244]" />
            <span className="sr-only">Loading campaign media</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center border border-dashed border-white/20 bg-black/20 px-6 text-center">
            <p className="font-headline text-lg uppercase tracking-[0.16em] text-white">Media ready</p>
            <p className="mt-2 max-w-lg font-body text-xs leading-relaxed text-white/55 sm:text-sm">
              Add images or looping videos to
              <span className="mx-1 font-chrome text-[#ff6a80]">public/brand-campaigns/{brand.id}</span>
              and reload.
            </p>
          </div>
        ) : (
          <MediaMosaic assets={assets} />
        )}
      </div>
    </motion.section>
  );
}

function CommentsButton({ brand }: { brand: BrandCase }) {
  const classes =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 font-chrome text-[9px] uppercase tracking-[0.17em] transition sm:text-[10px]";

  if (!brand.socialUrl) {
    return (
      <button
        type="button"
        disabled
        aria-label="Check comments link pending"
        className={cn(classes, "cursor-not-allowed border-white/10 bg-white/5 text-white/35")}
      >
        Check comments <ExternalArrow />
      </button>
    );
  }

  return (
    <a
      href={brand.socialUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        classes,
        "border-[#ff2244]/70 bg-[#ff2244] text-white shadow-[0_8px_24px_-12px_rgba(255,34,68,0.9)] hover:bg-white hover:text-black",
      )}
    >
      Check comments <ExternalArrow />
    </a>
  );
}

function MediaMosaic({ assets }: { assets: BrandMediaAsset[] }) {
  const count = assets.length;
  const gridClass =
    count === 1
      ? "grid-cols-1 grid-rows-1"
      : count === 2
        ? "grid-cols-2 grid-rows-1"
        : count === 3
          ? "grid-cols-2 grid-rows-2"
          : count === 4
            ? "grid-cols-2 grid-rows-2"
            : "grid-cols-3 grid-rows-2 overflow-y-auto";

  return (
    <div className={cn("grid h-full min-h-0 gap-2", gridClass)}>
      {assets.map((asset, index) => {
        const feature = (count === 3 || count >= 5) && index === 0;
        return (
          <figure
            key={asset.src}
            className={cn(
              "group/media relative min-h-0 overflow-hidden border border-white/10 bg-black/25",
              feature && "row-span-2",
              count >= 5 && feature && "col-span-1",
            )}
          >
            {asset.type === "video" ? (
              <CampaignVideo asset={asset} />
            ) : (
              <Image
                src={asset.src}
                alt={asset.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}
                fill
                unoptimized
                sizes="(min-width: 1024px) 48vw, 80vw"
                className="object-cover transition-transform duration-700 group-hover/media:scale-[1.025]"
              />
            )}
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-20 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 font-chrome text-[8px] uppercase tracking-[0.16em] text-white/55 opacity-0 transition-opacity group-hover/media:opacity-100">
              {asset.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function CampaignVideo({ asset }: { asset: BrandMediaAsset }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.7);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const setVideoVolume = (next: number) => {
    setVolume(next);
    setMuted(next === 0);
    if (videoRef.current) {
      videoRef.current.volume = next;
      videoRef.current.muted = next === 0;
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={muted}
        playsInline
        preload="metadata"
        className="mx-auto block h-full w-auto max-w-full object-contain"
        aria-label={asset.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}
      >
        <source src={asset.src} />
      </video>
      <div className="absolute bottom-2 right-2 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-2.5 py-1.5 opacity-80 backdrop-blur-md transition-opacity hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="flex h-5 w-5 items-center justify-center text-white"
        >
          {muted ? <MutedGlyph /> : <SpeakerGlyph />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={muted ? 0 : volume}
          onChange={(event) => setVideoVolume(Number(event.target.value))}
          aria-label="Video volume"
          className="h-1 w-16 cursor-pointer accent-[#ff2244] sm:w-20"
        />
      </div>
    </>
  );
}

function ExternalArrow() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 3h7v7M13 3 5 11" />
      <path d="M11 9v4H3V5h4" />
    </svg>
  );
}

function SpeakerGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 8h3l4-3v10l-4-3H3z" />
      <path d="M13 7c1.6 1.6 1.6 4.4 0 6M15.5 4.5c3 3 3 8 0 11" />
    </svg>
  );
}

function MutedGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 8h3l4-3v10l-4-3H3zM13 8l4 4M17 8l-4 4" />
    </svg>
  );
}

/**
 * Downloads the EPK. A real `<a download>` rather than a button wired to
 * script: it works on middle-click and "save link as", and it needs no
 * JavaScript to run at all.
 *
 * Renders nothing when the file is absent from `public/`, which is what
 * `available: false` in `press-kit.ts` means — an offer to download a 404 is
 * worse than no offer.
 */
function PressKitButton({ isDotm, className }: { isDotm: boolean; className?: string }) {
  if (!PRESS_KIT_PDF) return null;

  return (
    <a
      href={PRESS_KIT_PDF.href}
      download={PRESS_KIT_PDF.filename}
      className={cn(
        "mt-4 inline-flex items-center gap-2.5 px-4 py-2 transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isDotm
          ? "rounded-full bg-[#ff0033] text-white hover:bg-white hover:text-black focus-visible:ring-white focus-visible:ring-offset-[#050505]"
          : // THE BLUE TILE ALONE, with no bevel around it. It kept the Win98
            // border for a while, which on a light photograph read as a
            // chiselled grey box that happened to contain a blue button — two
            // frames for one control. What is left is the navy-to-blue face
            // and white type, sitting straight on the artwork; the press state
            // is the gradient shifting rather than an edge being pushed in.
            "rounded-[3px] bg-gradient-to-b from-[#1f5fa9] to-[#0a2f5c] text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] hover:from-[#2b74c6] hover:to-[#14477f] active:translate-y-px focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-white",
        // Last, so a caller repositioning the button can also cancel the `mt-4`
        // that only makes sense when it is stacked under the heading.
        className,
      )}
    >
      <DownloadGlyph />
      <span className="font-chrome text-[11px] uppercase tracking-[0.2em]">
        Press Kit
      </span>
      <span className="font-body text-[10px] tracking-wide text-white/70">PDF</span>
    </a>
  );
}

function DownloadGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 20h15" />
    </svg>
  );
}


export default BrandUniverse;
