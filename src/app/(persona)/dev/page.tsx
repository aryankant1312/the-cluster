"use client";

import { startTransition, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useAuthScope } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { DevWindow } from "@/components/window-manager/DevWindow";
import { DesktopIcon } from "@/components/dev/DesktopIcon";
import { DEV_WINDOWS } from "@/components/dev/registry";
import { MyMusicWindow } from "@/components/dev/window-content/MyMusicWindow";
import { FolderWindow } from "@/components/dev/window-content/FolderWindow";
import { RecycleBinWindow } from "@/components/dev/window-content/RecycleBinWindow";
import { ContactWindow } from "@/components/dev/window-content/ContactWindow";
import { BookDotm } from "@/components/shared/BookDotm";
import { DesktopMetrics } from "@/components/shared/DesktopMetrics";
import { WindowLoading } from "@/components/window-manager/WindowLoading";

/**
 * WINDOW CONTENT IS CODE-SPLIT. Read this before adding a static import above.
 *
 * A desktop is a launcher: the visitor sees a wallpaper, an icon column and a
 * taskbar, and opens two or three of a dozen windows. Importing all of them
 * statically meant every one — the player, the Vault's sky, the portfolio —
 * was downloaded, parsed and executed before the wallpaper could paint. The
 * Music window took seconds to open because the desktop was still parsing
 * JavaScript for windows nobody had clicked.
 *
 * `next/dynamic` gives each its own chunk, fetched when the window renders.
 * `DevWindow` returns `null` while closed, so nothing here is requested until
 * the visitor opens it.
 *
 * Deliberately NOT split: `MyMusicWindow`, `FolderWindow`, `RecycleBinWindow`,
 * `ContactWindow`, `BookDotm`, `DesktopMetrics` — all small, and the first is
 * the entry point to the player.
 */
const PortfolioWindow = dynamic(
  () => import("@/components/dev/window-content/PortfolioWindow").then((m) => m.PortfolioWindow),
  { ssr: false, loading: () => <WindowLoading label="Portfolio" /> },
);
const VaultWindow = dynamic(
  () => import("@/components/dev/window-content/VaultWindow").then((m) => m.VaultWindow),
  { ssr: false, loading: () => <WindowLoading label="The Vault" /> },
);
const MusicPlayerWindow = dynamic(
  () =>
    import("@/components/dev/window-content/MusicPlayerWindow").then((m) => m.MusicPlayerWindow),
  { ssr: false, loading: () => <WindowLoading label="Player" /> },
);
const StoryWindow = dynamic(
  () => import("@/components/shared/StoryWindow").then((m) => m.StoryWindow),
  { ssr: false, loading: () => <WindowLoading label="The Story" /> },
);
/**
 * Drops shows the teaser, not the shop. `MerchDrops` is a complete storefront
 * and is still in the tree — switching this one import back is the whole of
 * putting it live. See the matching note on the DOTM desktop.
 */
const ComingSoonDrop = dynamic(
  () => import("@/components/shared/ComingSoonDrop").then((m) => m.ComingSoonDrop),
  { ssr: false, loading: () => <WindowLoading label="Drops" /> },
);
const LiveStats = dynamic(
  () => import("@/components/shared/LiveStats").then((m) => m.LiveStats),
  { ssr: false, loading: () => <WindowLoading label="Live Stats" /> },
);
const ShootOnSightWindow = dynamic(
  () => import("@/components/shared/ShootOnSightWindow").then((m) => m.ShootOnSightWindow),
  { ssr: false, loading: () => <WindowLoading label="Shoot at Site" /> },
);
const ClusterWallWindow = dynamic(
  () => import("@/components/shared/ClusterWallWindow").then((m) => m.ClusterWallWindow),
  { ssr: false, loading: () => <WindowLoading label="Cluster Wall" /> },
);
import {
  MyMusicImageIcon,
  PortfolioImageIcon,
  VaultIcon,
  ClusterWallIcon,
  ShootOnSightIcon,
  ShowsIcon,
  RecycleBinImageIcon,
} from "@/components/dev/icons";
// `wallpaper.jpg` is no longer imported: the desktop's ground is
// `public/videos/dev-desktop.mp4` now. The still is left in `public/` rather
// than deleted — it is the fallback to reinstate if the clip is ever pulled.

/**
 * Every desktop icon uses the same 46px box. Cluster Wall used to opt into
 * 64, which made it read as more important than its neighbours and broke the
 * column's vertical rhythm.
 */
const STACK_ICONS: Array<{
  id: string;
  label: string;
  icon: React.ReactNode;
  iconBoxVariant?: "white" | "black" | "none";
}> = [
  // Portfolio leads the column, above My Music. The order here is the order
  // down the left edge of the desktop — this list is the layout.
  { id: "portfolio", label: "Portfolio", icon: <PortfolioImageIcon />, iconBoxVariant: "none" },
  { id: "my-music", label: "My Music", icon: <MyMusicImageIcon />, iconBoxVariant: "none" },
  { id: "vault", label: "The Vault", icon: <VaultIcon />, iconBoxVariant: "none" },
  { id: "cluster-wall", label: "Cluster Wall", icon: <ClusterWallIcon />, iconBoxVariant: "none" },
  // Shoot at Site used to end this column. It is placed on its own below —
  // centre of the desktop, on the Recycle Bin's line.
];

const ICON_STACK_GAP = 101;
/**
 * The column starts below the Cluster metric tile rather than at the top of
 * the wallpaper, so icons and metrics never overlap.
 */
const ICON_STACK_TOP = 104;
// +1 Shows (middle right), +1 Shoot at Site (bottom centre), +1 Recycle Bin
// (bottom right). Press Kit used to sit at the bottom of the left column; it
// is a download inside Portfolio now.
//
// THIS COUNT DRIVES THE REVEAL, so it has to stay in step with what is
// actually drawn: the boot staggers icons in one at a time up to this number,
// and an icon past the end of the count is one that never fades in.
const TOTAL_ICONS = STACK_ICONS.length + 3;

/**
 * The bottom row's baseline, shared by Shoot at Site and the Recycle Bin.
 *
 * One constant rather than the number written twice, because "along the
 * recycle bin alignment" is a relationship: move one and the other has to
 * follow, and two copies of `calc(100% - 127px)` are two chances for it not
 * to.
 */
/**
 * Back to 127px, along with the label size that justified it.
 *
 * This went to 160 while the labels were doubled — an icon was 96px tall then,
 * and at 127 the Recycle Bin's foot landed 18px inside the taskbar. The labels
 * are back at `text-sm`, so the icon is short again and so is this.
 */
const BOTTOM_ROW_TOP = "calc(100% - 127px)";

/**
 * The right column's inset from the edge, shared by all three icons in it.
 *
 * Written once because the three are now stacked and any disagreement between
 * them reads as a mistake rather than as a layout.
 */
const RIGHT_COLUMN_INSET = 24;

export default function DevDesktopPage() {
  const wm = useWindowManager();
  const router = useRouter();
  const { syncPersona } = usePersona();
  // This screen is the DEV door. Tell the auth provider so, or it has
  // no way of knowing which of the two sessions to read.
  useAuthScope("dev");

  const [iconsVisible, setIconsVisible] = useState<number>(0);
  const [playerTrack, setPlayerTrack] = useState({ index: 0, requestId: 0 });

  const playTrack = (index: number) => {
    setPlayerTrack((prev) => ({ index, requestId: prev.requestId + 1 }));
    wm.openWindow("music-player");
  };

  useEffect(() => {
    startTransition(() => syncPersona("dev"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const justBooted = window.sessionStorage.getItem("dev-welcome") === "1";
    window.sessionStorage.removeItem("dev-welcome");

    let cancelled = false;
    for (let i = 0; i < TOTAL_ICONS; i++) {
      setTimeout(
        () => {
          if (!cancelled) setIconsVisible((v) => Math.max(v, i + 1));
        },
        justBooted ? i * 80 : 0,
      );
    }

    if (justBooted) {
      const timer = setTimeout(() => wm.openWindow("welcome"), TOTAL_ICONS * 80 + 200);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealed = (index: number) =>
    cn(
      "transition-all duration-[250ms] ease-out",
      index < iconsVisible ? "opacity-100 scale-100" : "opacity-0 scale-[0.8]",
    );

  return (
    <div className="absolute inset-0">
      {/* THE WALLPAPER IS A CLIP NOW, not a photograph.
          `poster` is the clip's own first frame, so the desktop is never blank
          while the video arrives and looks identical the instant it starts.
          Muted and `playsInline` are what make autoplay legal — an unmuted
          autoplay is refused outright by every browser, and this file ships
          with its audio track stripped anyway.
          `z-0` AND FIRST IN THE DOM, not `-z-10`. The still it replaced used a
          negative index harmlessly, but a video is promoted to its own
          compositor layer, and a negatively-indexed compositor layer paints
          behind its own stacking context — which, if this element's ancestors
          ever stop forming one, is behind the window shells as well as behind
          the desktop. At `z-0` in first position it is below every later
          sibling by ordinary paint order, with nothing to reason about. */}
      <video
        src="/videos/dev-desktop.mp4"
        poster="/videos/dev-desktop-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />

      <DesktopMetrics />

      {STACK_ICONS.map((icon, i) => (
        <div key={icon.id} className={revealed(i)}>
          <DesktopIcon
            label={icon.label}
            icon={icon.icon}
            iconBoxVariant={icon.iconBoxVariant}
            initial={{ x: 12, y: ICON_STACK_TOP + i * ICON_STACK_GAP }}
            onOpen={() => wm.openWindow(icon.id)}
          />
        </div>
      ))}

      {/* THE RIGHT COLUMN: Shows at the top, Shoot at Site in the middle,
          Recycle Bin at the foot — all three on `RIGHT_COLUMN_INSET`, so they
          share one vertical line the way the left column's four do.

          Shows used to sit at `right: 16` against the Bin's `right: 24`. Eight
          pixels is invisible while they are at opposite ends of the screen and
          unmissable the moment they are stacked. One constant now, so moving
          the column is a single edit. */}
      {/* `none`, not `black`. The mark is the delivered artwork now, keyed to
          transparency, so it needs no plate to be visible — and the plate was
          the only thing making this icon look unlike its four neighbours. */}
      <DesktopIcon
        label="Shows"
        icon={<ShowsIcon />}
        iconBoxVariant="none"
        initial={{ x: 0, y: 0 }}
        style={{ right: RIGHT_COLUMN_INSET, top: ICON_STACK_TOP }}
        className={revealed(STACK_ICONS.length)}
        onOpen={() => router.push("/shows")}
      />

      {/* The middle of that column. `calc(50% - 55px)` is half the desktop
          less half an icon, which is where Shows used to sit — the position is
          inherited rather than invented, so the three are evenly spread down
          the edge. */}
      <DesktopIcon
        label="Shoot at Site"
        icon={<ShootOnSightIcon />}
        iconBoxVariant="none"
        initial={{ x: 0, y: 0 }}
        style={{ right: RIGHT_COLUMN_INSET, top: "calc(50% - 55px)" }}
        className={revealed(STACK_ICONS.length + 1)}
        onOpen={() => wm.openWindow("shoot-on-sight")}
      />

      <DesktopIcon
        label="Recycle Bin"
        icon={<RecycleBinImageIcon />}
        iconBoxVariant="none"
        initial={{ x: 0, y: 0 }}
        style={{ right: RIGHT_COLUMN_INSET, top: BOTTOM_ROW_TOP }}
        className={revealed(STACK_ICONS.length + 2)}
        onOpen={() => wm.openWindow("recycle-bin")}
      />

      {/* Every window centres itself and opens windowed — nothing opens
          maximized, which was cropping content against the taskbar. */}
      {/* "The Story" — two carousels behind two tabs, in DEV's chrome.
          Fullscreen, like the Vault: both panels are edge-to-edge artwork, and
          a filled window still left a top bar and a taskbar framing a
          carousel that is meant to be the whole view. The maximize button is
          live here and Escape closes it, because covering the chrome removes
          every other way back to the desktop. */}
      <DevWindow
        id="welcome"
        title="The Story"
        placement="fullscreen"
        fullSurface
        titleClassName="text-lg sm:text-xl"
      >
        <StoryWindow />
      </DevWindow>
      <DevWindow id="book" title="Book DOTM" width="82vw" height="70vh">
        <BookDotm />
      </DevWindow>
      <DevWindow id="my-music" title={DEV_WINDOWS.find((w) => w.id === "my-music")!.title}>
        <MyMusicWindow onSelectTrack={playTrack} onOpenFolder={(id) => wm.openWindow(id)} />
      </DevWindow>
      <DevWindow id="folder-therapy-session" title="Therapy Session pt.1">
        <FolderWindow folderId="folder-therapy-session" onSelectTrack={playTrack} />
      </DevWindow>
      <DevWindow id="folder-666-the-beginning" title="666 - The Beginning">
        <FolderWindow folderId="folder-666-the-beginning" onSelectTrack={playTrack} />
      </DevWindow>
      <DevWindow id="folder-its-ok" title="It's OK">
        <FolderWindow folderId="folder-its-ok" onSelectTrack={playTrack} />
      </DevWindow>
      <DevWindow id="folder-finding-peace" title="Finding peace">
        <FolderWindow folderId="folder-finding-peace" onSelectTrack={playTrack} />
      </DevWindow>
      {/*
        SIZED TO THE PICTURE, not to the screen.

        `portfolio-backdrop-2.jpg` is 5740x3027 - aspect 1.896 - and a window
        that does not share that ratio is a window that crops it. The previous
        98vw x 98vh came out at 2.41 on a 1858x859 viewport, which is where the
        zoom-out-plus-blurred-surround in `BrandUniverse` came from: machinery
        built to hide a crop. Matching the ratio removes the crop instead, and
        that machinery went with it.

        HEIGHT LEADS AND WIDTH FOLLOWS, because height is the constrained axis:
        `DevWindow` clamps at `max-height: calc(100vh - 104px)` to keep the
        taskbar reachable, and there is no matching pressure on width. So 82vh
        is chosen first - comfortably inside that clamp at every viewport
        height - and the width is derived from it.

        BOTH FIGURES ARE IN `vh`, THE WIDTH INCLUDED. That is not a typo: `vh`
        is a valid unit for `width`, and using it is what pins the ratio. A
        width in `vw` tracks the viewport's width while the height tracks its
        height, so 1.896 would hold at exactly one window size and drift at
        every other. 163 / 86 = 1.895, and it stays 1.895 through any resize.

        IT WAS WRITTEN `calc(82vh * 1.896)` FIRST, AND THAT WAS WRONG. The calc
        is valid CSS and the window did size correctly — but `negativeHalf` in
        `window-geometry.ts` matches a bare number-and-unit and returns null for
        anything else, which drops `useCenterOffsets` into measuring the element
        instead. That measurement came back 0, so `marginLeft` stayed 0 against
        `left: 50%` and the window hung off the right half of the screen with
        its left edge sitting on the midline. A plain `vh` figure parses, so the
        centring is arithmetic again and nothing is measured at runtime.

        86vh, not 82, because of the second half of the ask. The window centres
        on the viewport, so its top edge lands at `50vh - height/2`: at 82vh
        that is 65px on a 720px-tall window, which is the top bar's own bottom
        edge — touching it rather than covering it. 86vh lifts the top edge to
        about 52px and puts the whole titlebar across the bar. `DevWindow`
        clamps the height at `100vh - 104px` to keep the taskbar reachable, and
        the centring still reads the declared 86vh, so on a viewport short
        enough for that clamp to bite the window sits ~1.5px high. Not worth a
        measurement pass to correct.

        `overTopBar` is the other half of the titlebar fix, and it is not a
        z-index one. See the `position` note in `DevWindow` for what was
        actually clipping it.
      */}
      <DevWindow
        id="portfolio"
        title="Portfolio"
        width="163vh"
        height="86vh"
        overTopBar
        titleClassName="text-lg sm:text-xl"
      >
        <PortfolioWindow />
      </DevWindow>
      {/* The Vault takes the whole tab. Behind the code lock is a sky you turn
          your head inside of, and a windowed sky is a postcard — so this is the
          one window that draws over the top bar and the taskbar both. The
          maximize button is live here and Escape closes it, because covering
          the chrome removes every other way back to the desktop. */}
      <DevWindow
        id="vault"
        title="The Vault"
        placement="fullscreen"
        fullSurface
        titleClassName="text-lg sm:text-xl"
      >
        <VaultWindow />
      </DevWindow>
      {/* Fullscreen, like the Vault. The wall runs to the edge of whatever it
          is given, and a 90vw window framed it as a picture of a wall rather
          than the wall. The maximize button is live here and Escape closes it,
          because covering the chrome removes every other way back. */}
      <DevWindow
        id="cluster-wall"
        title="Cluster Wall"
        placement="fullscreen"
        fullSurface
        titleClassName="text-lg sm:text-xl"
      >
        <ClusterWallWindow />
      </DevWindow>
      {/* Filled, like the Vault above. The teaser is one mark held in the
          middle of the surface, and a mark that size in an 82vh window is a
          picture of a poster rather than the poster. Same `fullscreen`
          placement, so it keeps the same way out: the maximize control drops
          it back to a framed window and Escape closes it. */}
      {/* FULLSCREEN, ON REQUEST. The window is a two-column surface now — the
          places on the left, the persona's "was here" loop down the right —
          and a windowed 86vw box gave the loop a column too narrow to read as
          anything but a sliver. `fullSurface` goes with it: the panel manages
          its own edges and its own scroller, so the shell's padding and sky
          would only be a second frame inside the first. */}
      <DevWindow id="shoot-on-sight" title="Shoot at Site" placement="fullscreen" fullSurface>
        <ShootOnSightWindow isDotm={false} />
      </DevWindow>
      <DevWindow id="merch" title="Drops" placement="fullscreen" fullSurface>
        <ComingSoonDrop />
      </DevWindow>
      <DevWindow id="stats" title="Live Stats" width="72vw" height="80vh">
        <LiveStats />
      </DevWindow>
      <DevWindow id="recycle-bin" title="Recycle Bin">
        <RecycleBinWindow />
      </DevWindow>
      <DevWindow id="contact" title="Contact Me" width="76vw" height="56vh">
        <ContactWindow onBook={() => wm.openWindow("book")} />
      </DevWindow>
      {/* `keepMounted`: minimizing the player must not stop the record. The
          shell stays mounted and hidden so its <audio> survives — see the prop
          on DevWindow. */}
      <DevWindow
        id="music-player"
        title="Music"
        width={520}
        height="76vh"
        /* LEFT, so the player does not land on top of My Music. Both open from
           one gesture — double-clicking a song in the browser starts it — and
           with the browser centred and the player parked right, choosing a
           track covered the list you chose it from. Same size as before; only
           the edge it sits against has changed. */
        placement="left"
        keepMounted
      >
        <MusicPlayerWindow initialIndex={playerTrack.index} playRequestId={playerTrack.requestId} />
      </DevWindow>
    </div>
  );
}
