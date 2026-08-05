import { WindowManagerProvider } from "@/components/window-manager/window-manager-context";
import { Dock } from "@/components/dotm/Dock";

export default function DotmLayout({ children }: { children: React.ReactNode }) {
  return (
    <WindowManagerProvider>
      <div className="relative flex-1 overflow-hidden pb-24 bg-black">{children}</div>
      <Dock />
    </WindowManagerProvider>
  );
}
