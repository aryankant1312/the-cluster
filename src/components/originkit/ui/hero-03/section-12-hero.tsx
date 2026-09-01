// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { useState } from "react";
import { GalleryOverlay } from "@/components/originkit/ui/hero-03/gallery-overlay";
import { HeroContent } from "@/components/originkit/ui/hero-03/hero-content";
import { Navbar } from "@/components/originkit/ui/hero-03/navbar";
import { PerspectiveBackground } from "@/components/originkit/ui/hero-03/perspective-background";

export const Section12Hero = () => {
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleExplore = () => {
    setGalleryOpen(true);
  };

  const handleCloseGallery = () => {
    setGalleryOpen(false);
  };

  const handleBook = () => {
    window.location.hash = "#book";
  };

  return (
    <section
      aria-label="Portrait perspective gallery"
      className="relative isolate w-full overflow-hidden bg-[#fffbe1]"
    >
      <div className="relative mx-auto flex h-screen w-full max-w-[1600px] flex-col wide-lg:max-w-none">
        <PerspectiveBackground />

        <Navbar onExplore={handleExplore} />

        <div className="pointer-events-none relative z-20 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-6 ipad:px-12 desktop-sm:px-6 desktop-sm:pb-20 desktop-sm:pt-6">
          <HeroContent onExplore={handleExplore} onBook={handleBook} />
        </div>
      </div>

      <GalleryOverlay open={galleryOpen} onClose={handleCloseGallery} />
    </section>
  );
};
