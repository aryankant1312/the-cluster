"use client";

import { cn } from "@/lib/utils";

/** Keep the unfinished shoot archive out of the public desktop windows. */
export function ShootAtSiteMaintenance({ isDotm }: { isDotm: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center p-6 text-center",
        isDotm ? "bg-black text-white" : "bg-persona-surface text-black",
      )}
    >
      <p className={cn("text-lg", isDotm ? "font-body" : "font-chrome")}>
        Shoot at site is under maintenance
      </p>
    </div>
  );
}
