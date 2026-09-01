// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { useReducedMotion } from "motion/react";
import GalleryTunnel from "@/components/originkit/ui/hero-03/gallery-tunnel";
import { useTunnelConfig } from "@/components/originkit/ui/hero-03/use-tunnel-size";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-03/${file}`;
}

/** Figma / Originkit control values for the hero tunnel */
const TUNNEL_IMAGES = [
  { src: asset("portraits-portrait-01.png"), alt: "Editorial portrait" },
  { src: asset("portraits-portrait-03.png"), alt: "Studio portrait" },
  { src: asset("portraits-portrait-06.png"), alt: "Fashion portrait" },
  { src: asset("portraits-portrait-08.png"), alt: "Action portrait" },
  { src: asset("portraits-portrait-04.png"), alt: "Lifestyle portrait" },
];

/**
 * Animated Three.js gallery tunnel.
 * Click/hold empty areas to boost; UI stays clickable above.
 */
export const PerspectiveBackground = () => {
  const reduceMotion = useReducedMotion();
  const { tunnelSize, fade, boost } = useTunnelConfig();

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
    >
      <GalleryTunnel
        background="#FFFBE1"
        lineColor="#D7CFA4"
        lineOpacity={50}
        grid={4}
        tunnelSize={tunnelSize}
        speed={reduceMotion ? 0 : 9}
        boost={reduceMotion ? 0 : boost}
        fade={fade}
        label={false}
        images={TUNNEL_IMAGES}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Soft center veil — stronger on desktop to match design wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,251,225,0.55)_0%,rgba(255,251,225,0.22)_40%,transparent_64%)] ipad:bg-[radial-gradient(ellipse_at_center,rgba(255,251,225,0.62)_0%,rgba(255,251,225,0.3)_38%,transparent_62%)] desktop-sm:bg-[radial-gradient(ellipse_at_center,rgba(255,251,225,0.72)_0%,rgba(255,251,225,0.38)_36%,transparent_60%)]" />
    </div>
  );
};
