"use client";

import { useTranslations } from "next-intl";
import { team } from "@/content/team";
import { TeamCard } from "@/components/team/TeamCard";

export default function TeamPage() {
  const t = useTranslations("team");

  return (
    <main className="flex-1 px-6 py-10">
      <h1 className="font-chrome text-xl tracking-widest mb-6 text-center">{t("title")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {team.map((member) => (
          <TeamCard key={member.id} member={member} />
        ))}
      </div>
    </main>
  );
}
