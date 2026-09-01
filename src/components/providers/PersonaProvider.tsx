"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

  /**
   * WHAT THE SERVER ALREADY BELIEVES, so a write that changes nothing is never
   * sent. Seeded from the props, which came from the cookies themselves.
   *
   * THIS IS WHY THE PLAY BUTTON DIED ON SOME LOADS. These two effects used to
   * call their server actions on *every* mount, including the overwhelmingly
   * common case where the cookie already held exactly the value being written.
   * A Server Action is not a fetch: Next answers it with a fresh RSC payload
   * for the current route and the router applies it, so each of these was a
   * silent refresh of the page the visitor was looking at. Two fired together,
   * a tick after hydration — verified against the running server, which logged
   * `POST /enter` twice on every single load of the landing page.
   *
   * A `router.push` issued while one is in flight goes nowhere: the refresh
   * lands afterwards, re-renders the tree at the URL it was started for, and
   * takes the pending navigation with it. The landing page's only control is a
   * `router.push("/choose-face")`, so whether it worked came down to whether
   * the click fell inside that window — which is the "works, then doesn't,
   * then works" the button was reported for. Nothing was wrong with the
   * button. It was being talked over.
   *
   * Refs rather than state: nothing renders from these, and a state update
   * here would be a render whose only job is to remember a write.
   */
  const writtenPersona = useRef<Persona | null>(initialPersona);
  const writtenLocale = useRef<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.setAttribute("data-persona", persona);
    if (!hydrated) return;
    if (writtenPersona.current === persona) return;
    writtenPersona.current = persona;
    const timer = setTimeout(() => void setPersonaCookie(persona), 0);
    return () => clearTimeout(timer);
  }, [persona, hydrated]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    if (!hydrated) return;
    if (writtenLocale.current === locale) return;
    writtenLocale.current = locale;
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
