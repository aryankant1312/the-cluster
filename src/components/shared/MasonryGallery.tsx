"use client";

/**
 * MasonryGallery — GSAP-powered masonry with cinematic blur-to-focus entrance,
 * directional entry and hover states. Adapted from the supplied component to
 * this codebase (project `cn`, local images). Used inside the Cluster Wall.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const get = () => {
    if (typeof window === "undefined") return defaultValue;
    const match = queries.findIndex((q) => window.matchMedia(q).matches);
    return values[match] !== undefined ? values[match] : defaultValue;
  };

  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach((q) => window.matchMedia(q).addEventListener("change", handler));
    return () => queries.forEach((q) => window.matchMedia(q).removeEventListener("change", handler));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]);

  return value;
};

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setSize({ width: r.width, height: r.height });
    };
    measure(); // synchronous initial read
    // re-measure after the first frame in case layout wasn't settled at mount
    // (robust even if ResizeObserver stays quiet)
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return [ref, size] as const;
};

const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        }),
    ),
  );
};

export interface MasonryItem {
  id: string;
  img: string;
  url?: string;
  height: number;
  title?: string;
}

interface GridItem extends MasonryItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MasonryGalleryProps {
  items: MasonryItem[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: "bottom" | "top" | "left" | "right" | "center" | "random";
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
  className?: string;
  itemClassName?: string;
  onItemClick?: (item: MasonryItem) => void;
}

export function MasonryGallery({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.05,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
  className,
  itemClassName,
  onItemClick,
}: MasonryGalleryProps) {
  const columns = useMedia(
    ["(min-width: 1500px)", "(min-width: 1000px)", "(min-width: 600px)", "(min-width: 400px)"],
    [5, 4, 3, 2],
    1,
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [imagesReady, setImagesReady] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setImagesReady(true);
      }
    };
    preloadImages(items.map((i) => i.img)).then(finish);
    // fallback: never let the layout stall on a stuck image load
    const t = setTimeout(finish, 1500);
    return () => clearTimeout(t);
  }, [items]);

  const { grid, containerHeight } = useMemo(() => {
    if (!width) return { grid: [] as GridItem[], containerHeight: 0 };

    const colHeights = new Array(columns).fill(0);
    const gap = 20;
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;

    const gridItems = items.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + gap);
      const height = (child.height / 400) * columnWidth;
      const y = colHeights[col];
      colHeights[col] += height + gap;
      return { ...child, x, y, w: columnWidth, h: height };
    });

    return { grid: gridItems, containerHeight: Math.max(...colHeights) };
  }, [columns, items, width]);

  // Layout (left/top/width/height) is driven by React inline styles from `grid`;
  // GSAP only handles the cinematic entrance (opacity + blur + rise) once, so a
  // stalled measurement can never leave tiles unsized.
  useLayoutEffect(() => {
    if (!imagesReady || !grid.length || hasMounted.current) return;
    const scope = containerRef.current;
    if (!scope) return;

    grid.forEach((item, index) => {
      const element = scope.querySelector<HTMLElement>(`[data-key="${item.id}"]`);
      if (!element) return;
      gsap.fromTo(
        element,
        { opacity: 0, y: 60, ...(blurToFocus && { filter: "blur(16px)" }) },
        {
          opacity: 1,
          y: 0,
          ...(blurToFocus && { filter: "blur(0px)" }),
          duration: Math.max(duration, 0.9),
          ease,
          delay: index * stagger,
        },
      );
    });

    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease]);

  const handleMouseEnter = (element: HTMLElement) => {
    if (scaleOnHover) gsap.to(element, { scale: hoverScale, duration: 0.4, ease: "power2.out" });
    if (colorShiftOnHover) {
      const overlay = element.querySelector(".color-overlay");
      if (overlay) gsap.to(overlay, { opacity: 1, duration: 0.4 });
    }
  };

  const handleMouseLeave = (element: HTMLElement) => {
    if (scaleOnHover) gsap.to(element, { scale: 1, duration: 0.4, ease: "power2.out" });
    if (colorShiftOnHover) {
      const overlay = element.querySelector(".color-overlay");
      if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.4 });
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ height: containerHeight, minHeight: "300px" }}
    >
      {grid.map((item) => (
        <div
          key={item.id}
          data-key={item.id}
          className={cn(
            "absolute overflow-hidden cursor-pointer rounded-lg ring-1 ring-white/10",
            "shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] transition-shadow",
            itemClassName,
          )}
          style={{
            position: "absolute",
            left: item.x,
            top: item.y,
            width: item.w,
            height: item.h,
            willChange: "transform, opacity, filter",
          }}
          onClick={() => {
            if (onItemClick) onItemClick(item);
            else if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
          }}
          onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
          onMouseLeave={(e) => handleMouseLeave(e.currentTarget)}
        >
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${item.img})` }}
          >
            {colorShiftOnHover && (
              <div className="color-overlay absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/30 to-white/5 opacity-0 pointer-events-none" />
            )}
          </div>
          {item.title && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-[11px] font-medium uppercase tracking-wider">{item.title}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default MasonryGallery;
