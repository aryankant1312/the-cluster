"use client";

import { useState } from "react";
import { useReducedMotion, motion } from "motion/react";
import GalleryTunnel from "@/components/originkit/ui/hero-03/gallery-tunnel";
import { GalleryOverlay } from "@/components/originkit/ui/hero-03/gallery-overlay";
import { useTunnelConfig } from "@/components/originkit/ui/hero-03/use-tunnel-size";
import { Button } from "@/components/originkit/ui/hero-03/button";

const CLUSTER_IMAGES = [
  { src: "/images/dotm/cluster-wall/LTS%201.png", alt: "LTS 1" },
  { src: "/images/dotm/cluster-wall/LTS%203.png", alt: "LTS 3" },
  { src: "/images/dotm/cluster-wall/Finding%20Peace%20BG.png", alt: "Finding Peace" },
  { src: "/images/dotm/cluster-wall/credits%20KUVVET-25.jpg", alt: "Credits 25" },
  { src: "/images/dotm/cluster-wall/Track%20List%20(prod.%20RED).png", alt: "Track List" },
  { src: "/images/dotm/cluster-wall/credits%20KUVVET-6.jpg", alt: "Credits 6" },
  { src: "/images/dotm/cluster-wall/Screenshot%202025-02-07%20052548.png", alt: "Studio" },
];

const RED_ACCENTS = ["#ff0033", "#c90020", "#8f0016", "#ff2f5c", "#440008", "#ffffff"];
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

export function DotmClusterWall() {
  const reduceMotion = useReducedMotion();
  const { tunnelSize, fade, boost } = useTunnelConfig();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const reveal = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 14, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { type: "tween" as const, duration: 0.5, ease: EASE_OUT, delay },
        };

  return (
    <section
      aria-label="DOTM cluster wall"
      className="relative isolate h-full w-full overflow-hidden bg-[#050505] text-white"
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <GalleryTunnel
          background="#050505"
          lineColor="#3a0006"
          lineOpacity={70}
          colors={RED_ACCENTS}
          grid={4}
          tunnelSize={tunnelSize}
          speed={reduceMotion ? 0 : 9}
          boost={reduceMotion ? 0 : boost}
          fade={fade}
          label={false}
          images={CLUSTER_IMAGES}
          style={{ width: "100%", height: "100%" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,5,5,0.55)_0%,rgba(5,5,5,0.28)_42%,transparent_66%)]" />
      </div>

      <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-6 pb-16 pt-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[280px] w-[420px] -translate-x-1/2 -translate-y-1/2 bg-[#0a0000] blur-[52px] opacity-70"
        />

        <div className="pointer-events-none relative flex w-full max-w-[560px] flex-col items-center gap-8">
          <motion.h1
            {...reveal(0.1)}
            className="text-center font-instrument-serif text-[46px] leading-[54px] tracking-[-1.4px] text-white sm:text-[62px] sm:leading-[68px] sm:tracking-[-1.8px]"
          >
            The Cluster is a Wall of the Faithful.
          </motion.h1>

          <motion.p
            {...reveal(0.2)}
            className="max-w-[380px] text-center font-tight text-[15px] leading-relaxed tracking-[-0.3px] text-white/70 sm:text-[17px]"
          >
            Portraits, sessions, and stray moments from the DOTM camp. Step
            through the tunnel to see them all.
          </motion.p>

          <motion.div
            {...reveal(0.32)}
            className="pointer-events-auto flex items-center justify-center gap-4"
          >
            <Button
              variant="primary"
              aria-label="Explore the wall"
              onClick={() => setGalleryOpen(true)}
              style={{
                background: "#ff0033",
                color: "#050505",
                boxShadow: "0 8px 30px rgba(255,0,51,0.35)",
              }}
            >
              Explore the Wall
            </Button>
          </motion.div>
        </div>
      </div>

      <GalleryOverlay
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={CLUSTER_IMAGES}
        background="#050505"
        lineColor="#3a0006"
        colors={RED_ACCENTS}
        panelBackground="#050505"
        textColor="#ffffff"
      />
    </section>
  );
}
