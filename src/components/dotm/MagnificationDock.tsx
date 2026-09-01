/**
 * MagnificationDock — macOS-style dock with fluid mouse magnification, spring
 * physics and tooltips. Adapted from the reusable primitive and re-skinned to
 * the DOTM design system (frosted `macos-glass` chrome, persona radius/colors).
 *
 * Each item carries its own rich SVG tile as `icon`; `onClick` fires the CTA
 * (open a window, or open a social link in a new tab).
 */

"use client";

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from "framer-motion";
import React, {
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
} from "react";

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
  /**
   * The artwork is a transparent glyph, not a full-bleed plate.
   *
   * Every tile is drawn on a rounded square with a hairline ring and a drop
   * shadow, which is right for art that fills its box — it gives the tile an
   * edge. Over a mark with transparent corners that same ring draws a visible
   * outline around nothing, so the icon reads as a glyph stranded in an empty
   * box rather than as an icon. `bare` drops the plate and lets the mark float.
   */
  bare?: boolean;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
};

function DockItem({
  children,
  className = "",
  onClick,
  ariaLabel,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  );
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center cursor-pointer outline-none ${className}`}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
    >
      {Children.map(children, (child) =>
        React.isValidElement(child)
          ? cloneElement(
              child as React.ReactElement<{ isHovered?: MotionValue<number> }>,
              { isHovered },
            )
          : child,
      )}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = "", isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: -6 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          // Roughly doubled, and lifted from -top-9 to clear the magnified
          // tile beneath it: a taller label at the old offset overlapped the
          // very icon it is there to name.
          className={`${className} macos-glass pointer-events-none absolute -top-12 left-1/2 w-fit whitespace-pre rounded-md px-3 py-1.5 text-[20px] font-chrome tracking-wide text-persona-fg shadow-lg`}
          role="tooltip"
          style={{ x: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  /** See `DockItemData.bare` — drops the plate for a transparent glyph. */
  bare?: boolean;
};

function DockIcon({ children, className = "", bare = false }: DockIconProps) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-2xl ${
        bare
          ? // No ring, no shadow, and no clip: the mark IS the tile, and
            // `overflow-hidden` on a rounded box would shave the corners off a
            // glyph that was drawn to sit square in its frame.
            ""
          : "overflow-hidden shadow-[0_6px_16px_-4px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function MagnificationDock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 82,
  distance = 190,
  panelHeight = 72,
  baseItemSize = 52,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={({ pageX }) => mouseX.set(pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`${className} macos-glass flex items-end gap-3 rounded-[calc(var(--radius-window)+6px)] px-4 pb-3 pt-2 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75)]`}
      style={{ minHeight: panelHeight }}
      role="toolbar"
      aria-label="DOTM dock"
    >
      {items.map((item, index) => (
        <DockItem
          key={index}
          onClick={item.onClick}
          ariaLabel={typeof item.label === "string" ? item.label : undefined}
          className={item.className}
          mouseX={mouseX}
          spring={spring}
          distance={distance}
          magnification={magnification}
          baseItemSize={baseItemSize}
        >
          <DockIcon bare={item.bare}>{item.icon}</DockIcon>
          <DockLabel>{item.label}</DockLabel>
        </DockItem>
      ))}
    </motion.div>
  );
}

export default MagnificationDock;
