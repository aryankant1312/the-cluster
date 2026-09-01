"use client";

import React from "react";
import Image from "next/image";

export function CandleFlame() {
  return (
    <div
      className="absolute pointer-events-none z-20 flex items-center justify-center"
      style={{
        left: "50.74%",
        top: "63.61%",
        transform: "translate(-50%, -82%)",
      }}
    >
      {/* Soft golden ambient radial light cast on table & candle body */}
      <div
        className="candle-halo-anim absolute w-32 h-32 rounded-full pointer-events-none mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255, 190, 40, 0.5) 0%, rgba(255, 130, 0, 0.22) 45%, transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      {/* Realistic GIF Flame seamlessly blended onto candle wick via mix-blend-screen */}
      <div className="relative w-12 h-20 pointer-events-none mix-blend-screen opacity-95">
        <Image
          src="/images/candle-flame-real.gif"
          alt="Live Candle Flame"
          fill
          unoptimized
          className="object-contain object-bottom filter drop-shadow-[0_0_12px_rgba(255,170,0,0.9)]"
        />
      </div>
    </div>
  );
}

