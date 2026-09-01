// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { useEffect, useId, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import GalleryTunnel from "@/components/originkit/ui/hero-03/gallery-tunnel";
import { useTunnelConfig } from "@/components/originkit/ui/hero-03/use-tunnel-size";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-03/${file}`;
}

const TUNNEL_IMAGES = [
  { src: asset("portraits-portrait-01.png"), alt: "Editorial portrait" },
  { src: asset("portraits-portrait-03.png"), alt: "Studio portrait" },
  { src: asset("portraits-portrait-06.png"), alt: "Fashion portrait" },
  { src: asset("portraits-portrait-08.png"), alt: "Action portrait" },
  { src: asset("portraits-portrait-04.png"), alt: "Lifestyle portrait" },
];

const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

type GalleryOverlayImage = { src: string; alt?: string };

type GalleryOverlayProps = {
  open: boolean;
  onClose: () => void;
  images?: GalleryOverlayImage[];
  background?: string;
  lineColor?: string;
  colors?: string[];
  panelBackground?: string;
  textColor?: string;
};

export const GalleryOverlay = ({
  open,
  onClose,
  images = TUNNEL_IMAGES,
  background = "#FFFBE1",
  lineColor = "#D7CFA4",
  colors,
  panelBackground = "#fffbe1",
  textColor = "#1d1d1d",
}: GalleryOverlayProps) => {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const { tunnelSize, fade, boost } = useTunnelConfig();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: panelBackground }}
    >
      <h2 id={titleId} className="sr-only">
        Interactive portrait gallery tunnel
      </h2>

      <div className="relative z-10 flex items-center justify-between px-4 py-4 android-sm:px-6 desktop-sm:px-8">
        <p className="font-tight text-[15px] tracking-[-0.3px]" style={{ color: `${textColor}b3` }}>
          Hold to speed up · Esc to close
        </p>
        <button
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-solid px-4 font-tight text-[14px] font-medium tracking-[-0.28px] transition-[opacity,transform] duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90"
          style={{ borderColor: "#c8c8c8", background: "#ffffff", color: "#1d1d1d" }}
        >
          Close
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1"
        onKeyDown={handleBackdropKeyDown}
      >
        <GalleryTunnel
          background={background}
          lineColor={lineColor}
          lineOpacity={50}
          {...(colors ? { colors } : {})}
          grid={4}
          tunnelSize={tunnelSize}
          speed={reduceMotion ? 0 : 9}
          boost={reduceMotion ? 0 : boost}
          fade={fade}
          label={false}
          images={images}
        />
      </div>
    </motion.div>
  );
};
