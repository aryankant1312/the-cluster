"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { FlowsTimeline } from "@/components/shared/FlowsTimeline";
import { StoryWall } from "@/components/shared/StoryWall";
import { cn } from "@/lib/utils";

/**
 * THE STORY WINDOW — two posts, two tabs, one window.
 *
 * The Story used to be a single surface, because there was a single carousel
 * to put on it. There are two now, and they are not two halves of one thing:
 * Finding Peace is five films about a record and travels sideways; The Four
 * Flows is a cover and four verses and travels down. Stacking them on one
 * scroll would have made the second read as a footnote to the first, and would
 * have handed the visitor two different scroll axes on one surface.
 *
 * So: tabs. Real ones — `role="tablist"` with arrow-key navigation and a
 * roving tabindex, because a row of buttons that merely looks like tabs is a
 * row of buttons as far as a screen reader is concerned.
 *
 * Both panels stay mounted once opened, hidden rather than unmounted.
 * `StoryWall` measures its own track on mount to work out how far it can
 * travel, and a panel that unmounted on every tab switch would re-measure at
 * zero width and lose its place each time you came back.
 */

type TabId = "wall" | "flows";

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "wall", label: "Finding Peace", hint: "The record, one slide at a time" },
  { id: "flows", label: "The Four Flows", hint: "Four verses on a line" },
];

export function StoryWindow() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const [active, setActive] = useState<TabId>("wall");
  const [seen, setSeen] = useState<Set<TabId>>(() => new Set<TabId>(["wall"]));
  const baseId = useId();

  const open = (id: TabId) => {
    setActive(id);
    setSeen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  /** Left/right walk the tabs, home/end jump the ends — the WAI-ARIA pattern. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === active);
    let next = i;
    if (event.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    open(TABS[next].id);
    document.getElementById(`${baseId}-tab-${TABS[next].id}`)?.focus();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black">
      <div
        role="tablist"
        aria-label="The Story"
        onKeyDown={onKeyDown}
        className={cn(
          "flex shrink-0 items-stretch gap-1 px-3 pt-2.5",
          isDotm ? "border-b border-white/10 bg-black/60" : "border-b border-black/30 bg-[#c0c0c0]",
        )}
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              // Roving tabindex: one tab stop for the whole set, arrows inside.
              tabIndex={selected ? 0 : -1}
              onClick={() => open(tab.id)}
              title={tab.hint}
              className={cn(
                "relative min-h-[44px] px-4 pb-2.5 pt-1.5 text-left transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                // `cn` takes a flat list of strings, so each persona's rules
                // are one string rather than a nested array.
                isDotm
                  ? "font-chrome text-[12px] uppercase tracking-[0.24em] focus-visible:ring-[#ff0033] focus-visible:ring-offset-black"
                  : "font-chrome text-[15px] tracking-wide focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-[#c0c0c0]",
                isDotm
                  ? selected
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                  : selected
                    ? "win98-border bg-[#d8d8d8] text-black"
                    : "text-black/60 hover:text-black",
              )}
            >
              {tab.label}
              {/* The selected marker is a bar, not only a colour change, so the
                  state still reads for someone who cannot separate 40% white
                  from 100% white. */}
              {isDotm && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-[2px] transition-opacity",
                    selected ? "bg-[#ff0033] opacity-100" : "opacity-0",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={`${baseId}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={tab.id !== active}
            className="h-full w-full"
          >
            {/* Rendered on first visit and kept afterwards — see the note at
                the top about StoryWall re-measuring itself at zero width. */}
            {seen.has(tab.id) && (tab.id === "wall" ? <StoryWall /> : <FlowsTimeline />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StoryWindow;
