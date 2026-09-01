"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SilhouetteLayer<T extends string> {
  id: T;
  /** Transparent-background PNG whose opaque pixels are the hoverable region. */
  src: string;
}

/** Alpha at or above this counts as "inside the character". */
const ALPHA_THRESHOLD = 24;
/** Alpha masks don't need full resolution; this is plenty for body outlines. */
const SAMPLE_WIDTH = 640;

interface Mask<T extends string> {
  id: T;
  alpha: Uint8ClampedArray;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Hit-tests the cursor against the alpha channel of one or more silhouette
 * PNGs so hover follows the character outline rather than a rectangle.
 *
 * The images are rendered with `object-cover object-center`, so the same
 * cover transform is inverted here to map viewport coordinates back into
 * image space. Listens on window rather than through React's synthetic
 * events so the whole viewport is tracked regardless of what is stacked on
 * top of the images.
 */
export function useSilhouetteHitTest<T extends string>(
  containerRef: React.RefObject<HTMLElement | null>,
  layers: SilhouetteLayer<T>[],
) {
  const [hovered, setHovered] = useState<T | null>(null);
  const masksRef = useRef<Mask<T>[]>([]);

  // Decode each PNG once and keep only its alpha channel.
  useEffect(() => {
    let cancelled = false;

    Promise.all(
      layers.map(
        (layer) =>
          new Promise<Mask<T> | null>((resolve) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const width = SAMPLE_WIDTH;
              const height = Math.max(
                1,
                Math.round((img.naturalHeight / img.naturalWidth) * SAMPLE_WIDTH),
              );
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0, width, height);
              resolve({
                id: layer.id,
                alpha: ctx.getImageData(0, 0, width, height).data,
                width,
                height,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
              });
            };
            img.onerror = () => resolve(null);
            img.src = layer.src;
          }),
      ),
    ).then((masks) => {
      if (!cancelled) {
        masksRef.current = masks.filter((m): m is Mask<T> => m !== null);
      }
    });

    return () => {
      cancelled = true;
    };
    // `layers` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Which silhouette, if any, sits under this viewport point. */
  const hitTestAt = useCallback(
    (clientX: number, clientY: number): T | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const px = clientX - rect.left;
      const py = clientY - rect.top;
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return null;

      for (const mask of masksRef.current) {
        // Invert `object-cover`: the image is scaled to cover the box, then
        // centred, so the overflow is split evenly on both axes.
        const scale = Math.max(
          rect.width / mask.naturalWidth,
          rect.height / mask.naturalHeight,
        );
        const offsetX = (rect.width - mask.naturalWidth * scale) / 2;
        const offsetY = (rect.height - mask.naturalHeight * scale) / 2;

        const imageX = (px - offsetX) / scale;
        const imageY = (py - offsetY) / scale;
        if (
          imageX < 0 ||
          imageY < 0 ||
          imageX >= mask.naturalWidth ||
          imageY >= mask.naturalHeight
        ) {
          continue;
        }

        const sx = Math.min(
          mask.width - 1,
          Math.floor((imageX / mask.naturalWidth) * mask.width),
        );
        const sy = Math.min(
          mask.height - 1,
          Math.floor((imageY / mask.naturalHeight) * mask.height),
        );

        if (mask.alpha[(sy * mask.width + sx) * 4 + 3] >= ALPHA_THRESHOLD) {
          return mask.id;
        }
      }
      return null;
    },
    [containerRef],
  );

  /**
   * Pointer sampling, coalesced to one hit-test per frame.
   *
   * WHY THIS WAS THE LAG. `mousemove` fires as fast as the device reports —
   * 60 to 1000 times a second on a high-polling mouse — and the old handler
   * ran a `getBoundingClientRect`, an alpha lookup and a `setState` on every
   * one of them. `getBoundingClientRect` forces a synchronous layout, so the
   * cost was paid against a main thread that is already decoding a looping
   * 1080p video, and `setState` re-rendered a page carrying four full-viewport
   * images. The highlight was not slow to animate; the browser was too busy to
   * start it.
   *
   * One `requestAnimationFrame` per burst fixes both: the hit-test runs at
   * most once per painted frame, and it runs at the point in the frame where
   * layout is already settled, so the forced reflow costs nothing.
   *
   * THE FUNCTIONAL UPDATE IS NOT DECORATION. Moving the cursor inside one
   * silhouette produces the same answer frame after frame; returning `prev`
   * unchanged makes React bail out of the re-render entirely, so a slow drag
   * across the character costs nothing after the first frame.
   */
  useEffect(() => {
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { x, y } = pending;
      pending = null;
      const next = hitTestAt(x, y);
      setHovered((prev) => (prev === next ? prev : next));
    };

    const onMove = (e: MouseEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const onLeave = () => setHovered(null);

    // `passive` — this handler never calls preventDefault, and saying so lets
    // the browser stop waiting to find out before it scrolls.
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [hitTestAt]);

  return { hovered, hitTestAt };
}
