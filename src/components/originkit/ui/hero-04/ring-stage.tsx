// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { motion, useReducedMotion } from "motion/react";
import CircleImage from "@/components/originkit/ui/hero-04/ring-gallery";
import { VinylDisc } from "@/components/originkit/ui/hero-04/vinyl-disc";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-04/${file}`;
}

/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

const RING_IMAGES = [
  {
    image: {
      src: asset("portraits-artist-01.png"),
      alt: "Artist portrait",
    },
    focusY: 30,
  },
  {
    image: {
      src: asset("portraits-artist-02.png"),
      alt: "Artist portrait",
    },
    focusY: 25,
  },
  {
    image: {
      src: asset("portraits-artist-03.png"),
      alt: "Artist portrait",
    },
    focusY: 35,
  },
  {
    image: {
      src: asset("portraits-artist-04.png"),
      alt: "Artist portrait",
    },
    focusY: 20,
  },
  {
    image: {
      src: asset("portraits-artist-05.png"),
      alt: "Artist portrait",
    },
    focusY: 40,
  },
  // {
  //   image: {
  //     src: asset("portraits-artist-06.png"),
  //     alt: "Artist portrait",
  //   },
  //   focusY: 30,
  // },
  {
    image: {
      src: asset("portraits-artist-07.png"),
      alt: "Artist portrait",
    },
    focusY: 25,
  },
  {
    image: {
      src: asset("portraits-artist-08.png"),
      alt: "Artist portrait",
    },
    focusY: 35,
  },
  {
    image: {
      src: asset("portraits-artist-09.png"),
      alt: "Artist portrait",
    },
    focusY: 30,
  },
] as const;

type RingImage = (typeof RING_IMAGES)[number];

/**
 * Not random. Originkit `repeat` concatenates the list N times
 * ([1..9, 1..9, 1..9]), so the same portrait reappears every 9 slots.
 * We expand with a rotating offset per cycle so the same src never sits
 * next to itself at cycle seams, then pass `repeat: 1`.
 */
const expandRingImages = (images: readonly RingImage[], times: number) => {
  const list = [...images];
  const count = list.length;
  if (count === 0) return [];

  const out: RingImage[] = [];
  const rounds = Math.max(1, Math.round(times));

  for (let round = 0; round < rounds; round++) {
    const offset = (round * 3) % count;
    const cycle = Array.from(
      { length: count },
      (_, i) => list[(i + offset) % count],
    );

    if (out.length > 0) {
      const prevSrc = out[out.length - 1]?.image.src;
      if (cycle[0]?.image.src === prevSrc) {
        const swapAt = cycle.findIndex((item) => item.image.src !== prevSrc);
        if (swapAt > 0) {
          const [moved] = cycle.splice(swapAt, 1);
          cycle.unshift(moved);
        }
      }
    }

    out.push(...cycle);
  }

  return out;
};

const RING_CARDS = expandRingImages(RING_IMAGES, 3);

type RingLayerProps = {
  cardWidth: number;
  cardHeight: number;
  ringRadius: number;
  discSize: number;
};

const RingLayer = ({
  cardWidth,
  cardHeight,
  ringRadius,
  discSize,
}: RingLayerProps) => (
  <>
    <VinylDisc size={discSize} />

    <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <CircleImage
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        rounded={14}
        ring={{
          radiusX: ringRadius,
          radiusY: ringRadius,
          tilt: true,
          repeat: 1,
        }}
        direction="anticlockwise"
        drag={true}
        transition={{ type: "tween", ease: "linear", duration: 28 }}
        images={[...RING_CARDS]}
      />
    </div>
  </>
);

export const RingStage = () => {
  const reduceMotion = useReducedMotion();

  const motionProps = {
    initial: reduceMotion
      ? { opacity: 1, scale: 1 }
      : { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: reduceMotion
      ? { duration: 0 }
      : { type: "tween" as const, duration: 0.5, ease: EASE_OUT },
  };

  return (
    <>
      {/* Mobile — in-flow flex child; centered */}
      <div
        className="pointer-events-none relative flex w-full shrink-0 items-center justify-center ipad:hidden"
        aria-hidden="true"
      >
        <motion.div {...motionProps} className="relative size-[370px]">
          <RingLayer
            cardWidth={51}
            cardHeight={56}
            ringRadius={143}
            discSize={370}
          />
        </motion.div>
      </div>

      {/* Tablet — in-flow flex child; centered */}
      <div
        className="pointer-events-none relative mx-auto hidden w-[612px] shrink-0 justify-center ipad:flex desktop-sm:hidden"
        aria-hidden="true"
      >
        <motion.div {...motionProps} className="relative size-[612px]">
          <RingLayer
            cardWidth={85}
            cardHeight={92}
            ringRadius={237}
            discSize={612}
          />
        </motion.div>
      </div>

      {/* Desktop / wide — in-flow flex child; centered (no absolute → no nav overlap) */}
      <div
        className="pointer-events-none relative mx-auto hidden w-[770px] shrink-0 items-center justify-center desktop-sm:flex"
        aria-hidden="true"
      >
        <motion.div {...motionProps} className="relative size-[770px]">
          <RingLayer
            cardWidth={107}
            cardHeight={116}
            ringRadius={298}
            discSize={770}
          />
        </motion.div>
      </div>
    </>
  );
};
