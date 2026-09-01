"use client";

import { useEffect, useRef } from "react";

/**
 * THE FILES IN THE SKY — the constellation table's buried drive, unpacked.
 *
 * THERE USED TO BE A FOLDER. One icon in the bottom-right corner opened a
 * panel listing three files, and the folder was the find; the files were only
 * what was inside it. That is inverted now, on request: the folder is gone and
 * its three contents are scattered across the field, so there are three finds
 * instead of one and the sky has to actually be looked at to turn them up.
 *
 * PINNED TO THE TABLE, NOT TO THE SKY — the one part of the old design worth
 * keeping verbatim. The table pans and zooms freely, so a file anchored to sky
 * coordinates could be dragged off screen and never found again, and a secret
 * nobody can reach twice is a bug in a costume. Each file holds a fixed spot on
 * the table instead, spread across it and clear of the three things that
 * already own screen space: the coordinate readout bottom-left, the control
 * rail bottom-centre, and the figure labels drifting across the upper sky.
 *
 * They rest at low opacity and come up to full on hover or focus, which is what
 * keeps them findable without signposting them.
 *
 * The panel each one opens is drawn inside the Vault rather than handed to the
 * window manager. That manager is flat: `openWindow(id)` puts a shell on the
 * desktop, and a desktop shell is the exact framing the Vault's fullscreen
 * placement exists to remove. Drawn here, the panel is genuinely inside the
 * Vault.
 *
 * ESCAPE IS NOT HANDLED HERE. `ConstellationSky` owns the Escape chain for this
 * surface and sees the key before anything else on the window; it closes an
 * open file first and only then releases a half-drawn line. A second listener
 * here would race that one instead of ordering against it.
 */

/** One entry in the drive. `kind` picks the icon; nothing opens yet. */
interface VaultFile {
  /** Stable id, and what the parent tracks as "which file is open". */
  id: string;
  name: string;
  kind: "image" | "installer" | "audio";
  /** Set under the name, so the glyph is not left unexplained. */
  meta: string;
  /**
   * Where on the table this one sits, as Tailwind position utilities.
   *
   * Percentages rather than fixed insets, so the three stay spread at every
   * window size — a file pinned 300px from the left is mid-screen on a laptop
   * and hard against the edge on a phone. Deliberately asymmetric: three evenly
   * spaced icons read as a toolbar, which is the opposite of a find.
   */
  spot: string;
}

const FILES: VaultFile[] = [
  {
    id: "dotm-png",
    name: "dotm.png",
    kind: "image",
    meta: "PNG image",
    // Upper left, below the run of figure labels.
    spot: "left-[8%] top-[27%]",
  },
  {
    id: "install-exe",
    name: "install.exe",
    kind: "installer",
    meta: "Application",
    // Upper right, inset far enough to clear the window's own controls.
    spot: "right-[10%] top-[16%]",
  },
  {
    id: "spectrum-mp3",
    name: "spectrum.mp3",
    kind: "audio",
    meta: "MP3 audio",
    // Lower right, above the control rail's reach.
    spot: "right-[21%] bottom-[27%]",
  },
];

export function VaultFiles({
  openId,
  onOpen,
  onClose,
}: {
  /** Which file's panel is showing, or null. Owned by the parent. */
  openId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const open = FILES.find((f) => f.id === openId) ?? null;

  return (
    <>
      {FILES.map((file) => (
        <button
          key={file.id}
          type="button"
          onDoubleClick={() => onOpen(file.id)}
          // Enter and Space stand in for the double-click. A control that can
          // only be double-clicked is unreachable without a mouse, and these
          // are hard enough to find already.
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(file.id);
            }
          }}
          aria-label={`${file.name}. Double-click to open.`}
          title="?"
          /*
            Findable, still quiet.

            The folder this replaces rested at 30% before being raised to 60%,
            for the reason that raise recorded: on a field that is mostly black,
            30% is not discreet so much as absent, and a secret nobody finds
            once is dead code. These keep the 60%; hover and focus take them to
            full.

            Narrower than the folder was, at w-11 — there are three of them now,
            and three icons at the folder's old size read as furniture rather
            than as things left lying about.
          */
          className={`group absolute z-20 block w-11 rounded-lg p-1 opacity-60 outline-none transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sky-300/70 sm:w-12 ${file.spot}`}
        >
          <FileIcon kind={file.kind} />
        </button>
      ))}

      {open && <FilePanel file={open} onClose={onClose} />}
    </>
  );
}

/**
 * One file, opened.
 *
 * Split out so it only exists while a file is open, which keeps its state from
 * surviving a close: unmounting takes it away for free, where holding it in the
 * parent would mean clearing it in an effect watching `openId` — a cascading
 * render to undo state React was willing to discard.
 */
function FilePanel({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus lands inside the panel on open, so a keyboard visitor is not left
  // tabbing around the sky behind it. Moving focus is a DOM effect, which is
  // what effects are for.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      {/* Catches clicks that miss the panel, and stops the sky behind it being
          drawn on by accident while a file is open. */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={file.name}
        tabIndex={-1}
        className="relative w-full max-w-xs overflow-hidden rounded-xl border border-slate-700 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.95)] outline-none"
        style={{
          background: "rgba(15, 23, 42, 0.94)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2.5">
          <p className="truncate font-mono text-[11px] tracking-[0.22em] text-sky-200/80">
            {file.name.toUpperCase()}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${file.name}`}
            className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 outline-none transition-colors hover:bg-slate-700 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-300/70"
          >
            <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden="true">
              <path
                d="M5 5l14 14M19 5L5 19"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-4 py-6">
          <div className="w-14">
            <FileIcon kind={file.kind} />
          </div>
          <p className="break-all text-center font-mono text-[12px] leading-tight text-slate-200">
            {file.name}
          </p>
          <p className="font-mono text-[9px] tracking-[0.16em] text-slate-500">{file.meta}</p>
        </div>

        {/* The contents behind these are still to come. Saying so is better than
            a control that swallows a click and does nothing, which reads as
            broken rather than as pending. */}
        <p className="border-t border-slate-800 px-4 py-2 text-center font-mono text-[9px] tracking-[0.16em] text-slate-500">
          NOTHING TO OPEN YET
        </p>
      </div>
    </div>
  );
}

/**
 * The three file types, drawn rather than imported.
 *
 * Each is the same sheet-with-a-folded-corner silhouette so they read as a set,
 * and each carries the one mark that says what it is: a picture, something that
 * runs, a track. Drawn as SVG because they are three flat glyphs — an icon font
 * or three PNGs would be more bytes and worse at every size.
 *
 * The drop shadow is what gives them an edge on a background that has none.
 * Opacity alone lifts the glyph and the black behind it by the same amount, so
 * a file scattered on the star field would otherwise sit flat against it — the
 * same note the folder icon carried, and the same fix.
 */
function FileIcon({ kind }: { kind: VaultFile["kind"] }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="block w-full transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
      style={{ filter: "drop-shadow(0 0 10px rgba(125,211,252,0.35))" }}
    >
      {/* Sheet and folded corner, shared by all three. */}
      <path
        d="M11 4h20l9 9v31a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M31 4v9h9" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinejoin="round" />

      {kind === "image" && (
        <>
          {/* Sun over a hill. */}
          <circle cx="19" cy="24" r="3" fill="#38bdf8" />
          <path d="M13 36l7-8 5 5 4-4 6 7z" fill="#38bdf8" opacity="0.85" />
        </>
      )}

      {kind === "installer" && (
        <>
          {/* Gear: a thing that runs and changes something. */}
          <circle cx="24" cy="30" r="6.5" fill="none" stroke="#fbbf24" strokeWidth="2.4" />
          <circle cx="24" cy="30" r="1.9" fill="#fbbf24" />
          <path
            d="M24 20.5v-3M24 42.5v-3M33.5 30h3M11.5 30h3M30.7 23.3l2.1-2.1M15.2 38.8l2.1-2.1M30.7 36.7l2.1 2.1M15.2 21.2l2.1 2.1"
            stroke="#fbbf24"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}

      {kind === "audio" && (
        <>
          {/* Beamed quaver. */}
          <path
            d="M20 36V21l12-2.6V33"
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse cx="17.4" cy="36.4" rx="3.4" ry="2.7" fill="#4ade80" />
          <ellipse cx="29.4" cy="33.4" rx="3.4" ry="2.7" fill="#4ade80" />
        </>
      )}
    </svg>
  );
}

export default VaultFiles;
