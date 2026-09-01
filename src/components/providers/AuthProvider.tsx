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

/**
 * Who is signed in, for everything that draws.
 *
 * A provider rather than a hook each component calls for itself: the answer
 * comes from a request, several places on screen need it at once — the intro's
 * login icon, the dock's avatar, the Start menu — and three independent
 * fetches of one endpoint would race and disagree while they settled.
 *
 * DELIBERATELY SEPARATE FROM `PersonaProvider`. That one holds which face the
 * visitor is wearing; this one holds who they are. The two change for
 * unrelated reasons, and neither should re-render the other's consumers.
 *
 * `capabilities` is the other half of what the sign-in panel needs: whether
 * the Google button starts a real round trip or the local stand-in, and
 * whether a code will arrive by mail or only in the server log. It travels
 * with the session because it arrives in the same response — and a panel that
 * needs a second request to learn what it may offer renders once offering the
 * wrong thing.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface Capabilities {
  /** Real Google credentials are configured. */
  google: boolean;
  /** The local stand-in provider is armed. */
  demo: boolean;
  /** Codes can be emailed, rather than only logged. */
  mailer: boolean;
}

interface AuthValue {
  user: AuthUser | null;
  capabilities: Capabilities;
  /** True until the first answer lands — which is not the same as signed out. */
  loading: boolean;
  /**
   * Re-read the session *at one door*. Called after any sign-in completes.
   *
   * The persona is required and never inferred. DEV and DOTM hold separate
   * sessions now, and the persona cookie is not a reliable stand-in for "which
   * door am I standing at" — somebody who last used DEV can walk straight to
   * the DOTM entrance with `persona=dev` still set, and a provider that
   * guessed from it would report them signed in at a gate they have not
   * satisfied.
   */
  refresh: (persona: Persona) => Promise<AuthUser | null>;
  /** End one door's session. The other is left alone. */
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

  /**
   * THERE IS NO MOUNT-TIME READ HERE ANY MORE, and that is deliberate.
   *
   * This provider sits in the root layout, above the router, so it cannot know
   * which door the visitor is at — and with a session per door there is no
   * longer a door-agnostic question to ask. Whoever *does* know says so, by
   * calling `useAuthScope` below. Until one of them does, `loading` stays true,
   * which is the honest state: nobody has asked yet.
   */

  const signOut = useCallback(async (persona: Persona) => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
      });
    } finally {
      // Cleared locally whatever the request did. The cookie is httpOnly so
      // the page cannot check for itself, and an interface still showing an
      // avatar after the visitor pressed sign out is worse than one that
      // clears immediately and is corrected on the next read.
      setUser(null);
    }
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

/**
 * Declare which door this part of the tree belongs to, and read its session.
 *
 * Every surface that cares about identity knows its own persona for certain —
 * the two desktops from their route, the two entrances from the costume they
 * are wearing — and this is how that knowledge reaches the provider, which has
 * none of its own. One call per screen, at the top.
 *
 * Safe to call from more than one component on the same screen: the fetch is
 * repeated, the answer is identical, and the second write is a no-op.
 */
export function useAuthScope(persona: Persona): void {
  const { refresh } = useAuth();
  useEffect(() => {
    // Every write inside `refresh` happens after `await fetch` — the
    // "subscribe to an external system, set state in the callback" shape the
    // lint rule exists to permit. Reading a cookie-backed session over the
    // network is as external as it gets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(persona);
  }, [refresh, persona]);
}
