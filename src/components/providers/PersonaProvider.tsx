"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { setPersonaCookie, setLocaleCookie } from "@/app/actions";
import type { Persona } from "@/content/types";

type Locale = "en" | "hi";

interface PersonaContextValue {
  persona: Persona;
  firstChoice: Persona | null;
  locale: Locale;
  hydrated: boolean;
  choosePersona: (persona: Persona) => void;
  togglePersona: () => void;
  syncPersona: (persona: Persona) => void;
  toggleLocale: () => void;
  justSwitched: Persona | null;
  clearSwitchNotice: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

const FIRST_CHOICE_KEY = "firstChoice";
const CURRENT_PERSONA_KEY = "currentPersona";
const LOCALE_KEY = "locale";

export function PersonaProvider({
  children,
  initialPersona,
  initialLocale,
}: {
  children: ReactNode;
  initialPersona: Persona | null;
  initialLocale: Locale;
}) {
  const [persona, setPersonaState] = useState<Persona>(initialPersona ?? "dev");
  const [firstChoice, setFirstChoiceState] = useState<Persona | null>(initialPersona);
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);
  const [justSwitched, setJustSwitched] = useState<Persona | null>(null);

  useEffect(() => {
    const storedFirstChoice = window.localStorage.getItem(FIRST_CHOICE_KEY) as Persona | null;
    const storedCurrent = window.localStorage.getItem(CURRENT_PERSONA_KEY) as Persona | null;
    const storedLocale = window.localStorage.getItem(LOCALE_KEY) as Locale | null;

    if (storedFirstChoice === "dev" || storedFirstChoice === "dotm") {
      setFirstChoiceState(storedFirstChoice);
    }
    if (storedCurrent === "dev" || storedCurrent === "dotm") {
      setPersonaState(storedCurrent);
    } else if (storedFirstChoice === "dev" || storedFirstChoice === "dotm") {
      setPersonaState(storedFirstChoice);
    }
    if (storedLocale === "en" || storedLocale === "hi") {
      setLocaleState(storedLocale);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-persona", persona);
    if (!hydrated) return;
    const timer = setTimeout(() => void setPersonaCookie(persona), 0);
    return () => clearTimeout(timer);
  }, [persona, hydrated]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    if (!hydrated) return;
    const timer = setTimeout(() => void setLocaleCookie(locale), 0);
    return () => clearTimeout(timer);
  }, [locale, hydrated]);

  const choosePersona = useCallback((next: Persona) => {
    window.localStorage.setItem(FIRST_CHOICE_KEY, next);
    window.localStorage.setItem(CURRENT_PERSONA_KEY, next);
    setFirstChoiceState(next);
    setPersonaState(next);
  }, []);

  const togglePersona = useCallback(() => {
    setPersonaState((prev) => {
      const next: Persona = prev === "dev" ? "dotm" : "dev";
      window.localStorage.setItem(CURRENT_PERSONA_KEY, next);
      setJustSwitched(next);
      return next;
    });
  }, []);

  const syncPersona = useCallback((next: Persona) => {
    setPersonaState((prev) => {
      if (prev === next) return prev;
      window.localStorage.setItem(CURRENT_PERSONA_KEY, next);
      return next;
    });
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === "en" ? "hi" : "en";
      window.localStorage.setItem(LOCALE_KEY, next);
      return next;
    });
  }, []);

  const clearSwitchNotice = useCallback(() => setJustSwitched(null), []);

  return (
    <PersonaContext.Provider
      value={{
        persona,
        firstChoice,
        locale,
        hydrated,
        choosePersona,
        togglePersona,
        syncPersona,
        toggleLocale,
        justSwitched,
        clearSwitchNotice,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within PersonaProvider");
  return ctx;
}
