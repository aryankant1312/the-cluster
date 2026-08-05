"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useCountdown } from "@/hooks/use-countdown";
import { useRotatingCopy } from "@/hooks/use-rotating-copy";
import { usePersona } from "@/components/providers/PersonaProvider";
import { siteSettings } from "@/content/site-settings";
import { copyPool } from "@/content/copy-pool";
import spectrumArt from "../../../public/images/countdown/the-dotm-spectrum.png";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownStandalone() {
  const { locale } = usePersona();
  const state = useCountdown(siteSettings.countdownTarget);
  const line = useRotatingCopy(copyPool.countdownLines);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      {state.phase === "arrived" ? (
        <p className="font-headline text-persona-fg text-3xl sm:text-5xl tracking-wide">
          THE SPECTRUM HAS ARRIVED.
        </p>
      ) : (
        <>
          <div className="flex gap-4 sm:gap-8 font-chrome text-persona-fg tabular-nums">
            {[
              { value: state.days, label: "DAYS" },
              { value: state.hours, label: "HRS" },
              { value: state.minutes, label: "MIN" },
              { value: state.seconds, label: "SEC" },
            ].map((unit) => (
              <div key={unit.label} className="flex flex-col items-center">
                <span className="text-5xl sm:text-8xl">{pad(unit.value)}</span>
                <span className="text-xs sm:text-sm text-fg-muted tracking-widest mt-2">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
          <p
            className={
              state.phase === "t24h"
                ? "font-chrome text-danger text-sm sm:text-base tracking-widest animate-pulse"
                : "font-chrome text-fg-muted text-sm sm:text-base tracking-widest"
            }
          >
            {state.phase === "t24h" ? "TWENTY-FOUR HOURS." : line[locale]}
          </p>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
        className="relative w-56 sm:w-72 aspect-[3/4]"
      >
        <Image
          src={spectrumArt}
          alt="The DOTM Spectrum"
          fill
          className="object-contain"
          sizes="288px"
        />
      </motion.div>
    </main>
  );
}
