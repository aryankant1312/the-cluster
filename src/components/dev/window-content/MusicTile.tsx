"use client";

import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/**
 * A file on the DEV desktop's music surfaces.
 *
 * A track's artwork *is* its icon. Every thumbnail used to be wrapped in a
 * raised `win98-border` plate on a white ground, which read as a sticker
 * stuck onto a generic file icon rather than as the record itself.
 *
 * Folders have no plate either now. They kept one on the argument that a
 * glyph needs something to sit on — but the glyph was a JPEG, so its own
 * white ground showed through as well, and the two stacked into a white slab
 * with a folder printed on it. The artwork is keyed to transparency
 * (`folder-icon.png`) and drawn straight onto the window, which is what a
 * desktop folder has always looked like. Shape alone separates "container"
 * from "song": a folder reads as a folder, and album art does not.
 *
 * Labels get a `.mp3` suffix so the grid reads as a nineties file listing,
 * which is this persona's whole conceit. The titles in `tracks.ts` are the
 * real release names and stay untouched.
 */
export function MusicTile({
  icon,
  label,
  onOpen,
  variant = "track",
}: {
  /** Remote album art resolves to a URL string; static icons are imports. */
  icon: string | StaticImageData;
  label: string;
  onOpen: () => void;
  variant?: "track" | "folder";
}) {
  const isTrack = variant === "track";
  // A title that already carries an extension must not gain a second one.
  const displayLabel = isTrack && !/\.\w{2,4}$/.test(label) ? `${label}.mp3` : label;

  return (
    <button
      type="button"
      onDoubleClick={onOpen}
      title={`${displayLabel} — double-click to open`}
      className="group flex w-20 cursor-pointer select-none flex-col items-center gap-1 p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
    >
      <div
        className={cn(
          "relative h-14 w-14 shrink-0 overflow-hidden transition-transform group-active:translate-y-px",
          isTrack
            ? // Bare artwork. A hairline edge and a drop shadow lift it off
              // the window without implying a surface underneath it.
              "rounded-[2px] shadow-[1px_2px_4px_rgba(0,0,0,0.55)] ring-1 ring-black/60"
            : // Bare glyph. The drop shadow is what stops a flat vector folder
              // from looking pasted on — the same lift the artwork gets, at a
              // softer weight because there is no edge here to catch it.
              "drop-shadow-[1px_2px_3px_rgba(0,0,0,0.4)]",
        )}
      >
        <Image
          src={icon}
          alt=""
          fill
          className={isTrack ? "object-cover" : "object-contain"}
          sizes="56px"
        />
      </div>

      <span className="text-center text-[11px] leading-tight text-black group-focus-visible:bg-blue-900 group-focus-visible:text-white">
        {displayLabel}
      </span>
    </button>
  );
}
