"use client";

import { useState } from "react";
import { CountdownWidget } from "@/components/countdown/CountdownWidget";

export function CountdownMiniWindow() {
  const [jitter, setJitter] = useState(false);

  return (
    <div
      className="win98-border bg-persona-surface fixed top-14 right-3 z-[300] w-56"
      style={jitter ? { animation: "jitter 0.25s" } : undefined}
    >
      <div className="bg-persona-titlebar text-white flex items-center justify-between px-1.5 py-1">
        <span className="font-chrome text-xs tracking-wide">Countdown</span>
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            setJitter(true);
            setTimeout(() => setJitter(false), 250);
          }}
          className="win98-border w-4 h-4 flex items-center justify-center text-black bg-persona-surface text-[10px] leading-none"
        >
          X
        </button>
      </div>
      <div className="p-2">
        <CountdownWidget />
      </div>
      <style jsx>{`
        @keyframes jitter {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-3px);
          }
          75% {
            transform: translateX(3px);
          }
        }
      `}</style>
    </div>
  );
}
