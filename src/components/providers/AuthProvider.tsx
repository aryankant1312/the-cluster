"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Persona } from "@/content/types";



export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface Capabilities {

  google: boolean;

  demo: boolean;

  mailer: boolean;
}

interface AuthValue {
  user: AuthUser | null;
  capabilities: Capabilities;

  loading: boolean;

  refresh: (persona: Persona) => Promise<AuthUser | null>;

  signOut: (persona: Persona) => Promise<void>;
}

const FALLBACK: Capabilities = { google: false, demo: false, mailer: false };

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (persona: Persona): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`/api/auth/session?persona=${persona}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { user: AuthUser | null } & Capabilities;
      setUser(body.user);
      setCapabilities({ google: body.google, demo: body.demo, mailer: body.mailer });
      return body.user;
    } catch {
      // An unreachable endpoint is not the same thing as being signed out, but
      // there is nothing else it can be treated as here — and the gate is
      // enforced on the server regardless of what this believes.
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);



  const signOut = useCallback(async (persona: Persona) => {
    const response = await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    if (!response.ok) throw new Error("Could not sign out. Please try again.");
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, capabilities, loading, refresh, signOut }),
    [user, capabilities, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}


export function useAuthScope(persona: Persona): void {
  const { refresh } = useAuth();
  useEffect(() => {
    // Every write inside `refresh` happens after `await fetch` — the
    // "subscribe to an external system, set state in the callback" shape the
    // lint rule exists to permit. Reading a cookie-backed session over the
    // network is as external as it gets.
    void refresh(persona);
    const onFocus = () => { void refresh(persona); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, persona]);
}
