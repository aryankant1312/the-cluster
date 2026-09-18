"use client";

import { useState } from "react";
import { useWindowManager } from "@/components/window-manager/window-manager-context";

interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
}

export function NotesApp({ onPost }: { onPost: (note: StickyNote) => boolean }) {
  const [text, setText] = useState("");
  const wm = useWindowManager();

  const post = () => {
    if (!text.trim()) return;
    const note: StickyNote = {
      id: crypto.randomUUID(),
      text: text.trim(),
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 40,
    };
    if (!onPost(note)) return;
    setText("");
    wm.closeWindow("notes");
  };

  return (
    // Reading surface. See `.long-text` in globals.css.
    <div className="long-text">
      <p className="mb-2 text-xs opacity-70">Saved for your account in this browser.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Write something..."
        className="w-full bg-[#fff9c4] text-black p-2 text-sm rounded-md resize-none outline-none"
      />
      <button
        type="button"
        onClick={post}
        className="mt-2 macos-glass rounded-full px-4 py-1 text-xs font-chrome"
      >
        Post It
      </button>
    </div>
  );
}

export type { StickyNote };
