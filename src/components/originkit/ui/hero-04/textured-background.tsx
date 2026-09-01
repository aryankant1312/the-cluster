// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-04/${file}`;
}

/**
 * Desktop Figma artboard: 1440 × 1012
 * Tablet Figma frame: 744 × 1133
 * Mobile Figma frame: 402 × 874
 *
 * shadow-black.png is derived from shadow.png (4096×3089) — same dimensions and
 * light-ray positions/count, with white glow remapped to black + alpha.
 */
const DESKTOP_W = 1440;
const DESKTOP_H = 1012;
const TABLET_W = 744;
const TABLET_H = 1133;
const MOBILE_W = 402;
const MOBILE_H = 874;

/** Oversized repeating gravity fill — rotate on the same node so it never leaves gaps. */
type GravityLayerProps = {
  className?: string;
  left: string;
  top: string;
  width: string;
  height: string;
  /** When true, center with translate(-50%, -50%) from left/top anchor */
  centered?: boolean;
};

const GravityLayer = ({
  className = "",
  left,
  top,
  width,
  height,
  centered = false,
}: GravityLayerProps) => (
  <div
    className={`absolute opacity-60 ${className}`}
    style={{
      left,
      top,
      width,
      height,
      transform: centered
        ? "translate(-50%, -50%) rotate(-19.96deg)"
        : "rotate(-19.96deg)",
      backgroundImage: `url(${asset("textures-gravity.png")})`,
      backgroundSize: "320px 233px",
      backgroundRepeat: "repeat",
      backgroundPosition: "left top",
    }}
  />
);

type ShadowWashProps = {
  className?: string;
  left: string;
  top: string;
  width: string;
  height: string;
};

const ShadowWash = ({
  className = "",
  left,
  top,
  width,
  height,
}: ShadowWashProps) => (
  <div
    aria-hidden="true"
    data-shadow-wash=""
    className={`absolute bg-center bg-cover bg-no-repeat mix-blend-multiply opacity-30 ${className}`}
    style={{
      left,
      top,
      width,
      height,
      backgroundColor: "transparent",
      backgroundImage: `url(${asset("textures-shadow-black.png")})`,
    }}
  />
);

export const TexturedBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#901214]"
    >
      {/* Mobile gravity — centered + oversized so lines cover full page after rotation */}
      <GravityLayer
        className="ipad:hidden"
        left="50%"
        top="50%"
        width={`${(2128.602 / MOBILE_W) * 100}%`}
        height={`${(2025.023 / MOBILE_H) * 100}%`}
        centered
      />

      {/* Tablet gravity — centered + oversized so grooves cover full viewport height */}
      <GravityLayer
        className="hidden ipad:block desktop-sm:hidden"
        left="50%"
        top="50%"
        width={`${(2128.602 / TABLET_W) * 100}%`}
        height={`${(2025.023 / TABLET_H) * 100}%`}
        centered
      />

      {/* Desktop gravity */}
      <GravityLayer
        className="hidden desktop-sm:block"
        left={`${(-326.77 / DESKTOP_W) * 100}%`}
        top={`${(-478.79 / DESKTOP_H) * 100}%`}
        width={`${(2128.602 / DESKTOP_W) * 100}%`}
        height={`${(2025.023 / DESKTOP_H) * 100}%`}
      />

      {/* Mobile shadow */}
      <ShadowWash
        className="ipad:hidden"
        left={`${(-379 / MOBILE_W) * 100}%`}
        top={`${(-1 / MOBILE_H) * 100}%`}
        width={`${(1160 / MOBILE_W) * 100}%`}
        height={`${(875 / MOBILE_H) * 100}%`}
      />

      {/* Tablet shadow */}
      <ShadowWash
        className="hidden ipad:block desktop-sm:hidden"
        left={`${(-424 / TABLET_W) * 100}%`}
        top={`${(-1 / TABLET_H) * 100}%`}
        width={`${(1592 / TABLET_W) * 100}%`}
        height={`${(1201 / TABLET_H) * 100}%`}
      />

      {/* Desktop shadow */}
      <ShadowWash
        className="hidden desktop-sm:block"
        left={`${(-1 / DESKTOP_W) * 100}%`}
        top={`${(-1 / DESKTOP_H) * 100}%`}
        width={`${(1592 / DESKTOP_W) * 100}%`}
        height={`${(1201 / DESKTOP_H) * 100}%`}
      />
    </div>
  );
};
