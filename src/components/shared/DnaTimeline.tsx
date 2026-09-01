"use client";

import { useCallback, useRef, useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { dnaTimeline, type Milestone } from "@/content/dna";
import { cn } from "@/lib/utils";

/**
 * A horizontal timeline the visitor physically travels through, replacing a
 * paragraph of biography.
 *
 * Position is derived from native scroll plus getBoundingClientRect rather
 * than requestAnimationFrame or ResizeObserver: scrolling is already
 * frame-driven by the browser, and reading geometry synchronously keeps the
 * active-step state correct even when no animation frames are being served.
 */
export function DnaTimeline() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const railRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  /** Whichever card's centre is nearest the rail's centre is "active". */
  const syncActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const mid = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(rail.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  }, []);

  const step = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const next = Math.min(dnaTimeline.length - 1, Math.max(0, active + dir));
    (rail.children[next] as HTMLElement | undefined)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden",
        isDotm ? "bg-[#0b0b0c] text-white" : "bg-persona-window-bg text-black",
      )}
    >
      <header className="shrink-0 px-6 pt-6 text-center">
        <h2
          className={cn(
            "font-chrome text-2xl uppercase tracking-[0.28em] sm:text-3xl",
            isDotm && "text-[#ff0033]",
          )}
        >
          The DNA of DOTM
        </h2>
        <p className={cn("mt-2 font-body text-xs", isDotm ? "text-white/45" : "text-black/50")}>
          Scroll sideways, or use the arrows
        </p>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center">
        {/* The spine, behind the cards. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-1/2 h-px",
            isDotm ? "bg-white/12" : "bg-black/15",
          )}
        />

        <ol
          ref={railRef}
          onScroll={syncActive}
          className={cn(
            "flex h-full w-full snap-x snap-mandatory items-center gap-6 overflow-x-auto px-[10%] py-6",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {dnaTimeline.map((m, i) => (
            <Card key={m.id} milestone={m} isDotm={isDotm} isActive={i === active} index={i} />
          ))}
        </ol>
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-4 px-6 pb-6">
        <NavButton
          onClick={() => step(-1)}
          disabled={active === 0}
          isDotm={isDotm}
          label="Previous milestone"
        >
          ←
        </NavButton>
        <p
          className={cn(
            "font-chrome text-xs tabular-nums",
            isDotm ? "text-white/50" : "text-black/55",
          )}
        >
          {active + 1} / {dnaTimeline.length}
        </p>
        <NavButton
          onClick={() => step(1)}
          disabled={active === dnaTimeline.length - 1}
          isDotm={isDotm}
          label="Next milestone"
        >
          →
        </NavButton>
      </footer>
    </div>
  );
}

function Card({
  milestone,
  isDotm,
  isActive,
  index,
}: {
  milestone: Milestone;
  isDotm: boolean;
  isActive: boolean;
  index: number;
}) {
  const isNow = milestone.kind === "now";
  return (
    <li
      aria-current={isActive ? "step" : undefined}
      className={cn(
        "relative z-10 flex w-64 shrink-0 snap-center flex-col justify-center px-5 py-6 transition-opacity duration-300 sm:w-72",
        isActive ? "opacity-100" : "opacity-45",
        isDotm
          ? cn(
              "rounded-[var(--radius-window)] bg-white/5 ring-1",
              isActive ? "ring-[#ff0033]" : "ring-white/10",
            )
          : cn("win98-border", isActive ? "bg-persona-surface" : "bg-persona-surface-alt"),
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "font-chrome text-[10px] uppercase tracking-[0.24em]",
            isDotm ? "text-white/40" : "text-black/45",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        {milestone.year && <span className="font-chrome text-sm tabular-nums">{milestone.year}</span>}
      </div>

      {milestone.metric && (
        <p
          className={cn(
            "mt-3 font-chrome text-3xl tabular-nums",
            isDotm && !isNow && "text-[#ff0033]",
          )}
        >
          {milestone.metric}
        </p>
      )}

      <h3 className="mt-2 font-chrome text-base uppercase tracking-[0.12em]">{milestone.label}</h3>
      <p
        className={cn(
          "mt-2 font-body text-xs leading-relaxed",
          isDotm ? "text-white/60" : "text-black/65",
        )}
      >
        {milestone.detail}
      </p>
    </li>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  isDotm,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  isDotm: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center font-chrome text-lg transition disabled:opacity-30",
        isDotm
          ? "rounded-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
          : "win98-border win98-press bg-persona-surface text-black",
      )}
    >
      {children}
    </button>
  );
}

export default DnaTimeline;
