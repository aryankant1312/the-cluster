import { PersonaTopBar } from "@/components/chrome/PersonaTopBar";
import { MobileGate } from "@/components/chrome/MobileGate";

/**
 * `persona-desktop` is the font scope, and it is set here rather than deeper
 * on purpose.
 *
 * Everything below this point is the desktop: the top bar, the wallpaper, the
 * icons, every window shell and the dock or taskbar under them. All of it
 * wears the persona's display face — Pixelpurl for DEV, Lonedruida for DOTM —
 * because all of it is the costume. The boot screens are not in this segment
 * at all (`/enter` and `/choose-face/*` are their own routes), which is what
 * keeps them in the faces they were designed in without needing an opt-out.
 *
 * See the block under `.boot-dev-fonts` in `globals.css`.
 */
export default function PersonaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="persona-desktop min-h-screen flex flex-col">
      <MobileGate />
      <PersonaTopBar />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
