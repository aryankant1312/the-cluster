"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clusterWallTiles } from "@/content/cluster-wall.generated";
import { DotmLoader } from "@/components/shared/DotmLoader";
import { cn } from "@/lib/utils";

interface Tally {
  up: number;
  down: number;
}

type Position = 1 | -1 | 0;

export function ClusterWallGrid({ isDotm }: { isDotm: boolean }) {
  const [active, setActive] = useState<string | null>(null);

  const [counts, setCounts] = useState<Record<string, Tally>>({});
  const [mine, setMine] = useState<Record<string, Position>>({});

  const [ordered, setOrdered] = useState(false);

  const [audible, setAudible] = useState<string | null>(null);
  const [volumeMap, setVolumeMap] = useState<Record<string, number>>({});

  const [error, setError] = useState("");
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const fetching = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (pending.current || fetching.current) return;
    fetching.current = true;
    const version = ++generation.current;
    try {
      const res = await fetch("/api/wall/votes", { cache: "no-store" });
      if (!res.ok) throw new Error("Votes are temporarily unavailable.");
      const body = await res.json();
      if (version !== generation.current || pending.current) return;
      setCounts(body.counts);
      setMine(body.mine);
      setError("");
    } catch {
      if (version === generation.current) setError("Votes could not be refreshed. Please try again.");
    } finally {
      fetching.current = false;
      if (version === generation.current) setOrdered(true);
    }
  }, []);
  useEffect(() => {
    const initialRead = setTimeout(() => void refresh(), 0);
    const update = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(update, 5000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      // Invalidate network responses still in flight when this subscription ends.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      clearTimeout(initialRead);
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);

  const tiles = useMemo(() => {
    const score = (id: string) => {
      const t = counts[id];
      return t?.up ?? 0;
    };
    return clusterWallTiles
      .map((tile, index) => ({ tile, index }))
      .sort((a, b) => score(b.tile.id) - score(a.tile.id) || a.index - b.index)
      .map((entry) => entry.tile);
  }, [counts]);

  const cast = useCallback(async (tileId: string, value: 1 | -1) => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    generation.current++;
    setError("");
    try {
      const res = await fetch("/api/wall/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tile_id: tileId, value }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error("Vote failed");
      setCounts(body.counts);
      setMine((prev) => ({ ...prev, [tileId]: body.position }));
    } catch {
      setError("Your vote could not be confirmed. Refresh the counts before trying again.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }, []);

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
    // `relative`, so the loader below has something to be `inset-0` of.
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-black">
      {/*
        THE WALL'S OWN LOADER, over the wall rather than instead of it.

        `ordered` is the right signal and not an approximation of one: it flips
        when the scores land, and the scores are what the wall's arrangement is
        derived from, so it is the exact moment there is something correct to
        look at. Until then the grid remains visible beneath the shared blur,
        so the landing page itself supplies the loader's background.
      */}
      {error && (
        <div role="status" className="p-3 text-sm text-white">
          {error}{" "}
          <button type="button" onClick={() => void refresh()} className="underline">
            Refresh counts
          </button>
        </div>
      )}
      <DotmLoader show={!ordered} label="Loading the Cluster Wall" />

      {/* Held back until the scores land, so the wall is laid out once. See
          `ordered` above. The fade is what makes the wait read as the wall
          arriving rather than as a stall. */}
      <div
        className={cn(
          "columns-2 gap-2.5 p-2.5 transition-opacity duration-300 sm:columns-3 lg:columns-4 xl:columns-5",
          ordered ? "opacity-100" : "opacity-55",
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
                  volume={volumeMap[tile.id] ?? 0.85}
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
                  disabled={saving || !ordered}
                  direction="up"
                  count={tally.up}
                  active={held === 1}
                  isDotm={isDotm}
                  title={tile.title}
                  onClick={() => void cast(tile.id, 1)}
                />
                <span aria-hidden="true" className="h-4 w-px bg-white/20" />
                <VoteButton
                  disabled={saving || !ordered}
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
                <SpeakerWithVolumeSlider
                  on={audible === tile.id}
                  volume={volumeMap[tile.id] ?? 0.85}
                  isDotm={isDotm}
                  title={tile.title}
                  onClickToggle={() => {
                    if (audible === tile.id) {
                      setAudible(null);
                    } else {
                      setAudible(tile.id);
                      if ((volumeMap[tile.id] ?? 0.85) === 0) {
                        setVolumeMap((prev) => ({ ...prev, [tile.id]: 0.85 }));
                      }
                    }
                  }}
                  onVolumeChange={(vol) => {
                    setVolumeMap((prev) => ({ ...prev, [tile.id]: vol }));
                    if (vol > 0) {
                      setAudible(tile.id);
                    } else {
                      setAudible(null);
                    }
                  }}
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

function WallClip({
  src,
  title,
  width,
  height,
  lit,
  audible,
  volume = 0.85,
}: {
  src: string;
  title: string;
  width: number;
  height: number;
  lit: boolean;
  audible: boolean;
  volume?: number;
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
   * Sound follows the wall's single audible tile and volume setting.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !audible || volume === 0;
    if (audible && volume > 0) {
      el.volume = Math.max(0, Math.min(1, volume));
      void el.play().catch(() => {});
    }
  }, [audible, volume]);

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
  disabled,
  direction,
  count,
  active,
  isDotm,
  title,
  onClick,
}: {
  disabled: boolean;
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
      disabled={disabled}
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
 * Hovering over the speaker icon pops up a volume slider that allows
 * control over clip audio volume, closing when cursor leaves the area.
 */
function SpeakerWithVolumeSlider({
  on,
  volume,
  isDotm,
  title,
  onClickToggle,
  onVolumeChange,
}: {
  on: boolean;
  volume: number;
  isDotm: boolean;
  title: string;
  onClickToggle: () => void;
  onVolumeChange: (vol: number) => void;
}) {
  const [showSlider, setShowSlider] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowSlider(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setShowSlider(false);
    }, 200);
  };

  const label = on ? `Mute ${title}` : `Play sound for ${title}`;
  const effectiveVolume = on ? volume : 0;

  return (
    <div
      className="wall-controls absolute bottom-2 right-2 z-20 flex flex-col items-center gap-1.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showSlider && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full px-1.5 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200",
            isDotm ? "bg-black/90 ring-1 ring-white/20" : "bg-black/80 ring-1 ring-white/30"
          )}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={effectiveVolume}
            aria-label={`Volume slider for ${title}`}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onVolumeChange(val);
            }}
            className="wall-volume-slider h-20 w-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onClickToggle}
        aria-pressed={on}
        aria-label={label}
        title={label}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full",
          "bg-black/65 backdrop-blur-sm transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
          on && effectiveVolume > 0 ? "text-white" : "text-white/75 hover:text-white",
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
          {on && effectiveVolume > 0 ? (
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
    </div>
  );
}
