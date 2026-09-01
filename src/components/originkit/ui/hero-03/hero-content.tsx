// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/originkit/ui/hero-03/button";

/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

type HeroContentProps = {
  onExplore: () => void;
  onBook: () => void;
};

export const HeroContent = ({ onExplore, onBook }: HeroContentProps) => {
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
    <div className="pointer-events-none relative z-20 flex w-full max-w-[378px] flex-col items-center gap-[34px] ipad:max-w-[490px] ipad:gap-[44px] desktop-sm:max-w-[502px] desktop-sm:gap-8">
      {/* Soft cream veil so tunnel lines don’t fight the type */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[360px] -translate-x-1/2 -translate-y-1/2 bg-[#fffbe1] blur-[36px] ipad:h-[497px] ipad:w-[591px] ipad:blur-[56px] desktop-sm:h-[364px] desktop-sm:w-[433px] desktop-sm:blur-[41px]"
      />

      <div className="relative flex w-full flex-col items-center gap-[34px] ipad:gap-[44px] desktop-sm:gap-8">
        <div className="flex w-full flex-col items-center gap-[17px] ipad:gap-[22px] desktop-sm:gap-4">
          <motion.h1
            {...reveal(0.12)}
            className="w-full max-w-[378px] text-center font-instrument-serif text-[46px] leading-[54px] tracking-[-1.38px] text-[#1d1d1d] text-balance ipad:max-w-[490px] ipad:text-[62px] ipad:leading-[75px] ipad:tracking-[-1.86px] desktop-sm:max-w-[502px] desktop-sm:text-[68px] desktop-sm:leading-[70px] desktop-sm:tracking-[-2.04px]"
          >
            Elevating Portraits Through Perspective
          </motion.h1>

          <motion.p
            {...reveal(0.22)}
            className="w-full max-w-[338px] text-center font-tight text-[14px] leading-normal tracking-[-0.28px] text-[#1d1d1d]/65 text-pretty ipad:max-w-[438px] ipad:text-[18px] ipad:tracking-[-0.36px] desktop-sm:max-w-[321px] desktop-sm:text-[17px] desktop-sm:leading-[25.5px] desktop-sm:tracking-[-0.34px]"
          >
            Thoughtfully crafted portraits with refined lighting, style, and
            timeless storytelling.
          </motion.p>
        </div>

        <motion.div
          {...reveal(0.32)}
          className="pointer-events-auto flex flex-nowrap items-center justify-center gap-[17px] ipad:gap-[22px] desktop-sm:gap-4"
        >
          <Button variant="primary" aria-label="Explore Gallery" onClick={onExplore}>
            Explore Gallery
          </Button>
          <Button variant="secondary" aria-label="Book a Shoot" onClick={onBook}>
            Book a Shoot
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
