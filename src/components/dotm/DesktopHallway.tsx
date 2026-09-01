"use client";

/**
 * DesktopHallway — the DOTM desktop as a 3D "hallway track". Landscape track
 * cards hang as art frames on the left & right, receding along the Z axis into
 * a red-lit vanishing point. Scrolling walks the viewer forward; the next card
 * on each side is progressively revealed. No opacity fades (cards are opaque —
 * they simply move past and are hard-hidden). Clicking a frame fires `onSelect`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { trackCards, type TrackCard } from "@/content/track-cards";

const FRAME_W = 320;
const FRAME_H = 180; // 16:9 landscape
const PAIR_GAP_Z = 340; // spacing between pairs along Z (dense receding stack)
const PAST_Z = 260; // once a frame comes this far toward the viewer, hide it
const MAX_Z = (Math.ceil(trackCards.length / 2) - 1) * PAIR_GAP_Z + 520;

// pair the flat card list into [left, right] rows
const PAIRS: Array<{ left?: TrackCard; right?: TrackCard }> = [];
for (let i = 0; i < trackCards.length; i += 2) {
  PAIRS.push({ left: trackCards[i], right: trackCards[i + 1] });
}

// ambient dust motes (fixed seeds so they don't jump on re-render)
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61.7) % 100,
  top: (i * 37.3) % 100,
  gold: i % 3 === 0,
  size: 1 + (i % 3),
  delay: (i % 7) * 0.6,
}));

export function DesktopHallway({ onSelect }: { onSelect: (card: TrackCard) => void }) {
  // Z position along the hallway. Driven directly by scroll and eased by a CSS
  // cubic-bezier transition on the track (heavy, physics-feeling) — no rAF loop.
  const [z, setZ] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const nudge = useCallback((delta: number) => {
    setZ((prev) => Math.min(MAX_Z, Math.max(0, prev + delta)));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      nudge(e.deltaY * 1.05);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") nudge(300);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") nudge(-300);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [nudge]);

  const progress = Math.min(1, z / MAX_Z);

  return (
    <div
      ref={viewportRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{
        perspective: "2400px",
        perspectiveOrigin: "50% 50%",
        background: "radial-gradient(circle at 50% 42%, #2a0008 0%, #12010a 55%, #000 100%)",
      }}
    >
      {/* ambient motes */}
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full hallway-mote"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: m.size,
            height: m.size,
            background: m.gold ? "#D4AF37" : "#ffffff",
            opacity: m.gold ? 0.14 : 0.06,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}

      {/* 3D track */}
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: `translateZ(${z}px)`,
          transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {PAIRS.map((pair, i) => {
          const baseZ = -i * PAIR_GAP_Z;
          const eff = z + baseZ;
          const hidden = eff > PAST_Z; // walked past the viewer
          const clickable = !hidden && eff > -MAX_Z;
          return (
            <div key={i}>
              {pair.left && (
                <Frame
                  card={pair.left}
                  side="left"
                  baseZ={baseZ}
                  hidden={hidden}
                  clickable={clickable}
                  onSelect={onSelect}
                />
              )}
              {pair.right && (
                <Frame
                  card={pair.right}
                  side="right"
                  baseZ={baseZ}
                  hidden={hidden}
                  clickable={clickable}
                  onSelect={onSelect}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* floor glow */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "linear-gradient(to top, rgba(212,175,55,0.05), rgba(180,0,26,0.05), transparent)",
        }}
      />

      {/* scroll hint + progress */}
      <div className="pointer-events-none absolute inset-x-0 bottom-28 flex flex-col items-center gap-2">
        <span
          className="font-chrome text-[10px] tracking-[0.4em] text-white/50 uppercase"
          style={{ opacity: progress > 0.02 ? 0 : 1, transition: "opacity .4s" }}
        >
          Scroll to walk
        </span>
        <div className="h-[2px] w-40 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-persona-accent" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function Frame({
  card,
  side,
  baseZ,
  hidden,
  clickable,
  onSelect,
}: {
  card: TrackCard;
  side: "left" | "right";
  baseZ: number;
  hidden: boolean;
  clickable: boolean;
  onSelect: (card: TrackCard) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      className="hallway-frame group absolute block overflow-hidden"
      style={{
        top: "50%",
        marginTop: -FRAME_H / 2,
        [side]: "7%",
        width: FRAME_W,
        height: FRAME_H,
        transform: `translateZ(${baseZ}px) rotateY(${side === "left" ? 38 : -38}deg)`,
        transformStyle: "preserve-3d",
        visibility: hidden ? "hidden" : "visible",
        pointerEvents: clickable ? "auto" : "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.img}
        alt=""
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        draggable={false}
      />
    </button>
  );
}
