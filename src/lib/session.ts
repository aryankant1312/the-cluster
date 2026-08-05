import "server-only";
import { cookies } from "next/headers";
import { verifyCookieValue } from "@/lib/cookies";
import type { Persona } from "@/content/types";

export async function getPersonaFromCookie(): Promise<Persona | null> {
  const store = await cookies();
  const raw = verifyCookieValue(store.get("persona")?.value);
  if (raw === "dev" || raw === "dotm") return raw;
  return null;
}

export async function getLocaleFromCookie(): Promise<"en" | "hi"> {
  const store = await cookies();
  const raw = verifyCookieValue(store.get("locale")?.value);
  return raw === "hi" ? "hi" : "en";
}
