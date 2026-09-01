import { redirect } from "next/navigation";
import { WindowManagerProvider } from "@/components/window-manager/window-manager-context";
import { Taskbar } from "@/components/dev/Taskbar";
import { currentUser } from "@/lib/auth";

/** The authoritative gate. See the matching note on the DOTM layout. */
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser("dev");
  if (!user) redirect("/choose-face/dev");

  return (
    <WindowManagerProvider>
      <div className="relative flex-1 overflow-hidden pb-10">{children}</div>
      <Taskbar />
    </WindowManagerProvider>
  );
}
