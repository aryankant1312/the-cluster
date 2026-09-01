"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { cn } from "@/lib/utils";

/**
 * DROPS, before there are any.
 *
 * The storefront in `MerchDrops` is finished and works, and it is not what
 * this window shows: there is nothing to sell yet, and a cart that cannot
 * check out is worse than an honest empty room. `MerchDrops` stays in the tree
 * one import away — see the note where this is mounted.
 *
 * WHAT THIS REPLACED. A static wordmark, a headline, a countdown to the drop
 * date and a newsletter field, stacked in a column. All four are gone. The
 * window is now one object: two counter-rotating rings of type overlapping
 * into a figure-eight, with half of a play/pause control sitting in each
 * ring's hollow centre. The geometry is a port of the supplied `title_html` /
 * `title_css` pair; what changed in the port is noted with the CSS in
 * `globals.css`.
 *
 * TWENTY-EIGHT SLOTS, AND THE PHRASE IS FOURTEEN CHARACTERS. Not a
 * coincidence — it is the reason for the separator. `"COMING SOON • "` is
 * exactly half the ring, so two passes fill it with no remainder and no seam.
 * A ring that ended mid-word would announce where the loop was cut.
 *
 * THE CONTROL DRIVES THE TRACK AS WELL AS THE TYPE. Pressing pause stops the
 * rings and the music together, which is the only reading of one button that
 * does not lie about what it does.
 *
 * Both personas get the same figure in their own ink — DOTM in black, white
 * and red, DEV in the source's full spectrum.
 */

/**
 * Half the ring. The trailing space is load-bearing: without it the bullet
 * would butt against the C of the next pass.
 */
const PHRASE = "COMING SOON • ";

/** Twenty-eight slots, which is what the CSS's `360deg / 28` divides into. */
const RING = [...PHRASE, ...PHRASE];

/**
 * The bed, and the twenty-five seconds of it that are wanted.
 *
 * A window, not a file: the track runs four minutes and this is a loop behind
 * an animation, so it seeks in at 1:53 and turns over at 2:18 rather than
 * playing out and leaving the window silent.
 */
const TRACK_SRC = "/audio/dnd-trip-mp3.mp3";
const CLIP_START = 113;
const CLIP_END = 138;

export function ComingSoonDrop() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";

  /**
   * Running is the resting state, and it describes the rings truthfully
   * whatever the audio manages to do.
   *
   * The two are deliberately not the same flag. An unmuted `play()` on mount
   * is refused by every browser without a prior gesture, so the track starts
   * silent while the rings turn — and the first press of the control is that
   * gesture, after which the two move together. Gating the animation on
   * whether audio was permitted would leave a dead window on the strictest
   * browsers, which is the wrong thing to punish.
   */
  const [playing, setPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  /** Turn over at the out point rather than run past it. */
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= CLIP_END || audio.currentTime < CLIP_START - 0.5) {
      audio.currentTime = CLIP_START;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      // Rejected until a gesture has happened. Swallowed on purpose: a
      // refused autoplay is the browser working as designed, not a fault the
      // visitor needs to be told about.
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playing]);

  return (
    <div
      data-playing={playing ? "true" : "false"}
      className={cn(
        "swirl-stage h-full w-full",
        isDotm ? "swirl-stage-dotm bg-black" : "swirl-stage-dev bg-black",
      )}
    >
      {isDotm && <DotmGround />}

      <audio
        ref={audioRef}
        src={TRACK_SRC}
        loop
        preload="auto"
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (audio) audio.currentTime = CLIP_START;
        }}
        onTimeUpdate={onTimeUpdate}
      />

      <div className="swirl-container">
        <Half
          side="a"
          control="play"
          playing={playing}
          onToggle={() => setPlaying((v) => !v)}
        />
        <Half
          side="b"
          control="pause"
          playing={playing}
          onToggle={() => setPlaying((v) => !v)}
        />
      </div>
    </div>
  );
}

/**
 * One ring, and the half of the control that lives in its centre.
 *
 * The two halves differ only in which way they spin and which button they
 * hold, and the CSS decides both from `side` — so this takes no styling
 * decision of its own.
 */
function Half({
  side,
  control,
  playing,
  onToggle,
}: {
  side: "a" | "b";
  control: "play" | "pause";
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("swirl-wrapper", `swirl-wrapper-${side}`)}>
      <div className="swirl-ring" aria-hidden="true">
        {RING.map((char, i) => (
          <span
            key={i}
            className={char === "•" ? "swirl-bullet" : undefined}
            style={{ "--nth": i + 1 } as React.CSSProperties}
          >
            {/* A bare space collapses; the slot has to keep its width. */}
            {char === " " ? " " : char}
          </span>
        ))}
      </div>

      {/* Both controls stay mounted and one is scaled to zero — the swap is a
          transition rather than a remount, which is what lets it shrink and
          grow instead of blinking. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={control === "play" ? "Play" : "Pause"}
        /* Only the control the CSS has not collapsed should be tabbable. */
        tabIndex={(control === "play") === playing ? -1 : 0}
        className={cn("swirl-btn", `swirl-btn-${control}`)}
      >
        {(control === "play" ? [5, 4, 3, 2, 1] : [5, 5]).map((count, col) => (
          <span key={col} className="swirl-col">
            {Array.from({ length: count }).map((_, dot) => (
              <span
                key={dot}
                className="swirl-dot"
                style={{ "--nDot": dot } as React.CSSProperties}
              />
            ))}
          </span>
        ))}
      </button>
    </div>
  );
}

/**
 * DOTM's ground: the red bloom and grain the rest of this persona is built on,
 * so the window reads as part of the desktop rather than as a card dropped
 * onto it.
 *
 * Both layers are `pointer-events-none` and sit behind the rings.
 */
function DotmGround() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(180,0,26,0.28) 0%, rgba(120,0,18,0.10) 45%, transparent 72%)",
        }}
      />
      {/* Grain as inline SVG turbulence — no request, no decode, and it
          survives being blown up to a fullscreen window because it is
          generated rather than sampled. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </>
  );
}
