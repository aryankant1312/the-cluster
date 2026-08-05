"use client";

import { startTransition, useEffect, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { usePersona } from "@/components/providers/PersonaProvider";
import { DotmWindow } from "@/components/window-manager/DotmWindow";
import { DesktopTile } from "@/components/dotm/DesktopTile";
import { ContactCard } from "@/components/dotm/window-content/ContactCard";
import { NotesApp, type StickyNote } from "@/components/dotm/window-content/NotesApp";
import { ComingSoon } from "@/components/shared/ComingSoon";
import dotmWallpaper from "../../../../public/images/dotm/wallpaper.jpg";

const TRACKS = [
  "Bhala Kyun",
  "Paranoid",
  "Thak Thak",
  "Gaddi Rok",
  "Sukoon",
  "Badside",
  "Us Bhai Us",
  "Ae Kaki",
];

function seededPosition(i: number) {
  const cols = 4;
  const col = i % cols;
  const row = Math.floor(i / cols);
  return { x: 40 + col * 140 + (i % 2) * 20, y: 40 + row * 160 };
}

export function useParallax() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rawX = useTransform(mx, [-1, 1], [10, -10]);
  const rawY = useTransform(my, [-1, 1], [8, -8]);
  const x = useSpring(rawX, { stiffness: 60, damping: 20 });
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { x, y };
}

export default function DotmDesktopPage() {
  const wm = useWindowManager();
  const { syncPersona } = usePersona();
  const { x, y } = useParallax();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [tilesVisible, setTilesVisible] = useState(0);

  useEffect(() => {
    startTransition(() => syncPersona("dotm"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const justEntered = window.sessionStorage.getItem("dotm-welcome") === "1";
    window.sessionStorage.removeItem("dotm-welcome");

    TRACKS.forEach((_, i) => {
      setTimeout(() => setTilesVisible((v) => Math.max(v, i + 1)), justEntered ? i * 60 : 0);
    });

    if (justEntered) {
      const timer = setTimeout(() => wm.openWindow("welcome"), TRACKS.length * 60 + 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0">
      <motion.div style={{ x, y }} className="absolute -inset-4">
        <Image
          src={dotmWallpaper}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 bg-black/30" />

      {TRACKS.map((track, i) => (
        <div
          key={track}
          style={{ opacity: i < tilesVisible ? 1 : 0, transition: "opacity 0.3s" }}
        >
          <DesktopTile
            label={track}
            initial={seededPosition(i)}
            onOpen={() => wm.openWindow("track")}
          />
        </div>
      ))}

      <DotmWindow id="welcome" title="Welcome">
        <p className="font-headline text-sm">WELCOME DEEPER.</p>
      </DotmWindow>
      <DotmWindow id="contact" title="DOTM">
        <ContactCard />
      </DotmWindow>
      <DotmWindow id="notes" title="Notes">
        <NotesApp onPost={(note) => setNotes((prev) => [...prev, note])} />
      </DotmWindow>
      <DotmWindow id="instagram" title="Instagram">
        <ComingSoon label="INSTAGRAM" />
      </DotmWindow>
      <DotmWindow id="youtube" title="YouTube">
        <ComingSoon label="YOUTUBE" />
      </DotmWindow>
      <DotmWindow id="spotify" title="Spotify">
        <ComingSoon label="SPOTIFY" />
      </DotmWindow>
      <DotmWindow id="track" title="Player">
        <ComingSoon label="TRACK PLAYER" />
      </DotmWindow>

      {notes.map((note) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ position: "absolute", left: `${note.x}%`, top: `${note.y}%`, zIndex: 250 }}
          className="w-40 bg-[#fff9c4] text-black text-xs p-3 rounded-sm shadow-lg -rotate-2"
        >
          {note.text}
        </motion.div>
      ))}
    </div>
  );
}
