"use client";

import { useState } from "react";
import Image from "next/image";

const SPOTIFY_URL =
  "https://open.spotify.com/artist/2AL0XQ1mbnWU5xVR6R4KRa?si=4EILAYryQjWvmeARp5Xtsg";

/**
 * A compact, on-brand "now playing" card used as the Music dock app's window.
 * Visual/generic player — the transport controls animate state; the CTA opens
 * DOTM's Spotify to actually listen.
 */
export function MiniPlayer() {
  const [playing, setPlaying] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-lg">
          <Image
            src="/images/covers/666-the-beginning.jpg"
            alt="666 — The Beginning cover"
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <p className="text-[10px] tracking-[0.2em] text-fg-muted font-chrome">NOW PLAYING</p>
          <p className="text-base font-medium truncate">Bhala Kyun</p>
          <p className="text-xs text-fg-muted truncate">DOTM · 666 — The Beginning</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-persona-accent" />
        </div>
        <div className="flex justify-between text-[10px] tabular-nums text-fg-muted">
          <span>1:04</span>
          <span>3:12</span>
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center justify-center gap-6">
        <button type="button" aria-label="Previous" className="text-fg-muted hover:text-persona-fg transition-colors">
          <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
            <path d="M6 5h2v14H6zM20 5v14l-11-7z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
          className="w-12 h-12 rounded-full bg-persona-accent text-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(180,0,26,0.8)] hover:scale-105 active:scale-95 transition-transform"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true" className="translate-x-[1px]">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button type="button" aria-label="Next" className="text-fg-muted hover:text-persona-fg transition-colors">
          <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
            <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
          </svg>
        </button>
      </div>

      <a
        href={SPOTIFY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 py-2 text-xs font-chrome tracking-wide transition-colors"
      >
        OPEN IN SPOTIFY
      </a>
    </div>
  );
}
