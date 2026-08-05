"use client";

import { useState } from "react";

interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
}

export function NotesApp({ onPost }: { onPost: (note: StickyNote) => void }) {
  const [text, setText] = useState("");

  const post = () => {
    if (!text.trim()) return;
    const note: StickyNote = {
      id: crypto.randomUUID(),
      text: text.trim(),
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 40,
    };
    const existing = JSON.parse(window.sessionStorage.getItem("stickyNotes") ?? "[]");
    window.sessionStorage.setItem("stickyNotes", JSON.stringify([...existing, note]));
    onPost(note);
    setText("");
  };

  return (
    <div>
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
