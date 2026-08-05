"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";

export function MobileGate() {
  const [isNarrow, setIsNarrow] = useState(false);
  const { persona, hydrated } = usePersona();
  const t = useTranslations("mobileGate");

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!hydrated || !isNarrow) return null;

  if (persona === "dev") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#008080] p-6">
        <div className="win98-border bg-persona-surface w-full max-w-xs">
          <div className="bg-persona-titlebar text-white text-sm font-chrome px-2 py-1">
            {t("devTitle")}
          </div>
          <div className="p-4 font-body text-sm text-persona-fg">
            <p className="mb-4">{t("devMessage")}</p>
            <button
              type="button"
              onClick={(e) => {
                const el = e.currentTarget;
                el.animate(
                  [
                    { transform: "translateX(0)" },
                    { transform: "translateX(-4px)" },
                    { transform: "translateX(4px)" },
                    { transform: "translateX(0)" },
                  ],
                  { duration: 200 },
                );
              }}
              className="win98-border bg-persona-surface px-4 py-1 text-sm font-body"
            >
              {t("devButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-6">
      <div className="macos-glass rounded-[var(--radius-window)] px-8 py-10 text-center max-w-xs">
        <p className="font-chrome text-danger text-sm tracking-wide">{t("dotmMessage")}</p>
      </div>
    </div>
  );
}
