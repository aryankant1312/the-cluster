"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { desktopDragBounds } from "@/components/window-manager/window-geometry";
import type { StickyNote } from "./window-content/NotesApp";

/**
 * A posted sticky note on the DOTM desktop.
 *
 * Draggable anywhere except under the dock, and resizable from its
 * bottom-right corner.
 *
 * Resizing uses the native CSS `resize` affordance rather than a hand-rolled
 * pointer handler: it is the control the platform already provides, it comes
 * with keyboard and assistive-tech support for free, and it cannot end up
 * fighting framer-motion over the same pointer.
 *
 * Dragging is bound to the header strip via `dragControls` instead of the
 * whole card, which leaves the note's text selectable and keeps the resize
 * corner from being swallowed by the drag gesture.
 */
export function StickyNoteCard({
  note,
  onDismiss,
}: {
  note: StickyNote;
  onDismiss?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const [bounds, setBounds] = useState<ReturnType<typeof desktopDragBounds>>(undefined);

  useEffect(() => {
    const measure = () => setBounds(desktopDragBounds(ref.current));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <motion.div
      ref={ref}
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={bounds}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{
        position: "absolute",
        left: `${note.x}%`,
        top: `${note.y}%`,
        zIndex: 250,
        width: 180,
        height: 150,
        minWidth: 132,
        minHeight: 96,
        resize: "both",
        overflow: "auto",
      }}
      className="-rotate-2 rounded-sm bg-[#fff9c4] text-black shadow-[0_10px_28px_-8px_rgba(0,0,0,0.8)]"
    >
      <div
        onPointerDown={(event) => {
          // Recompute on every grab so a resized note gets correct limits.
          setBounds(desktopDragBounds(ref.current));
          controls.start(event);
        }}
        className="sticky top-0 flex h-6 cursor-move items-center justify-between bg-black/10 px-2 select-none"
      >
        <span className="font-chrome text-[9px] uppercase tracking-[0.2em] text-black/50">
          Note
        </span>
        <div
          className="flex items-center gap-1.5"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span aria-hidden="true" className="text-[10px] leading-none text-black/30">
            ⠿
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(note.id);
              }}
              aria-label="Delete note"
              title="Delete note"
              className="flex h-4 w-4 items-center justify-center rounded text-black/40 hover:bg-black/10 hover:text-black focus:outline-none text-[11px] leading-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <p className="whitespace-pre-wrap break-words p-3 text-xs leading-relaxed">
        {note.text}
      </p>
    </motion.div>
  );
}
