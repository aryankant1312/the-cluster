"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import devWallpaper from "../../../public/images/dev/wallpaper.jpg";
import dotmWallpaper from "../../../public/images/dotm/wallpaper.jpg";

export default function ChooseFacePage() {
  const router = useRouter();
  const { choosePersona } = usePersona();
  const [hovered, setHovered] = useState<"dev" | "dotm" | null>(null);
  const t = useTranslations("chooseFace");

  const commit = (persona: "dev" | "dotm") => {
    choosePersona(persona);
    router.push(`/choose-face/${persona}`);
  };

  return (
    <main className="relative min-h-screen flex overflow-hidden bg-black">
      <motion.button
        type="button"
        onClick={() => commit("dev")}
        onMouseEnter={() => setHovered("dev")}
        onMouseLeave={() => setHovered(null)}
        animate={{ flexGrow: hovered === "dev" ? 1.5 : hovered === "dotm" ? 0.67 : 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex-1 min-w-0 flex items-end justify-center pb-16 overflow-hidden"
      >
        <Image
          src={devWallpaper}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-teal-950/50" />
        <span className="relative font-chrome text-lg sm:text-2xl tracking-widest text-[#f5efe0] drop-shadow-[2px_2px_0_#000]">
          {t("devLabel")}
        </span>
      </motion.button>

      <motion.button
        type="button"
        onClick={() => commit("dotm")}
        onMouseEnter={() => setHovered("dotm")}
        onMouseLeave={() => setHovered(null)}
        animate={{ flexGrow: hovered === "dotm" ? 1.5 : hovered === "dev" ? 0.67 : 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex-1 min-w-0 flex items-end justify-center pb-16 overflow-hidden"
      >
        <Image
          src={dotmWallpaper}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-black/60" />
        <span className="relative font-chrome text-[#f5f5f5] text-lg sm:text-2xl tracking-widest drop-shadow-[0_0_8px_rgba(180,0,26,0.8)]">
          {t("dotmLabel")}
        </span>
      </motion.button>

      <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center px-6">
        <p className="font-chrome text-white text-center text-sm sm:text-base tracking-wide max-w-md">
          {t("line")}
        </p>
      </div>
    </main>
  );
}
