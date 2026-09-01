// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import type { KeyboardEvent } from "react";
import { Button } from "@/components/originkit/ui/hero-04/button";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-04/${file}`;
}

const NAV_LINKS = [
  { label: "Artists", href: "#artists" },
  { label: "Genres", href: "#genres" },
  { label: "Playlists", href: "#playlists" },
  { label: "Charts", href: "#charts" },
] as const;

type NavbarProps = {
  onStartListening: () => void;
};

export const Navbar = ({ onStartListening }: NavbarProps) => {
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
      {/* Mobile / tablet */}
      <div className="flex w-full items-center justify-between p-4 ipad:px-[48px] ipad:py-[32px] desktop-sm:hidden">
        <a
          href="#"
          aria-label="Lyrista home"
          className="inline-flex items-center gap-2 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent]"
        >
          <img
            src={asset("nav-lyrista-icon.svg")}
            alt=""
            width={26}
            height={26}
            className="size-[26px] shrink-0"
            aria-hidden="true"
          />
          <span className="font-sans text-[21.5px] font-semibold leading-[27.5px] tracking-[-0.43px] text-white">
            Lyrista
          </span>
        </a>

        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center touch-manipulation transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80"
        >
          <img
            src={asset("nav-menu-icon.svg")}
            alt=""
            width={24}
            height={24}
            className="size-6 ipad:size-8"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Desktop */}
      <div className="relative mx-auto hidden w-full items-center justify-between px-[52px] pt-[36px] desktop-sm:flex">
        <ul className="flex items-center gap-6 font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] text-white">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                tabIndex={0}
                aria-label={link.label}
                onKeyDown={(event) => handleKeyDown(event, link.href)}
                className="inline-flex min-h-11 items-center touch-manipulation whitespace-nowrap transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80"
              >
                {"// "}
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#"
          aria-label="Lyrista home"
          className="absolute left-1/2 inline-flex -translate-x-1/2 items-center gap-2 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent]"
        >
          <img
            src={asset("nav-lyrista-icon.svg")}
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0"
            aria-hidden="true"
          />
          <span className="font-sans text-[20px] font-semibold leading-[25.5px] tracking-[-0.4px] text-white">
            Lyrista
          </span>
        </a>

        <Button
          variant="ghost"
          aria-label="Start Listening"
          onClick={onStartListening}
          className="shrink-0"
        >
          Start Listening
        </Button>
      </div>
    </nav>
  );
};
