"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

export function DesktopIcon({
  label,
  icon,
  onOpen,
  initial,
  style,
  className,
  iconBoxVariant = "white",
  size = 46,
}: {
  label: string;
  icon: ReactNode;
  onOpen?: () => void;
  initial: { x: number; y: number };
  style?: CSSProperties;
  /** merged onto the button itself - use for transition/opacity/scale classes so they share the same containing block as `style`'s position offsets, instead of a wrapping div (which would create a new containing block and break right/top/bottom anchoring) */
  className?: string;
  /** white = default win98 chip (most icons); black = inverted chip (Shows); none = icon floats bare on the wallpaper (Music, Recycle Bin) */
  iconBoxVariant?: "white" | "black" | "none";
  /** icon box side length in px; most icons share the 46 default, a couple opt into a bigger, clearer thumbnail */
  size?: number;
}) {
  const [selected, setSelected] = useState(false);
  const isDraggingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(initial.x);
  const y = useMotionValue(initial.y);
  const [bounds, setBounds] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const measure = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = document.querySelector(".persona-topbar")?.getBoundingClientRect().bottom ?? 0;
    const bottom =
      document.querySelector("[data-dev-taskbar]")?.getBoundingClientRect().top ??
      window.innerHeight;
    const left = x.get() - rect.left;
    const upper = y.get() + top - rect.top;
    const next = {
      left,
      right: Math.max(left, x.get() + window.innerWidth - rect.right),
      top: upper,
      bottom: Math.max(upper, y.get() + bottom - rect.bottom),
    };
    setBounds(next);
    x.set(Math.max(next.left, Math.min(next.right, x.get())));
    y.set(Math.max(next.top, Math.min(next.bottom, y.get())));
  };
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    [
      buttonRef.current,
      document.querySelector(".persona-topbar"),
      document.querySelector("[data-dev-taskbar]"),
    ].forEach((element) => {
      if (element) observer.observe(element);
    });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    // Motion values and the DOM measurements remain stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.button
      type="button"
      drag
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 520, bounceDamping: 36 }}
      ref={buttonRef}
      dragElastic={0}
      dragConstraints={bounds}
      onPointerDown={() => {
        measure();
        setSelected(true);
      }}
      onDragStart={() => {
        isDraggingRef.current = true;
        setSelected(true);
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      }}
      onClick={() => {
        if (isDraggingRef.current) return;
        setSelected(true);
      }}
      onBlur={() => setSelected(false)}
      onDoubleClick={() => {
        if (isDraggingRef.current) return;
        onOpen?.();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onOpen?.();
      }}
      aria-pressed={selected}
      style={{ position: "absolute", ...style, x, y }}
      className={cn(
        "flex touch-none flex-col items-center gap-1 w-[104px] py-2 select-none cursor-grab active:cursor-grabbing focus:outline-none",
        selected && "bg-blue-900/40",
        className,
      )}
    >
      <div
        style={{ width: size, height: size }}
        className={cn(
          "pointer-events-none flex items-center justify-center overflow-hidden shrink-0",
          iconBoxVariant === "white" &&
            "win98-border bg-white/90 shadow-[1px_2px_3px_rgba(0,0,0,0.5)]",
          iconBoxVariant === "black" &&
            "win98-border bg-black shadow-[1px_2px_3px_rgba(0,0,0,0.5)]",
        )}
      >
        {icon}
      </div>
      {/* One step up from `text-xs`, and no further. This briefly ran at
          `text-2xl` and the desktop read as a mock-up at 150% zoom — the
          labels came out wider than the icons they name. */}
      <span className="pointer-events-none font-chrome text-white text-sm text-center leading-tight drop-shadow-[1px_1px_0_#000] max-w-[96px]">
        {label}
      </span>
    </motion.button>
  );
}
