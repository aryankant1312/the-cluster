"use client";

import { useEffect, useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { formatIndian } from "@/content/metrics";
import {
  changeKeyFor,
  statPanels,
  type StatPanel,
  type StatPlatform,
} from "@/content/stat-panels";
import { useCountTo } from "@/hooks/use-count-to";
import { cn } from "@/lib/utils";

/**
 * THE AUDIENCE REPORT — one platform at a time.
 *
 * This used to be four groups of four tiles on a scroll: sixteen numbers, none
 * of them the headline, and half of them below the fold of the window they
 * lived in. Someone deciding whether to book has one question per platform, so
 * the window asks which platform and answers at full size. Nothing scrolls —
 * two figures fill the pane.
 *
 * NOTHING IS EVER BLANK. Figures come from /api/audience, which resolves each
 * one live-then-cache-then-entered (see `lib/audience.ts`). On top of that the
 * last response is mirrored into localStorage, so a returning visitor sees
 * real numbers on the first paint rather than a row of skeletons — and when
 * the fresh response lands, each figure *counts* from the number already on
 * screen to the new one, up or down. That count is the whole reason to cache
 * on the client: the delta becomes visible, where a silent swap would hide it.
 *
 * A figure that has never resolved from anywhere renders an em dash. That is
 * the one honest thing to draw for a number nobody has.
 */

/** Where the last response is mirrored for an instant first paint. */
const CACHE_KEY = "dotm:audience-cache";

interface AudienceResponse {
  values: Record<string, number | null>;
  changes?: Record<string, number | null>;
}

interface CachedPayload {
  values: Record<string, number | null>;
  changes?: Record<string, number | null>;
  savedAt: string;
}

/** What the window renders from: the figures, and how each one moved. */
interface Audience {
  values: Record<string, number | null>;
  changes: Record<string, number | null>;
}

/**
 * The previous response, read once before the first paint.
 *
 * A lazy `useState` initialiser rather than an effect: this has to be the
 * value the component renders *with*, not one it corrects to a frame later.
 * Reading localStorage in a lazy initialiser runs on the client only — the
 * server render never reaches it.
 */
function readCache(): Audience | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed || typeof parsed.values !== "object") return null;
    // `changes` post-dates the first version of this cache, so an entry
    // written by an older build has none. An absent map is no pills, which is
    // the same thing an unentered change shows.
    return { values: parsed.values, changes: parsed.changes ?? {} };
  } catch {
    // Corrupt or unreadable (private mode, quota, a shape from an older
    // build). Not worth reporting — the fetch below is about to replace it.
    return null;
  }
}

function writeCache(audience: Audience) {
  try {
    const payload: CachedPayload = { ...audience, savedAt: new Date().toISOString() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage is full or blocked. The window still works; it just paints
    // skeletons on the next cold visit.
  }
}

export function LiveStats() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";

  const [active, setActive] = useState<StatPlatform>("youtube");
  const [audience, setAudience] = useState<Audience | null>(readCache);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audience")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: AudienceResponse) => {
        if (cancelled) return;
        const next: Audience = { values: body.values, changes: body.changes ?? {} };
        setAudience(next);
        writeCache(next);
      })
      .catch(() => {
        // An unreachable API keeps whatever the cache had. Only a visitor with
        // no cache at all sees dashes, which is the truth for them.
        if (!cancelled) setAudience((prev) => prev ?? { values: {}, changes: {} });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const panel = statPanels.find((p) => p.id === active) ?? statPanels[0];

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden",
        isDotm ? "bg-[#0b0b0c] text-white" : "bg-persona-window-bg text-black",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-start justify-between gap-4 border-b px-6 py-4",
          isDotm ? "border-white/10" : "border-black/15",
        )}
      >
        <div className="min-w-0">
          <p
            className="font-chrome text-[10px] uppercase tracking-[0.36em]"
            style={{ color: panel.accent }}
          >
            The audience
          </p>
          <h2
            className={cn(
              "mt-1.5 font-chrome text-xl uppercase tracking-[0.16em] sm:text-2xl",
              isDotm ? "text-white" : "text-black",
            )}
          >
            {panel.label}
          </h2>
          <p
            className={cn(
              "mt-1 max-w-xl font-body text-xs leading-relaxed sm:text-sm",
              isDotm ? "text-white/55" : "text-black/60",
            )}
          >
            {panel.blurb}
          </p>
        </div>

        {/* Filters, top right. Three buttons rather than one long page: the
            platforms are not comparable to each other, so showing them
            together only invited a comparison that means nothing. */}
        <nav aria-label="Platform" className="flex shrink-0 flex-wrap gap-2">
          {statPanels.map((p) => (
            <FilterButton
              key={p.id}
              panel={p}
              active={p.id === active}
              isDotm={isDotm}
              onClick={() => setActive(p.id)}
            />
          ))}
        </nav>
      </header>

      {/* The reporting window, where the panel has one. Above the figures
          rather than under them, so it is read as a qualifier before the
          number and not as a footnote after it. */}
      {panel.period && (
        <p
          className={cn(
            "shrink-0 border-b px-6 py-2 font-chrome text-[10px] uppercase tracking-[0.3em]",
            isDotm ? "border-white/10 text-white/45" : "border-black/10 text-black/50",
          )}
        >
          {panel.period}
        </p>
      )}

      {/* `min-h-0` is what lets this fill the remaining height exactly rather
          than overflowing it — without it a flex child sizes to its content
          and the window scrolls again, which is the thing being fixed. */}
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-px md:grid-cols-2",
          isDotm ? "bg-white/10" : "bg-black/15",
        )}
      >
        {panel.metrics.map((metric) => (
          <MetricPane
            key={metric.id}
            label={metric.label}
            description={metric.description}
            value={audience ? (audience.values[metric.key] ?? null) : undefined}
            change={audience ? (audience.changes[changeKeyFor(metric.key)] ?? null) : null}
            accent={panel.accent}
            isDotm={isDotm}
          />
        ))}
      </div>

      {/* The outbound call to action, along the bottom and pushed to the
          right. It sat hard left, which put the one thing a visitor can *do*
          in this window at the end of their read rather than where the eye
          leaves the pane — and left it a long way from the figures it belongs
          to on a wide window. */}
      {panel.action && (
        <div
          className={cn(
            "flex shrink-0 justify-end border-t px-6 py-3",
            isDotm ? "border-white/10" : "border-black/15",
          )}
        >
          <PanelActionButton
            label={panel.action.label}
            href={panel.action.href}
            platform={panel.id}
            accent={panel.accent}
            onAccent={panel.onAccent}
            isDotm={isDotm}
          />
        </div>
      )}
    </div>
  );
}

function FilterButton({
  panel,
  active,
  isDotm,
  onClick,
}: {
  panel: StatPanel;
  active: boolean;
  isDotm: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={active ? { backgroundColor: panel.accent, color: panel.onAccent } : undefined}
      className={cn(
        // 13px, not 11. These are the window's navigation and they were set
        // smaller than the captions inside the panes they switch between.
        "flex items-center gap-2 px-4 py-2.5 font-chrome text-[13px] uppercase tracking-[0.16em] transition-colors sm:text-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isDotm
          ? "rounded-full focus-visible:ring-white focus-visible:ring-offset-[#0b0b0c]"
          : "win98-border win98-press focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-persona-window-bg",
        active
          ? "shadow-[0_6px_18px_-8px_rgba(0,0,0,0.7)]"
          : isDotm
            ? "bg-white/[0.06] text-white/65 hover:bg-white/[0.12] hover:text-white"
            : "bg-persona-surface text-black hover:bg-persona-surface-alt",
      )}
    >
      <PlatformMark
        platform={panel.id}
        // On the active chip the mark takes the chip's foreground, so it is
        // never brand colour drawn on the same brand colour.
        color={active ? panel.onAccent : panel.accent}
        // ...and Spotify's waves are then cut back out in the chip's fill, so
        // the disc reads as a disc. Inactive chips keep the default, which is
        // already the right colour for the surface behind them.
        knockout={active ? panel.accent : undefined}
        size={18}
      />
      {panel.label}
    </button>
  );
}

/**
 * The panel's outbound call to action — subscribe on YouTube, follow on
 * Instagram or Spotify.
 *
 * Filled in the platform's own colour rather than drawn as another outline
 * chip: it is the one thing on this pane a visitor can *do*, and the figures
 * beside it already carry that colour, so it reads as belonging to the panel
 * rather than as a banner dropped into it.
 *
 * The mark is the panel's own, not a hardcoded YouTube glyph. This button used
 * to be YouTube-only and drew that glyph inline; with three panels carrying
 * one it has to ask the platform, or Instagram would invite you to follow
 * under a play button.
 */
function PanelActionButton({
  label,
  href,
  platform,
  accent,
  onAccent,
  isDotm,
}: {
  label: string;
  href: string;
  platform: StatPlatform;
  accent: string;
  onAccent: string;
  isDotm: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // `--cta-accent` feeds the halo in `.stat-cta-live`, so the ring leaving
      // the button is mixed from the same brand colour filling it.
      style={
        { backgroundColor: accent, color: onAccent, "--cta-accent": accent } as React.CSSProperties
      }
      className={cn(
        // 13px and a 20px mark, up from 11 and 15. At the old size this read
        // as a footnote under figures set at 4rem.
        "inline-flex items-center gap-2.5 px-5 py-3 font-chrome text-[13px] uppercase tracking-[0.18em] transition-transform duration-150 sm:text-sm",
        "hover:scale-[1.03] active:scale-[0.98]",
        // The sweep and the halo. Both stop under `prefers-reduced-motion`.
        "stat-cta-live",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isDotm
          ? "rounded-full shadow-[0_10px_26px_-12px_rgba(0,0,0,0.9)] focus-visible:ring-white focus-visible:ring-offset-[#0b0b0c]"
          : "win98-border win98-press focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-persona-window-bg",
      )}
    >
      {/* Wrapped and positioned so the sweep passes *under* the label. The
          sweep is an absolutely positioned pseudo-element, and a positioned box
          paints above its static siblings — without this the band would wash
          across the type instead of behind it. */}
      <span className="relative inline-flex items-center gap-2.5">
        {/* `currentColor` so the mark takes the button's foreground rather than
            the brand colour it is sitting on, and the knockout is that brand
            colour, so Spotify's waves are cut back out in the button's fill. */}
        <PlatformMark
          platform={platform}
          color="currentColor"
          knockout={accent}
          size={20}
        />
        {label}
        {/* Says out loud that this leaves the site, which a coloured button
            otherwise does not. */}
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </span>
    </a>
  );
}

/**
 * One figure, filling its share of the window.
 *
 * The number is sized in `cqi` — a percentage of this pane's own width —
 * rather than `vw`. Sizing off the container makes the type fit by
 * construction instead of by luck, whatever the window's width.
 *
 * `undefined` means nothing is known yet — no cache, no response — and draws a
 * placeholder bar. `null` means the figure has never resolved from anywhere
 * and draws an em dash. Those are different states and they read differently.
 */
function MetricPane({
  label,
  description,
  value,
  change,
  accent,
  isDotm,
}: {
  label: string;
  description: string;
  value: number | null | undefined;
  /** Period-on-period movement as a percentage, or null when none is entered. */
  change: number | null;
  accent: string;
  isDotm: boolean;
}) {
  const loading = value === undefined;
  const unset = value === null;

  /**
   * Zero on the first render, the real figure on every one after.
   *
   * `useCountTo` shows the first target it is handed outright and animates
   * only *between* targets, so seeding it with 0 makes that first transition a
   * count-up and leaves every later one a delta. Which is the exact pair of
   * behaviours this pane wants: the figure winds up from nothing each time the
   * window is opened — and each time a platform tab is picked, since these
   * panes are keyed by metric and so remount — and then, when the live
   * response lands on top of the cached one, it ticks the difference rather
   * than spinning the whole number up again.
   *
   * Flipped during render rather than from an effect, the same way the vote
   * board does it (`VoteCount` in ShowsExperience). React re-runs the render
   * immediately and throws the first pass away, so nothing is ever painted at
   * zero; an effect would paint 0, commit it, then correct it a frame later —
   * a visible flash in a pane whose whole content is one number.
   */
  const [primed, setPrimed] = useState(false);
  if (!primed) setPrimed(true);

  /**
   * `undefined` — still fetching — is normalised to 0, not to null.
   *
   * Null is what the hook treats as "nothing is on screen", and it lands the
   * next target outright instead of animating to it. Normalising the loading
   * state to null would therefore have cost a cold visitor the count-up
   * entirely: the pane would sit at nothing while the request was in flight
   * and then snap straight to the finished figure. Holding at zero keeps the
   * counter primed, and zero is never seen anyway — a loading pane draws the
   * placeholder bar below, not the number.
   *
   * A `null` value is different and is passed through: that is a figure that
   * has never resolved from anywhere, and it must read as an em dash. Counting
   * up to a zero nobody measured would be inventing one.
   */
  const target = !primed || value === undefined ? 0 : value;
  const animated = useCountTo(target);

  return (
    <section
      // `inline-size` containment is what makes the `cqi` sizing below resolve
      // against this pane. `overflow-hidden` is the backstop: a very short
      // window clips the pane rather than growing the grid and putting a
      // scrollbar back into a window that is meant not to have one.
      style={{ containerType: "inline-size" }}
      className={cn(
        "flex min-h-0 min-w-0 flex-col justify-center gap-3 overflow-hidden px-6 py-6",
        isDotm ? "bg-[#0b0b0c]" : "bg-persona-window-bg",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-4 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <h3
          className={cn(
            "font-chrome text-[11px] uppercase tracking-[0.22em] sm:text-xs",
            isDotm ? "text-white/70" : "text-black/70",
          )}
        >
          {label}
        </h3>
      </div>

      {loading ? (
        <div
          aria-hidden="true"
          className={cn(
            "w-3/4 animate-pulse rounded-lg",
            isDotm ? "bg-white/[0.07]" : "bg-black/10",
          )}
          style={{ height: "clamp(1.9rem, 15cqi, 4.6rem)" }}
        />
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p
            className={cn(
              "font-headline tabular-nums",
              unset && (isDotm ? "text-white/25" : "text-black/25"),
            )}
            style={{
              fontSize: "clamp(1.9rem, 15cqi, 4.6rem)",
              // Cinzel Decorative's ink box runs well past its line box — tall
              // ascenders, and commas that drop below the baseline. At 1.05 the
              // element overflowed itself by nine pixels and at 1.2 by five;
              // 1.3 finally contains the glyphs.
              lineHeight: 1.3,
              ...(unset ? {} : { color: accent }),
            }}
          >
            {animated === null ? "—" : formatIndian(Math.round(animated))}
          </p>
          {/* Only drawn where a figure exists to have moved. A change beside a
              dash would be a claim about a number nobody has. */}
          {!unset && <ChangePill change={change} isDotm={isDotm} />}
        </div>
      )}

      <p
        className={cn(
          "max-w-[36ch] font-body leading-relaxed",
          isDotm ? "text-white/55" : "text-black/65",
        )}
        style={{ fontSize: "clamp(0.78rem, 3.4cqi, 0.95rem)" }}
      >
        {unset ? "Not entered yet." : description}
      </p>
    </section>
  );
}

/**
 * How a figure moved over its reporting window, as a signed percentage.
 *
 * Entered by hand in /admin — none of these platforms hands back a delta, and
 * a delta computed here from two figures taken weeks apart would be a
 * different statistic wearing the same label.
 *
 * Green up, red down, and a caret pointing the way, because colour alone is
 * not a signal a colourblind reader can act on. Zero is drawn as its own
 * flat state rather than as a green "+0%": a figure that held is neither
 * growth nor loss and should not be coloured as either.
 *
 * Nothing renders when the row is unset. An absent change is absent, not flat
 * — and a row of "0%" pills across a window nobody has filled in would read
 * as a report of stagnation.
 */
function ChangePill({ change, isDotm }: { change: number | null; isDotm: boolean }) {
  if (change === null) return null;

  const flat = change === 0;
  const up = change > 0;

  // One decimal at most, and no trailing ".0" — "12%", "8.5%", "-4%".
  const magnitude = Math.abs(change);
  const formatted = Number.isInteger(magnitude)
    ? String(magnitude)
    : magnitude.toFixed(1).replace(/\.0$/, "");

  const tone = flat
    ? { fg: isDotm ? "#a1a1aa" : "#52525b", bg: isDotm ? "rgba(161,161,170,0.14)" : "rgba(82,82,91,0.10)" }
    : up
      ? { fg: isDotm ? "#4ade80" : "#15803d", bg: isDotm ? "rgba(74,222,128,0.14)" : "rgba(21,128,61,0.10)" }
      : { fg: isDotm ? "#fb7185" : "#be123c", bg: isDotm ? "rgba(251,113,133,0.14)" : "rgba(190,18,60,0.10)" };

  const sign = flat ? "no change" : up ? "up" : "down";

  return (
    <span
      title={`${sign} ${formatted}% on the previous period`}
      style={{ color: tone.fg, backgroundColor: tone.bg }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 px-2 py-1 font-chrome text-[11px] font-semibold tabular-nums leading-none sm:text-xs",
        isDotm ? "rounded-full" : "win98-border",
      )}
    >
      {!flat && (
        <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden="true" fill="currentColor">
          {up ? <path d="M6 2.2 10.4 8.4H1.6z" /> : <path d="M6 9.8 1.6 3.6h8.8z" />}
        </svg>
      )}
      <span>
        {flat ? "" : up ? "+" : "-"}
        {formatted}%
      </span>
      <span className="sr-only"> {sign} on the previous period</span>
    </span>
  );
}

/* ── Platform marks ─────────────────────────────────────────────────────── */

function PlatformMark({
  platform,
  color,
  size = 15,
  knockout = "#0a1f12",
}: {
  platform: StatPlatform;
  color: string;
  size?: number;
  /**
   * The colour of Spotify's three waves, which are cut out of its disc rather
   * than drawn on top of it.
   *
   * This was hardcoded dark green, which was right in exactly one of the three
   * places the mark appears. On the active chip and on the action button the
   * disc is filled with the panel's `onAccent` — near-black, for Spotify — so
   * near-black waves vanished into it and the logo came out as a plain dark
   * dot on a bright green button. A knockout has to be whatever the disc is
   * sitting on, so callers pass it; the default is the surface behind an
   * inactive chip, which is where the old constant was correct.
   */
  knockout?: string;
}) {
  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden="true">
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10.1 14.9V9.1l5.05 2.9-5.05 2.9Z" />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={2}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.2" fill={color} stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={color} />
      <g stroke={knockout} strokeLinecap="round" fill="none" opacity={0.9}>
        <path d="M7 9.4c3-.9 6.8-.6 9.3.9" strokeWidth={1.5} />
        <path d="M7.5 12.4c2.5-.7 5.8-.5 7.8.8" strokeWidth={1.4} />
        <path d="M8 15.2c2-.55 4.5-.4 6.3.65" strokeWidth={1.3} />
      </g>
    </svg>
  );
}

export default LiveStats;
