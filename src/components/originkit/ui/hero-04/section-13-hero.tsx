// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { HeroContent } from "@/components/originkit/ui/hero-04/hero-content";
import { Navbar } from "@/components/originkit/ui/hero-04/navbar";
import { RingStage } from "@/components/originkit/ui/hero-04/ring-stage";
import { TexturedBackground } from "@/components/originkit/ui/hero-04/textured-background";

export const Section13Hero = () => {
  const handleExploreArtists = () => {
    window.location.hash = "#artists";
  };

  const handleListenNow = () => {
    window.location.hash = "#listen";
  };

  const handleStartListening = () => {
    window.location.hash = "#start";
  };

  return (
    <section
      aria-label="Lyrista artist ring gallery"
      className="relative isolate min-h-screen w-full overflow-hidden bg-[#901214] ipad:h-auto ipad:overflow-visible desktop-sm:h-auto desktop-sm:min-h-screen desktop-sm:overflow-visible"
    >
      {/* Full-bleed — red + gravity cover the whole viewport */}
      <TexturedBackground />

      {/* Content — max-w only at wide-lg+; below that stays full width */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-none flex-col wide-lg:max-w-[1440px]">
        <Navbar onStartListening={handleStartListening} />

        {/*
          Flex stack on all breakpoints (no absolute stage):
          Mobile/tablet: hero → ring
          Desktop: ring fills middle (order-1), hero sits at bottom (order-2)
        */}
        <div className="relative flex flex-1 flex-col items-center gap-8 overflow-hidden px-4 pb-8 ipad:gap-12 ipad:overflow-visible ipad:px-0 ipad:pb-12 desktop-sm:gap-10 desktop-sm:overflow-visible desktop-sm:px-[52px] desktop-sm:pb-[52px]">
          <HeroContent
            onExploreArtists={handleExploreArtists}
            onListenNow={handleListenNow}
          />

          <div className="flex w-full shrink-0 justify-center desktop-sm:order-1 desktop-sm:min-h-0 desktop-sm:flex-1 desktop-sm:items-center desktop-sm:pt-6.5">
            <RingStage />
          </div>
        </div>
      </div>
    </section>
  );
};
