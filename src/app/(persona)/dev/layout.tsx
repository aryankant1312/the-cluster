import { WindowManagerProvider } from "@/components/window-manager/window-manager-context";
import { Taskbar } from "@/components/dev/Taskbar";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <WindowManagerProvider>
      <div className="relative flex-1 overflow-hidden pb-10">{children}</div>
      <Taskbar />
    </WindowManagerProvider>
  );
}
