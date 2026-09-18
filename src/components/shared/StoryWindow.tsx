"use client";

import { usePersona } from "@/components/providers/PersonaProvider";

export function StoryWindow() {
  const { persona } = usePersona();
  return (
    <div className={`flex h-full min-h-48 w-full items-center justify-center font-chrome text-2xl ${persona === "dotm" ? "bg-[#0b0b0c] text-white" : "bg-persona-window-bg text-black"}`}>
      Coming Soon
    </div>
  );
}

export default StoryWindow;
