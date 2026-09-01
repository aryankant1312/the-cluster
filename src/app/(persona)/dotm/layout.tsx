import { redirect } from "next/navigation";
import { WindowManagerProvider } from "@/components/window-manager/window-manager-context";
import { Dock } from "@/components/dotm/Dock";
import { currentUser } from "@/lib/auth";

/**
 * The gate, for real.
 *
 * `proxy.ts` also turns away a hard navigation carrying no session cookie, but
 * that is an optimistic check: it can see that a cookie exists and not whether
 * it means anything, because verifying the signature needs `node:crypto` and
 * proxy runs on the edge. Next's own documentation is explicit that proxy is
 * not a session-management solution.
 *
 * This is a server component, so it resolves the session against the database
 * — and it runs on client-side navigations too, which proxy never sees. A
 * forged or expired cookie gets past proxy and stops here.
 *
 * The session is not scoped to a persona. Somebody who signed in at the DEV
 * door walks straight through this one, which is the whole of "a single user
 * shouldn't need to login twice".
 */
export default async function DotmLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser("dotm");
  if (!user) redirect("/choose-face/dotm");

  return (
    <WindowManagerProvider>
      <div className="relative flex-1 overflow-hidden pb-24 bg-black">{children}</div>
      <Dock />
    </WindowManagerProvider>
  );
}
