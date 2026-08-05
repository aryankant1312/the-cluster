"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";

export default function NotFound() {
  const { persona, hydrated } = usePersona();
  const router = useRouter();
  const t = useTranslations("notFound");

  useEffect(() => {
    if (hydrated && persona === "dotm") {
      const timer = setTimeout(() => router.push(`/${persona}`), 4000);
      return () => clearTimeout(timer);
    }
  }, [hydrated, persona, router]);

  if (!hydrated) return null;

  if (persona === "dev") {
    return (
      <main className="min-h-screen bg-[#008080] flex items-center justify-center p-6">
        <div className="win98-border bg-persona-surface w-full max-w-sm">
          <div className="bg-persona-titlebar text-white text-sm font-chrome px-2 py-1">
            Error
          </div>
          <div className="p-4 font-body text-sm">
            <p className="mb-4">{t("devTitle")}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => router.push("/dev")}
                className="win98-border bg-persona-surface px-4 py-1"
              >
                {t("devRetry")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dev")}
                className="win98-border bg-persona-surface px-4 py-1"
              >
                {t("devCancel")}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <p className="font-chrome text-danger text-lg tracking-wide text-center">
        {t("dotmMessage")}
      </p>
    </main>
  );
}
