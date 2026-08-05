"use server";

import { cookies } from "next/headers";
import { signCookieValue } from "@/lib/cookies";
import type { Persona } from "@/content/types";

const PERSONA_COOKIE = "persona";
const LOCALE_COOKIE = "locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setPersonaCookie(persona: Persona) {
  const store = await cookies();
  store.set(PERSONA_COOKIE, signCookieValue(persona), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function setLocaleCookie(locale: "en" | "hi") {
  const store = await cookies();
  store.set(LOCALE_COOKIE, signCookieValue(locale), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}
