"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LINE = "YOU WEREN'T SUPPOSED TO HEAR THIS.";

export default function DotmEntryPage() {
  const router = useRouter();
  const [wordCount, setWordCount] = useState(0);
  const words = LINE.split(" ");
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    window.sessionStorage.setItem("dotm-welcome", "1");
    router.push("/dotm");
  };

  useEffect(() => {
    const timers = words.map((_, i) =>
      setTimeout(() => setWordCount(i + 1), 600 + i * 400),
    );
    const finishTimer = setTimeout(finish, 600 + words.length * 400 + 1500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center relative px-6">
      <button
        type="button"
        onClick={finish}
        className="absolute top-4 right-4 text-white/30 text-xs font-chrome hover:text-white/70"
      >
        SKIP
      </button>
      <p className="font-headline text-[#f5f5f5] text-2xl sm:text-4xl text-center tracking-wide">
        {words.slice(0, wordCount).join(" ")}
      </p>
    </main>
  );
}
