"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clusterWallTiles } from "@/content/cluster-wall.generated";
import { cn } from "@/lib/utils";

/**
 * THE WALL — a field of moving images, edge to edge.
 *
 * Modelled on eyecannndy.com's landing page: a dense masonry of looping clips
 * at their own proportions, tops aligned, bottoms ragged, with a name that
 * arrives on hover and is otherwise out of the way. The images are the page.
 * There is no hero, no heading and no introduction, because a wall of moving
 * pictures explains itself faster than a sentence about it would.
 *
 * PLAIN `<img>`, NOT `next/image`. This is not an oversight and must not be
 * "fixed". The optimizer re-encodes what it is given, and a GIF that comes out
 * the other side as a still WebP is a GIF that has stopped moving — the whole
 * point of the wall, silently lost, on a surface where nothing would look
 * broken. `unoptimized` would also work, but then `next/image` is doing
 * nothing except adding a wrapper.
 *
 * THE MOVING TILES ARE `<video>`, NOT GIF. See the note in
 * `scripts/build-cluster-wall.mjs`: the clips are phone video, a GIF of one is
 * enormous and — decisively — silent, and the speaker control below has to
 * have something to turn on. Muted, looping, `playsInline`, and playing only
 * while on screen, they read exactly as GIFs and keep their sound.
 *
 * CSS COLUMNS, NOT A JS MASONRY. `column-count` already does exactly this
 * layout: fill top to bottom, break to the next column, keep every tile whole.
 * A measured layout would need every image's height before it could place
 * anything — either a blocking decode pass or a first frame in the wrong
 * arrangement — and would have to re-run on every resize. The browser does it
 * per frame, for free.
 *
 * SPACE IS RESERVED FROM THE MANIFEST. Each tile carries the intrinsic size
 * read off the file header at build time, applied as an `aspect-ratio`, so the
 * columns reach their final shape before a single byte of media arrives.
 * Without it the wall reflows as each file lands — the exact layout shift the
 * generated manifest exists to prevent.
 */

interface Tally {
  up: number;
  down: number;
}

type Position = 1 | -1 | 0;

export function ClusterWallGrid({ isDotm }: { isDotm: boolean }) {
  /**
   * Which tile is under the pointer.
   *
   * Held in state rather than left to `group-hover`, because focus has to
   * light the same controls a pointer does and a keyboard has no hover. One id
   * is enough: only one tile can be under the pointer at a time.
   */
  const [active, setActive] = useState<string | null>(null);

  const [counts, setCounts] = useState<Record<string, Tally>>({});
  const [mine, setMine] = useState<Record<string, Position>>({});

  /**
   * THE ORDER WAITS FOR THE SCORES, which is why this flag exists.
   *
   * The wall is arranged best-first and the scores arrive over the network a
   * moment after this mounts. Drawing the manifest order first and re-sorting
   * on arrival would reshuffle twenty-three tiles in front of somebody who had
   * already started looking at them — and because the layout is CSS columns,
   * every tile after the first change moves with it. Waiting one request costs
   * a beat of black on a surface that is black anyway.
   *
   * Set on failure too: a wall that cannot reach the API still draws, in
   * whatever order the manifest happens to be in.
   */
  const [ordered, setOrdered] = useState(false);

  /**
   * ONE TILE MAKES SOUND AT A TIME, and it is held here rather than per tile.
   *
   * Twenty-five clips that each unmute independently is twenty-five clips
   * playing at once the moment somebody is curious twice — which is not a wall,
   * it is a noise. Holding the id centrally means turning one on turns the
   * previous one off, with no coordination between siblings.
   */
  const [audible, setAudible] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/wall/votes", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as {
          counts: Record<string, Tally>;
          mine: Record<string, Position>;
        };
        if (cancelled) return;
        setCounts(body.counts ?? {});
        setMine(body.mine ?? {});
      } catch {
        // The wall draws without its numbers. A tally that cannot be read is
        // not a reason to fail the window it is written on.
      } finally {
        if (!cancelled) setOrdered(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Best first.
   *
   * NET SCORE, NOT RAW UPVOTES. A tile with two thousand up and eighteen
   * hundred down is contested, not loved, and putting it above a quieter tile
   * everybody liked would misreport the wall. Subtracting is what makes the
   * order mean "what people actually rate".
   *
   * Ties fall back to the manifest's own order, which is alphabetical by
   * filename — stable across machines and across reloads, so two tiles on the
   * same score never swap places between visits.
   *
   * `slice()` first: `sort` mutates, and `clusterWallTiles` is a module-level
   * import shared with anything else that reads it.
   */
  const tiles = useMemo(() => {
    const score = (id: string) => {
      const t = counts[id];
      return t ? t.up - t.down : 0;
    };
    return clusterWallTiles
      .map((tile, index) => ({ tile, index }))
      .sort((a, b) => score(b.tile.id) - score(a.tile.id) || a.index - b.index)
      .map((entry) => entry.tile);
  }, [counts]);

  /**
   * Cast optimistically, then reconcile with what the server actually stored.
   *
   * The arrow has to light on the press. A round trip before the number moves
   * makes a control that should feel instant feel broken on any connection
   * worse than the developer's — and the server answers with the authoritative
   * totals anyway, so the optimistic guess is corrected inside the same
   * interaction rather than being trusted.
   */
  const cast = useCallback(
    async (tileId: string, value: 1 | -1) => {
      const held = mine[tileId] ?? 0;
      const next: Position = held === value ? 0 : value;

      setMine((prev) => ({ ...prev, [tileId]: next }));
      setCounts((prev) => {
        const cur = prev[tileId] ?? { up: 0, down: 0 };
        const delta = (v: 1 | -1) => (next === v ? 1 : 0) - (held === v ? 1 : 0);
        return {
          ...prev,
          [tileId]: {
            up: Math.max(0, cur.up + delta(1)),
            down: Math.max(0, cur.down + delta(-1)),
          },
        };
      });

      try {
        const res = await fetch("/api/wall/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tile_id: tileId, value }),
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          ok: boolean;
          counts: Record<string, Tally>;
          position: Position;
        };
        if (!body.ok) return;
        setCounts(body.counts);
        setMine((prev) => ({ ...prev, [tileId]: body.position }));
      } catch {
        // Left on the optimistic value. The next load reads the truth, and
        // snapping the arrow back under the cursor would be worse than being
        // one vote out until then.
      }
    },
    [mine],
  );

  if (clusterWallTiles.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black px-8 text-center">
        <p className="font-chrome text-sm uppercase tracking-[0.24em] text-white/40">
          The wall is empty — drop images into public/images/cluster-wall/
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-black">
      {/* Held back until the scores land, so the wall is laid out once. See
          `ordered` above. The fade is what makes the wait read as the wall
          arriving rather than as a stall. */}
      <div
        className={cn(
          "columns-2 gap-2.5 p-2.5 transition-opacity duration-300 sm:columns-3 lg:columns-4 xl:columns-5",
          ordered ? "opacity-100" : "opacity-0",
        )}
      >
        {tiles.map((tile) => {
          const lit = active === tile.id;
          const tally = counts[tile.id] ?? { up: 0, down: 0 };
          const held = mine[tile.id] ?? 0;
          const canSound = tile.kind === "video" && tile.hasAudio;

          return (
            <figure
              key={tile.id}
              /* `break-inside-avoid` is what stops a tile being sliced across a
                 column boundary — without it the browser treats the figure as
                 flowing text and cuts images in half. */
              className="wall-tile group relative mb-2.5 block break-inside-avoid overflow-hidden rounded-xl bg-white/[0.03]"
              onMouseEnter={() => setActive(tile.id)}
              onMouseLeave={() => setActive((id) => (id === tile.id ? null : id))}
              onFocus={() => setActive(tile.id)}
              onBlur={(e) => {
                // Only once focus has actually left the tile. The vote buttons
                // live inside it, and tabbing from one to the next must not
                // blink the controls away mid-press.
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setActive((id) => (id === tile.id ? null : id));
                }
              }}
            >
              {tile.kind === "video" ? (
                <WallClip
                  src={tile.src}
                  title={tile.title}
                  width={tile.width}
                  height={tile.height}
                  lit={lit}
                  audible={audible === tile.id}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={tile.src}
                  alt={tile.title}
                  width={tile.width}
                  height={tile.height}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={{ aspectRatio: `${tile.width} / ${tile.height}` }}
                  className={cn(
                    "block w-full select-none object-cover transition-transform duration-500 ease-out",
                    // A slow, small push-in: enough to say the tile is live
                    // under the cursor, not enough to disturb the grid —
                    // `overflow-hidden` on the figure crops it rather than
                    // reflowing.
                    lit ? "scale-[1.04]" : "scale-100",
                  )}
                />
              )}

              {/* THERE IS NO CAPTION. A name used to rise from the foot of each
                  tile on hover — but the wall is generated from a folder, so
                  that name was only ever the filename with its separators
                  swapped for spaces. "Pxl 20250224 114841212 1" tells nobody
                  anything, and a label that is noise is worse than no label: it
                  covers the bottom of the picture in order to say it.

                  The title still reaches assistive technology through the vote
                  buttons' own labels, so an arrow is never announced without
                  saying which tile it belongs to. */}

              {/*
                THE VERDICT, TOP LEFT.

                `wall-controls` carries the reveal — see `globals.css`: opacity
                on hover and focus-within, and permanently visible wherever the
                pointer cannot hover at all. A control that exists only under a
                mouse is a control a touch device does not have.

                The scrim behind the pair is what makes the arrows legible. They
                are white glyphs and the wall is full of photographs with white
                in them; an arrow drawn straight onto a bright frame has no
                contrast at all, which is the one thing that must not happen to
                the only interactive thing on the tile.
              */}
              {/* Bigger than it was: 15px arrows in a 26px-tall pill read as
                  decoration, and these are the only thing on the tile a
                  visitor is meant to press. The pair now clears the 44px
                  minimum target between them and the counts are legible at a
                  glance instead of on inspection. */}
              <div className="wall-controls absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-1 py-0.5 backdrop-blur-sm">
                <VoteButton
                  direction="up"
                  count={tally.up}
                  active={held === 1}
                  isDotm={isDotm}
                  title={tile.title}
                  onClick={() => void cast(tile.id, 1)}
                />
                <span aria-hidden="true" className="h-4 w-px bg-white/20" />
                <VoteButton
                  direction="down"
                  count={tally.down}
                  active={held === -1}
                  isDotm={isDotm}
                  title={tile.title}
                  onClick={() => void cast(tile.id, -1)}
                />
              </div>

              {/* The speaker, bottom right — clips only. A still photograph has
                  no sound to turn on, and a control that does nothing is worse
                  than no control at all. */}
              {canSound && (
                <SpeakerButton
                  on={audible === tile.id}
                  isDotm={isDotm}
                  title={tile.title}
                  onClick={() => setAudible((cur) => (cur === tile.id ? null : tile.id))}
                />
              )}

              {/* A hairline that lights with the tile. On a black ground a
                  rounded rectangle has no edge of its own until something
                  gives it one. */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-xl ring-1 transition-colors duration-200",
                  lit
                    ? isDotm
                      ? "ring-[#ff2244]/70"
                      : "ring-white/70"
                    : "ring-white/[0.07]",
                )}
              />
            </figure>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One moving tile.
 *
 * IT PLAYS ONLY WHILE ON SCREEN. Twenty-five simultaneously decoding videos
 * will saturate the main thread on any machine, and the wall scrolls — most of
 * them are never looked at. An `IntersectionObserver` starts a clip as it comes
 * into view and pauses it as it leaves, which keeps the cost proportional to
 * what is actually being watched.
 *
 * `muted` IS ALSO SET AS A PROPERTY, not only as an attribute. React's `muted`
 * prop is unreliable on first render — it is applied after the element exists,
 * and an autoplaying video that is briefly unmuted is refused outright by the
 * autoplay policy. Setting it imperatively before play is attempted is what
 * makes autoplay stick.
 */
function WallClip({
  src,
  title,
  width,
  height,
  lit,
  audible,
}: {
  src: string;
  title: string;
  width: number;
  height: number;
  lit: boolean;
  audible: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // A rejected play() is not worth surfacing: it means the browser
          // declined, and the tile simply shows its first frame.
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * Sound follows the wall's single audible tile.
   *
   * Unmuting is a state change on an element that is already playing, and the
   * press that caused it is the user gesture the autoplay policy asks for, so
   * this needs no separate arrangement. Volume is set explicitly rather than
   * left wherever the element happened to be.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !audible;
    if (audible) {
      el.volume = 0.85;
      void el.play().catch(() => {});
    }
  }, [audible]);

  return (
    <video
      ref={ref}
      src={src}
      // No poster: that would be a second file per clip to generate and ship,
      // and the reserved aspect box already holds the space, so what shows
      // before the first frame is the tile's own dark ground rather than a
      // collapse.
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-label={title}
      draggable={false}
      style={{ aspectRatio: `${width} / ${height}` }}
      className={cn(
        "block w-full select-none object-cover transition-transform duration-500 ease-out",
        lit ? "scale-[1.04]" : "scale-100",
      )}
    />
  );
}

/**
 * One arrow and its count.
 *
 * THE GLYPH IS THE SUPPLIED MARK, INLINED. `Image assets/upvote.svg` is a
 * hollow arrow on a 24-unit box, reproduced here as a path so it can take
 * `currentColor` and sit on the tile with nothing behind it.
 *
 * THE DOWNVOTE FILE IS NOT USED, AND COULD NOT BE. `Image assets/downvote.png`
 * is 148px in palette mode with no alpha channel at all — every pixel opaque,
 * checked before this was written — so dropping it on a tile would have put a
 * grey square there, which is the opposite of the "transparent manner" it was
 * asked for. It is the same arrow upside down, so it is the same path rotated:
 * transparent by construction, and matching its partner's weight exactly.
 */
/**
 * `1840` becomes `1.8k`.
 *
 * Four figures beside a 22px arrow on a tile that can be a quarter of a column
 * wide is most of the control's width spent on a number nobody reads
 * digit-by-digit. Under a thousand it stays exact, because there the precise
 * figure is small enough to be free.
 */
function compact(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  // One decimal below ten thousand, none above: `9.4k` is worth the character,
  // `12.4k` is not.
  return k < 10 ? `${k.toFixed(1).replace(/\.0$/, "")}k` : `${Math.round(k)}k`;
}

function VoteButton({
  direction,
  count,
  active,
  isDotm,
  title,
  onClick,
}: {
  direction: "up" | "down";
  count: number;
  active: boolean;
  isDotm: boolean;
  title: string;
  onClick: () => void;
}) {
  const verb = direction === "up" ? "Upvote" : "Downvote";
  const label = active ? `Remove your ${verb.toLowerCase()} on ${title}` : `${verb} ${title}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex min-h-[36px] items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
        active
          ? direction === "up"
            ? isDotm
              ? "text-[#ff5a70]"
              : "text-[#6fd08c]"
            : "text-[#ff8a5c]"
          : "text-white/75 hover:text-white",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={22}
        height={22}
        aria-hidden="true"
        fill="currentColor"
        className={cn("shrink-0", direction === "down" && "rotate-180")}
      >
        <path d="M12.781 2.375c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 0 0 4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1.001 1.001 0 0 0 .781-1.625l-8-10zM15 12h-1v8h-4v-8H6.081L12 4.601 17.919 12H15z" />
      </svg>
      {/* Tabular figures, so a count ticking from 999 to 1000 does not shove
          the arrow beside it sideways. */}
      <span className="font-chrome text-[14px] tabular-nums leading-none">
        {compact(count)}
      </span>
    </button>
  );
}

/**
 * The speaker, struck through until somebody asks for sound.
 *
 * The strike is drawn rather than implied by a colour change: muted and
 * unmuted have to be distinguishable without relying on hue, and a line
 * through the glyph is the convention every player already uses.
 */
function SpeakerButton({
  on,
  isDotm,
  title,
  onClick,
}: {
  on: boolean;
  isDotm: boolean;
  title: string;
  onClick: () => void;
}) {
  const label = on ? `Mute ${title}` : `Play sound for ${title}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "wall-controls absolute bottom-2 right-2 z-10 grid h-8 w-8 place-items-center rounded-full",
        "bg-black/65 backdrop-blur-sm transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
        on
          ? isDotm
            ? "text-[#ff5a70]"
            : "text-[#8ec5ff]"
          : "text-white/75 hover:text-white",
      )}
    >
      <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none">
        <path
          d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {on ? (
          <path
            d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M15 8.5l5 7M20 8.5l-5 7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
