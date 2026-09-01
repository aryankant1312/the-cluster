"use client";

import { useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { ClusterWallGrid } from "@/components/shared/ClusterWallGrid";
import { ClusterWallFeed } from "@/components/shared/ClusterWallFeed";
import { cn } from "@/lib/utils";

/**
 * THE CLUSTER WALL — two things behind one window.
 *
 * The wall itself is the gif grid, and it is what opens: a full-bleed field of
 * moving images with nothing in front of it. The fan feed — where people post
 * a line or a link — is one press away, top right.
 *
 * WHY THE FEED DID NOT SIMPLY GO. It is a working submission surface with an
 * API, a table and a report control behind it, and the window now leading with
 * something else is not a reason to throw that away. It is a reason for it to
 * stop being the first thing anybody sees.
 *
 * ONE CONTROL, NOT A TAB STRIP. A row of tabs across the top would put a
 * horizontal band of chrome over the one surface whose entire idea is that the
 * images run edge to edge. A single key in the corner costs forty pixels
 * square and says the same thing.
 *
 * THE CONTROL SITS OVER THE CONTENT, NOT ABOVE IT. It floats at the top-right
 * of the surface, inside the window's own frame — the titlebar belongs to
 * `DevWindow` / `DotmWindow` and is shared with eleven other windows, and
 * threading a per-window control through it would mean every one of them
 * growing a prop it has no use for.
 */

type Pane = "wall" | "feed";

export function ClusterWallWindow() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const [pane, setPane] = useState<Pane>("wall");

  const showingWall = pane === "wall";

  return (
    <div className="relative h-full w-full bg-black">
      {showingWall ? <ClusterWallGrid isDotm={isDotm} /> : <ClusterWallFeed />}

      {/*
        The key, top right.

        `z-20` clears the grid's tiles and the feed's scroll container both. It
        is a real button rather than an icon with a click handler, so it is
        reachable by keyboard and announces its state — `aria-pressed` says
        which of the two is on screen, which a picture of a speech bubble
        cannot.
      */}
      <button
        type="button"
        onClick={() => setPane(showingWall ? "feed" : "wall")}
        aria-pressed={!showingWall}
        title={showingWall ? "Open the feed" : "Back to the wall"}
        aria-label={showingWall ? "Open the feed" : "Back to the wall"}
        /*
          NO PLATE UNDER IT. This was a frosted disc in DOTM and a bevelled
          Win98 tile in DEV; both are gone and the mark sits on the wall
          itself, which is what makes the inset from the right edge necessary —
          without the chrome that used to hold it off, the glyph was almost
          touching it.

          BOTTOM RIGHT RATHER THAN TOP RIGHT. The top of the wall is where the
          first row of tiles lands, so the key sat over artwork from the moment
          the grid drew. The bottom-right corner is the one place a scrolling
          masonry reliably has something behind it and nothing important in it,
          and it puts the pane switch on the same side as every tile's speaker,
          so the controls on this surface all live in one corner.

          The mark is 68px now, twice what it was, in an 80px target. It is the
          only way between the two halves of this window and at 34px it read as
          a decoration.
        */
        className={cn(
          "absolute bottom-6 right-7 z-20 grid h-20 w-20 place-items-center rounded-full",
          "transition-transform hover:scale-110 active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isDotm
            ? "focus-visible:ring-[#ff2244] focus-visible:ring-offset-black"
            : "focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-transparent",
        )}
      >
        <PaneMark
          src={
            showingWall
              ? "/images/shared/wall-feed-open.webp"
              : "/images/shared/wall-feed-back.webp"
          }
          /*
            CONTRAST, WHICH IS THE WHOLE REASON THIS FLAG EXISTS.

            Both marks ship as white glyphs on transparency, which is right on
            the wall — that surface is black in both personas. The feed behind
            the back button is not: DOTM's is #0a0a0b, but DEV's is
            `--_window-bg`, a pale #e3f0fc, and a white mark on that is a white
            mark on white.

            `invert` turns the white to black and leaves the alpha untouched,
            so one file serves both grounds. Inverting rather than shipping a
            second asset also means the two can never drift apart.
          */
          dark={!showingWall && !isDotm}
        />
      </button>
    </div>
  );
}

/**
 * One pane key: a looping animated mark, drawn straight onto the surface.
 *
 * A PLAIN `<img>`, NOT `next/image`, AND THAT IS LOAD-BEARING. The optimizer
 * re-encodes animated WebP and hands back a still first frame, so routing
 * these through it would silently stop them moving — the same trap already
 * documented on the Vault icon, the Contact tile and the DOTM login mark.
 *
 * The sources are `Image assets/instagram-post.gif` and `clock.gif`, keyed to
 * transparency and looped by `scripts/build-icon-alpha.mjs`. See the note
 * there for why the delivered files could not be used as they arrived.
 */
function PaneMark({ src, dark }: { src: string; dark: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={68}
      height={68}
      aria-hidden="true"
      className={cn("h-[68px] w-[68px] object-contain", dark && "invert")}
      // The drop shadow is what gives a flat white glyph an edge. The wall is
      // full of bright photographs, and a mark with no silhouette of its own
      // vanishes into the first pale tile that scrolls under it.
      style={{ filter: dark ? undefined : "drop-shadow(0 2px 6px rgba(0,0,0,0.85))" }}
    />
  );
}
