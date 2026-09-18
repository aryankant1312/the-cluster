"use client";

import { useEffect, useRef } from "react";

export function DevDesktopWallpaper({ src, poster }: { src: string; poster?: string }) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const videos = [a.current!, b.current!];
    let active = 0;
    let swapping = false;
    let cancelled = false;
    let frame = 0;
    let cleanupTimer: ReturnType<typeof setTimeout>;
    const fadeMs = 700;
    videos.forEach((video, i) => {
      video.muted = true;
      video.style.opacity = i === 0 ? "1" : "0";
      video.style.zIndex = i === 0 ? "1" : "0";
    });
    void videos[0].play().catch(() => {});
    const swap = async () => {
      if (swapping || cancelled) return;
      swapping = true;
      const outgoing = videos[active];
      const incoming = videos[1 - active];
      incoming.currentTime = 0;
      try {
        await incoming.play();
        if (cancelled) return;
        // play() resolves once playback starts; retain the outgoing image underneath.
        incoming.style.transition = "none";
        incoming.style.opacity = "0";
        incoming.style.zIndex = "2";
        outgoing.style.zIndex = "1";
        frame = requestAnimationFrame(() => {
          incoming.style.transition = `opacity ${fadeMs}ms linear`;
          incoming.style.opacity = "1";
          cleanupTimer = setTimeout(() => {
            outgoing.style.opacity = "0";
            outgoing.pause();
            outgoing.currentTime = 0;
            active = 1 - active;
            swapping = false;
          }, fadeMs);
        });
      } catch {
        swapping = false;
      }
    };
    const timer = setInterval(() => {
      const video = videos[active];
      if (Number.isFinite(video.duration) && video.duration - video.currentTime <= 0.9) void swap();
    }, 40);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(cleanupTimer);
      cancelAnimationFrame(frame);
      videos.forEach(video => video.pause());
    };
  }, [src]);
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black">
      <video ref={a} src={src} poster={poster} muted playsInline preload="auto" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      <video ref={b} src={src} muted playsInline preload="auto" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-0" />
    </div>
  );
}
