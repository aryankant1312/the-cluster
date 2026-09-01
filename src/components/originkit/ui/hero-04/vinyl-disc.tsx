// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-04/${file}`;
}

type VinylDiscProps = {
  /** Outer diameter in px. Defaults to filling the parent (`size-full`). */
  size?: number;
  /**
   * Art for the centre label. Defaults to the stock Originkit mark, which is
   * a generic glyph with no meaning in this project — DOTM's music window
   * passes the Cluster Wall logo instead.
   */
  centerLogo?: string;
  /** Set when `centerLogo` is full-bleed art rather than a small line mark. */
  centerLogoFullBleed?: boolean;
};

/**
 * Figma node 1:628 (tablet 612) — layers scale as % of outer diameter.
 *
 * Outer rim: cool grey radial (#3a3a3a → #0e0e0e), NOT warm brown.
 * Mid shell: warm brown (#271408 → #0f0601).
 * Vinyl body: cool near-black (#1c1c1c → #050505) + soft specular + grooves.
 * Label: burnt orange radial (#c8420a → #4a0f00).
 */
export const VinylDisc = ({
  size,
  centerLogo = asset("center-logo.svg"),
  centerLogoFullBleed = false,
}: VinylDiscProps) => {
  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 rounded-full shadow-[0_9px_44px_rgba(0,0,0,0.8)] ${size ? "" : "size-full"}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Outer rim — cool charcoal (Figma 1:628) */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,#3a3a3a_0%,#2b2b2b_22.5%,#1c1c1c_45%,#0e0e0e_100%)] shadow-[inset_0_2px_7px_rgba(255,255,255,0.08),inset_0_-2px_7px_rgba(0,0,0,0.6)]" />

      {/* Mid shell — warm brown (593.6/612 ≈ inset 1.5%) */}
      <div className="absolute inset-[1.5%] rounded-full bg-[radial-gradient(circle_at_50%_50%,#271408_0%,#160a02_80%,#0f0601_100%)]" />

      {/* Vinyl body — cool near-black (558/612 ≈ inset 4.42%) */}
      <div className="absolute inset-[4.42%] overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_50%,#1c1c1c_0%,#0a0a0a_55%,#050505_100%)] shadow-[inset_0_0_33px_rgba(0,0,0,0.7)]">
        {/* Specular wash (top-left) */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_25%,transparent_55%)]" />

        {/* Grooves — 514/612 ≈ 84% */}
        <img
          src={asset("textures-vinyl-grooves.svg")}
          alt=""
          width={646}
          height={646}
          className="absolute left-1/2 top-1/2 size-[84%] -translate-x-1/2 -translate-y-1/2 opacity-90"
        />
      </div>

      {/* Center label — 206/612 ≈ 33.7% */}
      <div className="absolute left-1/2 top-1/2 size-[33.7%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-[radial-gradient(circle_at_42%_36%,#c8420a_0%,#aa3105_27.5%,#8b1f00_55%,#6b1700_77.5%,#4a0f00_100%)] shadow-[0_0_0_1.5px_rgba(0,0,0,0.7),0_3px_13px_rgba(0,0,0,0.6)]">
        {/* Specular wash */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.15)_0%,rgba(128,128,128,0.075)_27.5%,transparent_55%)]" />

        {/* Concentric rings — Figma 1:639–641 */}
        <div className="absolute inset-[7.48%] rounded-full border border-[rgba(255,120,120,0.2)]" />
        <div className="absolute inset-[17.38%] rounded-full border border-[rgba(246,26,26,0.2)]" />
        <div className="absolute inset-[27.54%] rounded-full border border-[rgba(255,120,120,0.2)]" />

        <div className="absolute inset-0 flex items-center justify-center">
          {/* Logo — 48.5/206 ≈ 23.5% of label for a line mark. Full-bleed art
              takes the whole label instead, clipped to the label's circle. */}
          <img
            src={centerLogo}
            alt=""
            width={61}
            height={61}
            className={
              centerLogoFullBleed
                ? "absolute inset-0 size-full rounded-full object-cover"
                : "relative size-[23.5%]"
            }
          />
        </div>
      </div>
    </div>
  );
};
