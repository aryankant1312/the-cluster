// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/originkit/ui/hero-04/button";

/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

type HeroContentProps = {
  onExploreArtists: () => void;
  onListenNow: () => void;
};

export const HeroContent = ({
  onExploreArtists,
  onListenNow,
}: HeroContentProps) => {
  const reduceMotion = useReducedMotion();

  const reveal = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 14, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: {
            type: "tween" as const,
            duration: 0.45,
            ease: EASE_OUT,
            delay,
          },
        };

  return (
    <div
      className={[
        "pointer-events-none relative z-20 flex w-full shrink-0 flex-col items-center gap-6 pt-10",
        /* Tablet — in-flow */
        "ipad:w-[454px] ipad:gap-8 ipad:pt-[34px]",
        /* Desktop — in-flow at bottom of flex stack (after ring via order) */
        "desktop-sm:order-2 desktop-sm:mt-auto desktop-sm:w-full desktop-sm:flex-row desktop-sm:items-end desktop-sm:justify-between desktop-sm:gap-8 desktop-sm:pt-0",
      ].join(" ")}
    >
      <div className="pointer-events-auto flex w-full max-w-[370px] flex-col items-center gap-3 ipad:max-w-none ipad:gap-4 desktop-sm:max-w-[464px] desktop-sm:items-start desktop-sm:gap-0">
        <motion.h1
          {...reveal(0.12)}
          className="w-full text-center font-instrument-serif text-[56px] leading-[1.1] tracking-[-1.68px] text-white text-balance ipad:text-[72px] ipad:tracking-[-2.16px] desktop-sm:text-left desktop-sm:text-[66px] desktop-sm:leading-[84px] desktop-sm:tracking-normal"
        >
          Spin Into the World of Top Artists.
        </motion.h1>

        <motion.p
          {...reveal(0.22)}
          className="w-full max-w-92.5 text-center font-tight text-[16px] leading-[1.4] tracking-[-0.32px] text-white/60 text-pretty ipad:max-w-105 ipad:text-[18px] ipad:tracking-[-0.36px] desktop-sm:hidden"
        >
          Experience music through the artists behind every hit, every genre,
          and every unforgettable moment.
        </motion.p>
      </div>

      <div className="pointer-events-auto flex w-full max-w-92.5 flex-col gap-4 ipad:max-w-none ipad:items-center desktop-sm:max-w-109 desktop-sm:items-stretch desktop-sm:gap-8">
        <motion.p
          {...reveal(0.22)}
          className="hidden text-left font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] text-white/60 text-pretty desktop-sm:block"
        >
          Experience music through the artists behind every hit, every genre,
          and every unforgettable moment.
        </motion.p>

        <motion.div
          {...reveal(0.32)}
          className="flex w-full flex-col gap-4 ipad:w-auto ipad:flex-row ipad:items-center ipad:justify-start ipad:gap-4 desktop-sm:flex-row desktop-sm:flex-wrap desktop-sm:items-center desktop-sm:gap-6"
        >
          <Button
            variant="glass"
            aria-label="Explore Artists"
            onClick={onExploreArtists}
            className="w-full ipad:w-auto desktop-sm:w-auto"
          >
            Explore Artists
          </Button>
          <Button
            variant="ghost"
            aria-label="Listen Now"
            onClick={onListenNow}
            className="w-full ipad:w-auto desktop-sm:w-auto"
          >
            Listen Now
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
