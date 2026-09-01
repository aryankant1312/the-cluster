"use client";

import { useEffect, useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { METRIC_CAPTIONS, METRIC_PERIOD, formatIndian } from "@/content/metrics";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

/**
 * The two figures that count up on both desktops.
 *
 * Layout is shared: the desktop is split vertically down the middle and each
 * figure sits at the top of its own half, centred within it. That reads as a
 * pair of column headings rather than as two labels flung into opposite
 * corners — which is what `justify-between` produced, with the DEV tiles
 * pinned so far apart they stopped looking related.
 *
 * The two personas differ only in treatment. DEV keeps a small raised Win98
 * plate; DOTM sets bare type straight on the wallpaper, because a box there
 * fought the artwork.
 *
 * An unset figure renders an em dash rather than a zero.
 */

interface MetricsPayload {
  cluster: number | null;
  mediaOutreach: number | null;
}

export function DesktopMetrics() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const [data, setData] = useState<MetricsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/metrics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((payload: MetricsPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        // Stay unmounted rather than render zeroes.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  return (
    <div
      aria-label="Reach"
      // Two equal columns; each figure centres in its own half. `top-2` keeps
      // the block clear of the icon column in DEV (which starts at 104px) and
      // of the 666 coin in DOTM.
      className="pointer-events-none absolute inset-x-0 top-2 z-[60] grid grid-cols-2"
    >
      {/* Cluster count runs without the period line; cluster outreach keeps it.
          The line is a qualifier on the figure above it, so it belongs only
          where that figure really is read over a window. */}
      <Figure
        caption={METRIC_CAPTIONS.cluster}
        target={data.cluster}
        isDotm={isDotm}
        period={null}
      />
      <Figure
        caption={METRIC_CAPTIONS.mediaOutreach}
        target={data.mediaOutreach}
        isDotm={isDotm}
        period={METRIC_PERIOD}
      />
    </div>
  );
}

function Figure({
  caption,
  target,
  isDotm,
  period,
}: {
  caption: string;
  target: number | null;
  isDotm: boolean;
  /** The window the figure is read over, or `null` to run the caption alone. */
  period: string | null;
}) {
  const value = useCountUp(target);
  const display =
    value === null ? null : formatIndian(Math.round(value));

  return (
    <div className="flex justify-center px-4">
      {/* NO PLATE ON EITHER SIDE NOW. DEV kept a raised Win98 tile while its
          wallpaper was a still photograph; the desktop is a moving picture
          now, and two opaque grey boxes on it read as things stuck over the
          video rather than as part of the desktop.

          Both personas therefore set the figures bare, and what makes that
          legible is the treatment every DEV desktop label already uses: white
          type with a hard dark shadow under it. Sizes are untouched — DEV's
          figures are the same 3xl/4xl they have always been. */}
      <div className="select-none text-center">
        <p
          className={cn(
            "font-headline leading-none tabular-nums text-white",
            isDotm
              ? "text-4xl font-black sm:text-5xl lg:text-6xl"
              : "text-3xl font-bold sm:text-4xl",
          )}
          style={{
            textShadow: isDotm
              ? "0 4px 22px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)"
              : // Tighter and harder than DOTM's. DEV's ground is a bright sky
                // rather than a dark room, so the type needs a crisp edge to
                // sit against, not a soft bloom.
                "1px 1px 0 rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.75)",
          }}
        >
          {display === null ? (
            <span
              className={isDotm ? "text-white/35" : "text-black/35"}
              title="Set this figure in /admin"
            >
              —
            </span>
          ) : (
            display
          )}
        </p>

        {/* The name of the figure, and the loudest piece of type on the plate
            after the number itself. Set in the display face rather than the
            chrome one, and wide-tracked, so it reads as a caption card under
            the figure instead of as a system label parked near it.

            IT USED TO BE FLANKED BY HAIRLINES, one each side. At caption size
            they did not read as rules framing a plate; they read as two
            stray dashes bracketing the words — "— CLUSTER COUNT —" — which is
            punctuation nobody wrote. The caption carries itself. */}
        <div
          className={cn(
            "mx-auto mt-2.5 flex items-center justify-center",
            isDotm ? "max-w-[16ch]" : "max-w-[18ch]",
          )}
        >
          <p
            className={cn(
              "whitespace-nowrap font-headline uppercase leading-none",
              isDotm
                ? "text-[13px] font-black tracking-[0.2em] text-white sm:text-sm"
                : "text-[13px] font-bold tracking-[0.14em] text-white sm:text-[15px]",
            )}
            style={{
              textShadow: isDotm
                ? "0 2px 10px rgba(0,0,0,1), 0 0 22px rgba(255,47,77,0.45)"
                : "1px 1px 0 rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7)",
            }}
          >
            {caption}
          </p>
        </div>

        {period && (
          <p
            className={cn(
              "mt-1.5 font-chrome lowercase leading-none",
              isDotm
                ? "text-[10px] font-normal tracking-[0.22em] text-white/65 drop-shadow-[0_2px_6px_rgba(0,0,0,1)]"
                : "text-[11px] font-normal tracking-[0.12em] text-white/80 drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)]",
            )}
          >
            {period}
          </p>
        )}
      </div>
    </div>
  );
}

export default DesktopMetrics;
