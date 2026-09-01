"use client";

import Image from "next/image";
import { usePersona } from "@/components/providers/PersonaProvider";
import { brandCases } from "@/content/brand-cases";
import { pressKit } from "@/content/press-kit";
import { cn } from "@/lib/utils";

/**
 * The brand conveyor belt: the marks, running past, over the artwork.
 *
 * IT SHOWS AND DOES NOT ASK. Each logo used to be a button opening a mini case
 * study, with a "CASE STUDY" plate rising on hover to say so. All of that is
 * gone — the overlay, the plate, the click, the focus ring, the tab stop. The
 * belt is the message, and the only action left on the screen is the press-kit
 * download.
 *
 * `content/brand-cases.ts` still carries the case-study copy for each brand.
 * It is unread now and deliberately not deleted: it is written, it costs
 * nothing to keep, and reinstating the overlay would otherwise mean writing it
 * all again.
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
        src={isDotm ? "/images/dotm/portfolio-bg.jpg" : "/images/dev/portfolio-backdrop-2.jpg"}
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
        <div className="relative shrink-0 text-center">
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
              <p className="font-headline text-[clamp(1.75rem,3.6vw,3.15rem)] font-bold leading-[1.05] tracking-[0.01em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.85)]">
                The Brands I&apos;ve{" "}
                <span className="text-[#ff0033] [text-shadow:0_0_26px_rgba(255,0,51,0.6)]">
                  bled
                </span>{" "}
                for
              </p>
              <div className="mx-auto mt-3.5 h-[2px] w-20 bg-gradient-to-r from-transparent via-[#ff0033] to-transparent" />
            </>
          ) : (
            <p className="font-chrome text-xl tracking-wide text-black [text-shadow:0_1px_10px_rgba(255,255,255,0.9)] sm:text-2xl">
              The Brands I have worked with...
            </p>
          )}
          {/* The "Select a brand to open the case study" line is gone, and so
              is the thing it described: the tiles no longer open anything, so
              an instruction to click them would have been a lie. */}

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
          <div className="h-full w-full overflow-hidden">
            <div className="portfolio-belt-track flex h-full items-center gap-9">
              {/*
                A LIST OF PICTURES, NOT A ROW OF BUTTONS.

                Each of these was a `<button>` that opened a case-study
                overlay, with a "CASE STUDY" plate rising on hover to advertise
                it. Both are gone, along with the overlay itself: the belt is
                the whole of what this window says, and the only action on the
                screen is the press-kit download.

                So they are plain elements now — no `onClick`, no `tabIndex`,
                no focus ring, nothing in the tab order. A div that looks
                pressable and is not would be worse than the button was; what
                is left does not look pressable, because nothing about it
                responds. `alt` on each mark still names the brand, which is
                the only thing a reader needed from them.
              */}
              {BELT.map((brand, i) => (
                <div
                  key={`${brand.id}-${i}`}
                  // NO EDGE, AND ONE COLOUR. The tiles carried a hairline ring
                  // on DOTM and a bevelled Win98 border on DEV, plus each
                  // brand's own `bg` — so the belt read as a row of framed
                  // swatches in eight different colours rather than as a run
                  // of marks. Flat black under every one of them, with nothing
                  // drawn around it, lets the logos be the only thing with a
                  // shape.
                  className="relative aspect-[3/2] h-full shrink-0 overflow-hidden bg-black"
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
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
