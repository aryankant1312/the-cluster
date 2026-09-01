"use client";

import { shootLocations } from "@/content/shoot-on-sight";
import { cn } from "@/lib/utils";

/**
 * SHOOT ON SIGHT — where the work was made, grouped by place.
 *
 * A PLACEHOLDER THAT IS NOT A STUB. The content list is empty and the layout
 * around it is finished: drop entries into `content/shoot-on-sight.ts` and this
 * fills in, with no edit here. What is on screen until then is an empty state
 * naming the two files to add to, because a blank panel teaches nobody what it
 * is waiting for.
 *
 * GROUPED, NOT A FLAT GRID. A location with four photographs of it is one place
 * seen four ways, and a flat wall of images loses that — which is the whole
 * difference between this window and the Cluster Wall next door.
 *
 * DATE AND CREDIT SIT WITH THE PLACE, NOT THE PICTURE. They are facts about a
 * shoot, and repeating them under every frame of the same shoot is noise. A
 * per-item credit still shows, for the frames somebody else took.
 *
 * TWO COLUMNS, AND THE RIGHT ONE IS A LOOP. Each persona has a clip that says
 * its name was here; it runs down the right-hand side while the places run
 * down the left. Both columns exist in both states — the empty one included,
 * where the loop is the only thing on screen and is the better half of it.
 */

/**
 * The persona's own "was here" loop.
 *
 * Two files rather than one with a swapped tint: they are separately shot and
 * separately lettered, and the whole point of the panel is which name is on
 * the wall.
 */
const MARK_CLIP = {
  dotm: "/videos/shoot-on-sight/dotm-was-here.mp4",
  dev: "/videos/shoot-on-sight/dev-was-here.mp4",
} as const;

/**
 * How much of the window the loop takes.
 *
 * A fraction rather than a fixed width, because this window opens fullscreen
 * now: a 420px column that reads as a panel on a laptop reads as a strip on a
 * 4K display. It stacks above the content below the `lg` breakpoint — 38% of
 * a phone is not a column.
 */
const CLIP_COLUMN = "lg:w-[38%] lg:max-w-[620px]";

export function ShootOnSightWindow({ isDotm }: { isDotm: boolean }) {
  const locations = shootLocations();
  const ground = isDotm ? "bg-[#0a0a0b] text-white" : "bg-persona-window-bg text-black";

  return (
    <div className={cn("flex h-full w-full flex-col lg:flex-row", ground)}>
      {/* ── The places ──────────────────────────────────────────────────
          `min-h-0` on a flex child that scrolls. Without it the child's
          min-content height wins over `overflow-y-auto` and the column grows
          to fit its contents instead of scrolling inside them — which on a
          fullscreen window pushes the loop off the bottom of the screen. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {locations.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center px-8 py-10 text-center">
            <div className="max-w-md">
              <p className="font-headline text-2xl uppercase tracking-[0.18em]">
                Shoot at Site
              </p>
              <p
                className={cn(
                  "long-text mt-3 text-sm leading-relaxed",
                  isDotm ? "text-white/55" : "text-black/60",
                )}
              >
                Locations, sets and the places behind the videos. Nothing here yet —
                drop media into{" "}
                <code className="font-chrome text-[13px]">public/images/shoot-on-sight/</code>{" "}
                and list it in{" "}
                <code className="font-chrome text-[13px]">src/content/shoot-on-sight.ts</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-8">
            {locations.map((group) => (
              <section key={group.location} className="mb-10 last:mb-0">
                <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-headline text-xl uppercase tracking-[0.14em]">
                    {group.location}
                  </h2>
                  <span
                    className={cn(
                      "font-chrome text-[11px] uppercase tracking-[0.2em]",
                      isDotm ? "text-white/45" : "text-black/50",
                    )}
                  >
                    {group.city}
                    {/* Written out rather than left as an ISO string:
                        `2025-06-21` is a value, not a caption. */}
                    {group.date ? ` · ${formatDate(group.date)}` : ""}
                  </span>
                </header>

                <div className="columns-2 gap-3 sm:columns-3">
                  {group.items.map((item) => (
                    <figure
                      key={item.id}
                      className="mb-3 break-inside-avoid overflow-hidden rounded-lg"
                    >
                      {/* Plain `<img>`, as on the Cluster Wall: some of this
                          will be motion, and the optimizer hands back a still
                          first frame. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt={item.alt ?? item.location}
                        loading="lazy"
                        decoding="async"
                        className="block w-full"
                      />
                      {item.credit && (
                        <figcaption
                          className={cn(
                            "px-1 pt-1.5 font-chrome text-[10px] uppercase tracking-[0.18em]",
                            isDotm ? "text-white/35" : "text-black/45",
                          )}
                        >
                          {item.credit}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── The loop ────────────────────────────────────────────────────
          A hairline between the two columns rather than a filled panel: the
          clip has its own edges, and a second frame around it reads as a
          picture of a video. The rule sits on the left on `lg` and on the top
          below it, because the columns have stacked by then and a left border
          on a full-width row is a stray vertical line. */}
      <aside
        className={cn(
          "shrink-0 border-t lg:border-t-0 lg:border-l",
          isDotm ? "border-white/12" : "border-black/12",
          CLIP_COLUMN,
        )}
      >
        {/*
          `muted` is not decoration, it is what makes `autoPlay` legal — every
          browser refuses an unmuted autoplay outright. `playsInline` is what
          stops iOS taking the clip fullscreen on its own.

          NO CONTROLS, AND `preload="metadata"`. This is wallpaper with a name
          on it rather than something to scrub, and at ~4.5MB apiece an eager
          fetch would be spent on a window most visitors never open. It costs
          nothing to be careful here: the component is behind `next/dynamic`
          and a closed window, so neither file is requested until the window
          is actually opened.

          `object-cover` on a full-height box, so the clip fills its column and
          crops rather than letterboxing — a surface, not a player with black
          bars around it.
        */}
        <video
          key={isDotm ? "dotm" : "dev"}
          src={isDotm ? MARK_CLIP.dotm : MARK_CLIP.dev}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={isDotm ? "DOTM was here" : "DEV was here"}
          className="h-[42vh] w-full object-cover lg:h-full"
        />
      </aside>
    </div>
  );
}

/**
 * `2025-06-21` → `21 Jun 2025`.
 *
 * Parsed by hand rather than through `new Date(iso)`: that constructor reads a
 * bare `YYYY-MM-DD` as UTC midnight and then renders it in the viewer's zone,
 * so anybody west of Greenwich is shown the day before.
 */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}
