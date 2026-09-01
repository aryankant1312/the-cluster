// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { Button } from "@/components/originkit/ui/hero-03/button";
import type { KeyboardEvent } from "react";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-03/${file}`;
}

const NAV_LINKS = [
  { label: "Docs", href: "#docs" },
  { label: "Blog", href: "#blog" },
  { label: "Discord", href: "#discord" },
  { label: "Twitter", href: "#twitter" },
] as const;

type NavbarProps = {
  onExplore: () => void;
};

export const Navbar = ({ onExplore }: NavbarProps) => {
  const handleKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    window.location.hash = href;
  };

  return (
    <nav aria-label="Primary" className="relative z-30 w-full">
      <div className="flex w-full items-center justify-between p-4 ipad:px-12 ipad:py-8 desktop-sm:hidden">
        <a
          href="#"
          aria-label="LUXE home"
          className="inline-flex items-center gap-[11px] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1d] [-webkit-tap-highlight-color:transparent]"
        >
          <img
            src={asset("nav-luxe-mark.svg")}
            alt=""
            width={18.517}
            height={24.07}
            className="shrink-0"
            aria-hidden="true"
          />
          <span className="font-sans text-[20px] font-semibold leading-[1.1] tracking-[-0.6px] text-black uppercase ipad:text-[22px] ipad:tracking-[-0.66px]">
            LUXE
          </span>
        </a>

        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center touch-manipulation transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1d] [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80"
        >
          <img
            src={asset("nav-menu-icon.svg")}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 ipad:h-8 ipad:w-8"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mx-auto hidden w-full max-w-[397px] items-center justify-center gap-6 pt-[29px] desktop-sm:flex">
        <ul className="flex items-center gap-6 font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] text-[#101010]">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                tabIndex={0}
                aria-label={link.label}
                onKeyDown={(event) => handleKeyDown(event, link.href)}
                className="inline-flex min-h-11 items-center touch-manipulation whitespace-nowrap transition-colors duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1d] [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:text-black"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Button
          variant="nav"
          aria-label="Explore Gallery"
          onClick={onExplore}
          className="shrink-0"
        >
          Explore Gallery
        </Button>
      </div>
    </nav>
  );
};
