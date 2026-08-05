"use client";

import { useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { project } from "@/lib/geo";
import type { Show } from "@/content/types";
import { cn } from "@/lib/utils";

const MERIDIANS = Array.from({ length: 13 }, (_, i) => -180 + i * 30);
const PARALLELS = Array.from({ length: 7 }, (_, i) => -90 + i * 30);

export function WorldMap({ shows }: { shows: Show[] }) {
  const { persona, locale } = usePersona();
  const [active, setActive] = useState<Show | null>(null);

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 1000 500" className="w-full h-auto">
        <rect
          x={0}
          y={0}
          width={1000}
          height={500}
          className={persona === "dev" ? "fill-persona-surface-alt" : "fill-white/5"}
        />
        {MERIDIANS.map((lon) => {
          const [x] = project([lon, 0]);
          return (
            <line
              key={lon}
              x1={x}
              y1={0}
              x2={x}
              y2={500}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
              className="text-fg-muted"
            />
          );
        })}
        {PARALLELS.map((lat) => {
          const [, y] = project([0, lat]);
          return (
            <line
              key={lat}
              x1={0}
              y1={y}
              x2={1000}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
              className="text-fg-muted"
            />
          );
        })}

        {shows.map((show) => {
          const [x, y] = project(show.mapCoords);
          return (
            <g
              key={show.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onMouseEnter={() => setActive(show)}
              onMouseLeave={() => setActive((prev) => (prev?.id === show.id ? null : prev))}
            >
              {!show.isPast && (
                <circle r={9} className="fill-danger/40 animate-ping" />
              )}
              <circle
                r={5}
                className={cn(show.isPast ? "fill-fg-muted" : "fill-danger")}
                stroke="black"
                strokeWidth={0.5}
              />
              {show.isPast && (
                <text
                  x={0}
                  y={1.5}
                  textAnchor="middle"
                  fontSize={5}
                  className="fill-black select-none"
                >
                  ✓
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {active && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-2 px-3 py-2 text-xs font-body",
            persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-lg",
          )}
        >
          <p className="font-chrome text-sm">{active.city[locale]}</p>
          <p className="text-fg-muted">
            {active.venue ?? "VENUE TBD"} — {active.date ?? "2027, DATE TBD"}
          </p>
        </div>
      )}
    </div>
  );
}
