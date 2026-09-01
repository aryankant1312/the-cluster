"use client";

import { startTransition, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useAuthScope } from "@/components/providers/AuthProvider";
import { DotmWindow } from "@/components/window-manager/DotmWindow";
import { DesktopWallpaper } from "@/components/dotm/DesktopWallpaper";
import { StickyNoteCard } from "@/components/dotm/StickyNoteCard";
import { ContactCard } from "@/components/dotm/window-content/ContactCard";
import { NotesApp, type StickyNote } from "@/components/dotm/window-content/NotesApp";
import { MiniPlayer } from "@/components/dotm/window-content/MiniPlayer";
import { DotmVaultIcon } from "@/components/dotm/DotmVaultIcon";
import { BookDotm } from "@/components/shared/BookDotm";
import { DesktopMetrics } from "@/components/shared/DesktopMetrics";
import { WindowLoading } from "@/components/window-manager/WindowLoading";
import { Blink, DOTM_OPEN_MS } from "@/components/shared/Blink";
import { disarmBlink, isBlinkArmed } from "@/lib/blink-gate";

/**
 * WINDOW CONTENT IS CODE-SPLIT. Read this before adding a static import above.
 *
 * A desktop is a launcher: the visitor sees a wallpaper, two counters and a
 * dock, and opens at most two or three of eleven windows. Importing all eleven
 * statically meant every one of them — the record player and its ring gallery,
 * the Leaflet shows map, the Vault's sky — was downloaded, parsed and executed
 * before the wallpaper could paint. The Music window took seconds to open
 * because the whole desktop was still parsing JavaScript for windows nobody
 * had clicked.
 *
 * `next/dynamic` moves each of these into its own chunk, fetched when the
 * window actually renders. The shells return `null` while closed, so nothing
 * here is requested until the visitor opens it.
 *
 * `ssr: false` on all of them: every one is a `"use client"` surface that
 * measures the viewport, touches `window`, or draws to a canvas, so a server
 * pass produces markup that is thrown away on hydration.
 *
 * Deliberately NOT split: `DesktopMetrics`, `BookDotm`, `ContactCard`,
 * `NotesApp`, `MiniPlayer`, `DotmVaultIcon`. They are small, and the first
 * three are what a visitor opens first.
 */
const StoryWindow = dynamic(
  () => import("@/components/shared/StoryWindow").then((m) => m.StoryWindow),
  { ssr: false, loading: () => <WindowLoading label="The Story" /> },
);
const DotmMusicWheel = dynamic(
  () => import("@/components/dotm/window-content/DotmMusicWheel").then((m) => m.DotmMusicWheel),
  { ssr: false, loading: () => <WindowLoading label="Music" /> },
);
const ShowsExperience = dynamic(
  () => import("@/components/dotm/window-content/ShowsExperience").then((m) => m.ShowsExperience),
  { ssr: false, loading: () => <WindowLoading label="Shows" /> },
);
const ShootOnSightWindow = dynamic(
  () => import("@/components/shared/ShootOnSightWindow").then((m) => m.ShootOnSightWindow),
  { ssr: false, loading: () => <WindowLoading label="Shoot at Site" /> },
);
const ClusterWallWindow = dynamic(
  () => import("@/components/shared/ClusterWallWindow").then((m) => m.ClusterWallWindow),
  { ssr: false, loading: () => <WindowLoading label="Cluster Wall" /> },
);
/**
 * Drops shows the teaser, not the shop.
 *
 * `MerchDrops` is a complete storefront with a working cart and it is still in
 * the tree — switching this one import back is the whole of putting it live.
 * There is nothing to sell yet, though, and a cart that cannot check out is a
 * worse answer than an honest empty room.
 */
const ComingSoonDrop = dynamic(
  () => import("@/components/shared/ComingSoonDrop").then((m) => m.ComingSoonDrop),
  { ssr: false, loading: () => <WindowLoading label="Drops" /> },
);
const LiveStats = dynamic(
  () => import("@/components/shared/LiveStats").then((m) => m.LiveStats),
  { ssr: false, loading: () => <WindowLoading label="Live Stats" /> },
);
const DotmPortfolioWindow = dynamic(
  () =>
    import("@/components/dotm/window-content/DotmPortfolioWindow").then(
      (m) => m.DotmPortfolioWindow,
    ),
  { ssr: false, loading: () => <WindowLoading label="Portfolio" /> },
);
const DotmVaultWindow = dynamic(
  () => import("@/components/dotm/window-content/DotmVaultWindow").then((m) => m.DotmVaultWindow),
  { ssr: false, loading: () => <WindowLoading label="The Vault" /> },
);

export default function DotmDesktopPage() {
  const wm = useWindowManager();
  const { syncPersona } = usePersona();
  // This screen is the DOTM door. Tell the auth provider so, or it has
  // no way of knowing which of the two sessions to read.
  useAuthScope("dotm");

  const [notes, setNotes] = useState<StickyNote[]>([]);

  useEffect(() => {
    startTransition(() => syncPersona("dotm"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The eye opening onto the desktop.
   *
   * WHAT THIS REPLACED. Arriving here used to read a `dotm-welcome` flag out
   * of sessionStorage and pop "The Story" open 400ms later. Both are gone. The
   * desktop *is* the destination — it is what the door was a door to — and a
   * window that arrives unasked a beat after you land is the loading gap this
   * change exists to remove, just wearing a different costume.
   *
   * Read during render, not in an effect, so the lids are on screen in the
   * first painted frame rather than the second. See `lib/blink-gate.ts` for
   * why the flag is a module variable and why peeking and spending it are two
   * separate calls.
   */
  const [opening, setOpening] = useState(() => isBlinkArmed());
  useEffect(() => {
    disarmBlink();
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      <DesktopWallpaper src="/images/dotm/wallpaper-0001.jpg" alt="" />

      <DesktopMetrics />

      {/* Every window centres itself and opens windowed. Nothing opens
          maximized: a full-viewport window cropped its own content against
          the dock and the top bar. */}
      {/* "The Story" — the Finding Peace wall and the Four Best Flows
          timeline, behind two tabs. */}
      <DotmWindow id="welcome" title="The Story" placement="fullscreen" fullSurface>
        <StoryWindow />
      </DotmWindow>
      <DotmWindow id="book" title="Book DOTM" width="82vw" height="68vh" fullSurface>
        <BookDotm />
      </DotmWindow>
      {/* Landscape, and the largest window on this desktop that is still a
          window. Three columns of type plus a photograph want room on both
          axes — at 88×74 the bio column ran long and the picture was cropped to
          a strip. The height still yields to the shell's dock clearance on a
          short viewport; the width no longer yields to anything, for which see
          the `maxWidth` note in DotmWindow. */}
      <DotmWindow id="contact" title="DOTM" width="98vw" height="90vh" fullSurface>
        <ContactCard onBook={() => wm.openWindow("book")} />
      </DotmWindow>
      <DotmWindow id="notes" title="Notes" width={380}>
        <NotesApp onPost={(note) => setNotes((prev) => [...prev, note])} />
      </DotmWindow>
      {/* The one window that opens fullscreen. The wheel and the record
          playing beside it are a two-pane layout, and squeezing both into
          82vw left the lyric column too narrow to read — filled still left a
          top bar and dock crowding a layout that wants to breathe. */}
      <DotmWindow
        id="music-player"
        title="Music"
        placement="fullscreen"
        fullSurface
        keepMounted
      >
        <DotmMusicWheel />
      </DotmWindow>
      <DotmWindow id="mini-player" title="Now Playing" width={360}>
        <MiniPlayer />
      </DotmWindow>
      {/* Shows takes the whole tab, over the top bar and the dock both.
          It is the widest surface on the desktop — a map, a column of city
          cards and a vote board, none of which wants to be the one that gets
          squeezed — and at 92vw the board was still competing with chrome it
          had no use for. Like the Vault and the player, it keeps its own way
          out: the green light drops it back to a framed window and Escape
          closes it outright. */}
      <DotmWindow id="shows" title="Shows" placement="fullscreen" fullSurface>
        <ShowsExperience />
      </DotmWindow>
      {/* Fullscreen, like the Vault and the player. The wall is a field of
          moving images that runs to the edge of whatever it is given, and an
          82vh window framed it as a picture of a wall rather than the wall.
          Same `fullscreen` placement those two use, so it keeps their way back
          out: the green light drops it to a framed window and Escape closes
          it. The 666 coin stands down for it — see `COIN_HIDDEN_FOR`. */}
      <DotmWindow id="cluster-wall" title="Cluster Wall" placement="fullscreen" fullSurface>
        <ClusterWallWindow />
      </DotmWindow>
      {/* Filled, like the Vault and the player. The teaser is one mark held in
          the middle of a dark field, and a mark that size in an 82vh window is
          a picture of a poster rather than the poster. Same `fullscreen`
          placement those two use, so it keeps their way back out: the green
          light drops it to a framed window and Escape closes it. */}
      {/* Framed rather than fullscreen: this is a reference shelf you browse
          with the desktop still around you, not a room you stand in. */}
      {/* FULLSCREEN, ON REQUEST. The window is a two-column surface now — the
          places on the left, the persona's "was here" loop down the right —
          and a windowed 86vw box gave the loop a column too narrow to read as
          anything but a sliver. `fullSurface` goes with it: the panel manages
          its own edges and its own scroller, so the shell's padding and sky
          would only be a second frame inside the first. */}
      <DotmWindow id="shoot-on-sight" title="Shoot at Site" placement="fullscreen" fullSurface>
        <ShootOnSightWindow isDotm />
      </DotmWindow>
      <DotmWindow id="merch" title="Drops" placement="fullscreen" fullSurface>
        <ComingSoonDrop />
      </DotmWindow>
      <DotmWindow id="stats" title="Live Stats" width="74vw" height="80vh" fullSurface>
        <LiveStats />
      </DotmWindow>
      {/* The portfolio window carries a photograph as its ground now, and a
          photograph shown small is a thumbnail. Up from 88×84 — the height
          still yields to the shell's dock clearance on a short viewport, which
          on a 1080p display works out at roughly a fifth more window. */}
      <DotmWindow id="portfolio" title="Portfolio" width="98vw" height="94vh" fullSurface>
        <DotmPortfolioWindow />
      </DotmWindow>
      {/* The Vault opens filled, like the music player. Behind the code lock
          is a sky you turn your head inside of, and a windowed sky is a
          postcard. Filled still stops short of the top bar and the dock, so
          the traffic lights stay reachable. */}
      <DotmWindow id="vault" title="The Vault" placement="fullscreen" fullSurface>
        <DotmVaultWindow />
      </DotmWindow>

      <DotmVaultIcon />

      {notes.map((note) => (
        <StickyNoteCard key={note.id} note={note} />
      ))}

      {opening && (
        <Blink
          mode="open"
          durationMs={DOTM_OPEN_MS}
          onDone={() => setOpening(false)}
        />
      )}
    </div>
  );
}
