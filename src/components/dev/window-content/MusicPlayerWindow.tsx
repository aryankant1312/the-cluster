"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { tracks } from "@/content/tracks";
import { getAudioSource } from "@/lib/audio-source";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function MusicPlayerWindow() {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const track = tracks[index];
  const src = getAudioSource(track);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowLyrics(false);
    // Unmounting this whole window (close/minimize) tears down the <audio>
    // element too, which stops playback — no separate cleanup needed here.
  }, [index]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const goTo = (nextIndex: number) => {
    setIndex((nextIndex + tracks.length) % tracks.length);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <div className="w-64">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => goTo(index + 1)}
        />
      )}

      <div className="relative aspect-square win98-border">
        <Image src={track.thumbnail} alt={track.title} fill className="object-cover" sizes="256px" />
        <button
          type="button"
          onClick={() => setShowLyrics((v) => !v)}
          aria-label="Lyrics"
          className="absolute top-1.5 right-1.5 win98-border w-6 h-6 bg-white/85 flex items-center justify-center text-xs font-chrome"
        >
          L
        </button>
        {showLyrics && (
          <div className="absolute inset-0 bg-black/85 text-white text-xs p-3 overflow-auto">
            <p className="font-chrome mb-1">LYRICS</p>
            <p className="text-white/60">
              {track.lyrics ?? "LYRICS COMING SOON. CHECK BACK LATER."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-2 text-black">
        <div>
          <p className="font-chrome text-sm leading-tight">{track.title}</p>
          <p className="text-[11px] text-fg-muted">{track.artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!src}
          className="win98-border bg-white w-8 h-8 flex items-center justify-center text-black disabled:opacity-40"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <span className="text-[11px] text-black tabular-nums w-20">
          {src ? `${formatTime(currentTime)}/${formatTime(duration)}` : "UNAVAILABLE"}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          disabled={!src}
          className="flex-1 accent-black"
        />
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className={cn("win98-border bg-white flex-1 py-1 text-xs text-black")}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className={cn("win98-border bg-white flex-1 py-1 text-xs text-black")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
