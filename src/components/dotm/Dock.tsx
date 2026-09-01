"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { useClock } from "@/hooks/use-clock";
import { MagnificationDock, type DockItemData } from "./MagnificationDock";
import {
  DotmTile,
  ShootOnSightTile,
  ContactTile,
  PortfolioTile,
  NotesTile,
  MusicTile,
  ShowsTile,
  DropsTile,
  StatsTile,
  WelcomeTile,
} from "./dock-tiles";

/**
 * The DOTM dock.
 *
 * Every surface is reachable from here. The desktop right-click menu that
 * used to hold Book / Press Kit / Drops / Live Stats / The Vault is gone: a
 * hidden context menu is undiscoverable, and on a laptop trackpad it is a
 * two-finger tap most visitors will never think to try.
 *
 * Ordered by intent rather than by when each tile was added — what a visitor
 * came to do, then the deeper material. Outbound links live in the tray, not
 * here; see `DockTray`.
 */
export function Dock() {
  const wm = useWindowManager();
  const clock = useClock();
  const open = (id: string) => () => wm.openWindow(id);

  /**
   * The row, left to right. This array IS the dock's layout — reordering here
   * is the only thing that moves a tile.
   *
   * `bare` marks the two tiles whose artwork is a transparent glyph rather than
   * a full-bleed plate. See `DockItemData.bare`: on those, the rounded ring the
   * others wear outlines an empty box instead of an icon.
   */
  const items: DockItemData[] = [
    { icon: <DotmTile />, label: "Cluster Wall", onClick: open("cluster-wall") },
    { icon: <ShootOnSightTile />, label: "Shoot at Site", onClick: open("shoot-on-sight") },
    { icon: <MusicTile />, label: "Music", onClick: open("music-player") },
    { icon: <ShowsTile />, label: "Shows", onClick: open("shows") },
    { icon: <DropsTile />, label: "Drops", onClick: open("merch") },
    { icon: <StatsTile />, label: "Live Stats", onClick: open("stats"), bare: true },
    { icon: <PortfolioTile />, label: "Portfolio", onClick: open("portfolio") },
    { icon: <WelcomeTile />, label: "The Story", onClick: open("welcome") },
    { icon: <ContactTile />, label: "Contact", onClick: open("contact"), bare: true },
    { icon: <NotesTile />, label: "Notes", onClick: open("notes") },
  ];

  /**
   * Stand down for a window that has taken the whole tab.
   *
   * The dock and its tray are both `fixed` at `z-[200]`, above every window
   * shell, so a fullscreen window left them floating over the sky instead of
   * behind it. Returning null takes the tray with it, since that is rendered
   * below inside this same fragment. Nobody is stranded: a window that claims
   * the chrome always keeps its own way out on screen.
   */
  if (wm.chromeHidden) return null;

  return (
    <>
      <div className="fixed bottom-4 inset-x-0 z-[200] flex justify-center pointer-events-none px-3">
        {/* `data-desktop-obstacle` marks this pill as somewhere draggable
            desktop furniture may not be parked — see `pushOutOfObstacles` in
            window-geometry. It goes on the pill and not on the full-width row
            around it, which is the entire point: the row spans the screen, the
            dock occupies only the middle of it, and the empty desktop either
            side stays reachable all the way into the corners. */}
        <div data-desktop-obstacle className="pointer-events-auto max-w-full">
          <MagnificationDock
            items={items}
            baseItemSize={38}
            magnification={64}
            panelHeight={54}
            distance={150}
          />
        </div>
      </div>

      <DockTray onOpenMusic={open("music-player")} clock={clock} />
    </>
  );
}

/**
 * The corner tray — DOTM's answer to the DEV taskbar's right-hand end.
 *
 * Four marks and a clock. Music opens the record player; Instagram, YouTube
 * and Spotify leave the site, so they open in a new tab rather than replacing
 * the desktop under the visitor.
 *
 * The socials used to sit on the dock itself, at the same size and treatment
 * as ten places *inside* the site, with no signal that three of them threw
 * you off the page entirely. Here the split is legible: the dock is where you
 * go, the tray is where you leave from, and a hairline separates one from the
 * other.
 *
 * Every mark is drawn at 17px inside a 32px button — exactly the size the
 * lone music icon already was — so the row reads as one uniform set rather
 * than four differently weighted logos. They sit in the tray's own white
 * rather than in brand colours: three saturated logos on frosted glass over a
 * red wallpaper is a colour fight nobody wins. Each takes its brand colour on
 * hover instead, which is the moment the colour actually means something.
 */

const SOCIALS: Array<{
  label: string;
  href: string;
  /** Brand colour, used only on hover. */
  accent: string;
  mark: ReactNode;
}> = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/devilonthemic/",
    accent: "#e1306c",
    mark: <InstagramMark />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@devilonthemic",
    accent: "#ff0033",
    mark: <YouTubeMark />,
  },
  {
    label: "Spotify",
    href: "https://open.spotify.com/artist/2AL0XQ1mbnWU5xVR6R4KRa",
    accent: "#1ed760",
    mark: <SpotifyMark />,
  },
];

function DockTray({ onOpenMusic, clock }: { onOpenMusic: () => void; clock: string }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex items-center">
      {/* The other half of the bottom bar, and the other place a dragged coin
          is turned away from. See the note on the dock pill above. */}
      <div
        data-desktop-obstacle
        className="macos-glass pointer-events-auto flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-3.5 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.75)]"
      >
        <TrayButton label="Music" accent="#ffffff" onClick={onOpenMusic}>
          <MusicMark />
        </TrayButton>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/20" />

        {SOCIALS.map((social) => (
          <TrayButton
            key={social.label}
            label={social.label}
            accent={social.accent}
            href={social.href}
          >
            {social.mark}
          </TrayButton>
        ))}

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/20" />

        <time className="font-chrome text-[13px] tabular-nums tracking-wide text-white/90">
          {clock}
        </time>

        {/* The avatar used to sit here, past the clock. It has moved to the
            top-right of the persona bar, where DEV's now is as well — one
            account control, one place, both faces. See `AccountMenu`. */}
      </div>
    </div>
  );
}

/**
 * One tray key, as a button or as an outbound link.
 *
 * The motion is a lift and a settle rather than a colour swap: the mark rises
 * a couple of pixels, grows a shade, and a disc of its brand colour blooms
 * behind it, with the label rising above. Springs rather than eased tweens,
 * so a pointer sweeping the row leaves each key bobbing in its wake instead
 * of four things snapping in unison.
 *
 * Hover state is tracked here rather than left to CSS because the same flag
 * drives three elements — bloom, mark and tooltip — and keyboard focus has to
 * light all three the way a pointer does.
 */
function TrayButton({
  label,
  accent,
  href,
  onClick,
  children,
}: {
  label: string;
  accent: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <>
      {/* The bloom. Inert to pointers so it never eats the click. */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        initial={false}
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.6 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        style={{
          background: `radial-gradient(circle, ${accent}40 0%, ${accent}00 70%)`,
          boxShadow: `0 0 16px -2px ${accent}80`,
        }}
      />

      <motion.span
        className="relative flex items-center justify-center"
        initial={false}
        animate={{ y: hovered ? -2.5 : 0, scale: hovered ? 1.14 : 1 }}
        transition={{ type: "spring", stiffness: 480, damping: 18 }}
        style={{ color: hovered ? accent : "rgba(255,255,255,0.85)" }}
      >
        {children}
      </motion.span>

      <AnimatePresence>
        {hovered && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -8 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            className="macos-glass pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 whitespace-pre rounded-md px-2 py-1 font-chrome text-[11px] tracking-wide text-persona-fg shadow-lg"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  const shared = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
    "aria-label": label,
    title: label,
    className:
      "relative flex h-8 w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70",
  };

  if (href) {
    return (
      <a {...shared} href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <button {...shared} type="button" onClick={onClick}>
      {content}
    </button>
  );
}

/* ── Marks ──────────────────────────────────────────────────────────────
   All four at 17px, drawn to the same optical weight, in `currentColor` so
   the hover tint above is the only place any colour is set. */

const MARK = 17;

function MusicMark() {
  return (
    <svg viewBox="0 0 24 24" width={MARK} height={MARK} fill="currentColor" aria-hidden="true">
      <path d="M20.4 3.32a1 1 0 0 0-.83-.2l-10 2A1 1 0 0 0 8.8 6.1v8.42A3.6 3.6 0 1 0 10.8 17.7V9.02l8-1.6v5.1A3.6 3.6 0 1 0 20.8 15.7V4.1a1 1 0 0 0-.4-.78Z" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={MARK}
      height={MARK}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeMark() {
  return (
    <svg viewBox="0 0 24 24" width={MARK} height={MARK} fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10.1 14.9V9.1l5.05 2.9-5.05 2.9Z" />
    </svg>
  );
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 24 24" width={MARK} height={MARK} aria-hidden="true">
      <circle cx="12" cy="12" r="9.6" fill="currentColor" />
      {/* The three waves are cut back out of the disc, so the mark keeps its
          silhouette at 17px whatever colour it takes. */}
      <g stroke="rgba(10,20,14,0.82)" strokeLinecap="round" fill="none">
        <path d="M7.1 9.3c3.1-.95 7-.6 9.6.95" strokeWidth="1.75" />
        <path d="M7.7 12.3c2.6-.75 5.9-.5 8 .85" strokeWidth="1.55" />
        <path d="M8.3 15.1c2.05-.6 4.6-.4 6.4.7" strokeWidth="1.35" />
      </g>
    </svg>
  );
}
