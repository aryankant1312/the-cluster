"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BOOT_LINES = [
  "BOOTING THE CLUSTER...",
  "LOADING TWO FACES...",
  "MOUNTING /DEV...",
  "CHECKING FOR SOUL.EXE... FOUND.",
  "SYNCING WITH THE SPECTRUM...",
  "ALLOCATING MEMORY FOR EVERYTHING YOU FELT...",
  "DESKTOP READY.",
];

export default function DevBootPage() {
  const router = useRouter();
  const [lines, setLines] = useState<string[]>([]);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    window.sessionStorage.setItem("dev-welcome", "1");
    router.push("/dev");
  };

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setLines((prev) => [...prev, line]), i * 500),
    );
    const finishTimer = setTimeout(finish, BOOT_LINES.length * 500 + 1000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-black text-[#00ff00] font-body p-8 relative">
      <button
        type="button"
        onClick={finish}
        className="absolute top-4 right-4 text-white/40 text-xs font-chrome hover:text-white/80"
      >
        SKIP
      </button>
      <div className="max-w-xl mx-auto mt-16 space-y-1 text-sm">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <span className="inline-block w-2 h-4 bg-[#00ff00] animate-pulse" />
      </div>
    </main>
  );
}
