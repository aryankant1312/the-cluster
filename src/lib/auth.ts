import "server-only";

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { signCookieValue, verifyCookieValue } from "@/lib/cookies";
import { authSessions, users } from "@/lib/db/repositories";
import type { User } from "@/lib/db/types";
import type { Persona } from "@/content/types";

// One signed, httpOnly session serves both views. Legacy cookies are accepted
// until expiry and revoked together on explicit logout.
const SESSION_COOKIE = "cluster_session";
const ALL_SESSION_COOKIES = [SESSION_COOKIE, "cluster_session_dev", "cluster_session_dotm"];

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/** How long a code lives, and how many guesses it survives. */
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/* ────────────────────────────────────────────────────────────── The mode */

/**
 * Whether real Google credentials are configured.
 *
 * Everything downstream branches on this one answer and nothing else, which is
 * the point: dropping real keys into the environment switches the whole flow
 * over with no code change and no build step.
 */
export function hasGoogleCredentials(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Whether the stand-in provider may run.
 *
 * With no Google credentials the sign-in button would otherwise be a dead
 * control, and every path behind it — the session cookie, the gate in
 * `proxy.ts`, the analytics join, the avatar, signing out — would go untested
 * until the day the keys arrive. The demo provider completes the same round
 * trip against a local account, so all of it is exercised now.
 *
 * IT REFUSES TO ARM IN PRODUCTION unless somebody says so out loud. A missing
 * environment variable is the most ordinary deployment mistake there is, and
 * without this check the failure mode of forgetting one is a public front door
 * that lets anybody in as anybody. `AUTH_DEMO_MODE=1` exists for a staging box
 * where that genuinely is the intent.
 */
export function demoModeEnabled(): boolean {
  if (hasGoogleCredentials()) return false;
  if (process.env.NODE_ENV === "production") return process.env.AUTH_DEMO_MODE === "1";
  return true;
}

/** Whether OTP codes can actually be delivered, or only logged. */
export function hasMailer(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/* ────────────────────────────────────────────────────────────── Sessions */

/**
 * Start a session and hand back the cookie to set.
 *
 * The caller sets it rather than this function doing so, because in the Google
 * flow the cookie has to ride on a redirect response, and Next only allows
 * that from the response object itself.
 */
export async function createSession(
  userId: string,
  persona: Persona,
  meta: { userAgent?: string; ipHash?: string; remember?: boolean } = {},
): Promise<{ name: string; value: string; maxAge: number | undefined }> {
  const session = await authSessions.create({
    userId,
    persona,
    ttlMs: SESSION_MS,
    userAgent: meta.userAgent,
    ipHash: meta.ipHash,
  });
  return {
    name: SESSION_COOKIE,
    value: signCookieValue(session.id),
    maxAge: meta.remember === true ? Math.floor(SESSION_MS / 1000) : undefined,
  };
}

export async function currentUser(_persona: Persona): Promise<User | null> {
  void _persona;
  const store = await cookies();
  for (const name of ALL_SESSION_COOKIES) {
    const id = verifyCookieValue(store.get(name)?.value);
    if (id) {
      const user = await authSessions.resolve(id);
      if (user) return user;
    }
  }
  return null;
}

export async function currentUserAnyPersona(): Promise<User | null> {
  return currentUser("dev");
}

export async function endCurrentSession(_persona: Persona): Promise<void> {
  void _persona;
  const store = await cookies();
  for (const name of ALL_SESSION_COOKIES) {
    const id = verifyCookieValue(store.get(name)?.value);
    if (id) await authSessions.destroy(id);
  }
}

export function sessionCookieName(_persona: Persona): string { void _persona; return SESSION_COOKIE; }

/**
 * Read a persona off an untrusted string, or null.
 *
 * The API routes take the door from a query parameter or a request body, both
 * of which are whatever the caller typed. Everything downstream indexes
 * `SESSION_COOKIES` with it, so it is narrowed once, here, rather than cast at
 * each call site.
 */
export function parsePersona(value: unknown): Persona | null {
  return value === "dev" || value === "dotm" ? value : null;
}

/**
 * The cookie's settings, in one place so every route that sets it agrees.
 *
 * `sameSite: "lax"` rather than `"strict"`: the Google flow returns through a
 * top-level redirect from accounts.google.com, and a strict cookie is withheld
 * on exactly that navigation — the visitor would arrive back signed in and be
 * told they were not.
 */
export function sessionCookieOptions(maxAge: number | undefined) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/* ──────────────────────────────────────────────────────────────── Google */

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

export function googleRedirectUri(origin: string): string {
  return new URL("/api/auth/google/callback", origin).toString();
}

export function newState(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Where to send somebody to sign in with Google.
 *
 * `state` is a random value the caller also stores in a short-lived cookie and
 * compares on the way back. Without it anybody can point a victim's browser at
 * the callback carrying an attacker's code and quietly sign them into the
 * attacker's account — a login CSRF, which is the whole reason this parameter
 * exists.
 *
 * Only `openid email profile` is requested. The site has no use for anything
 * else in a Google account, and a consent screen listing scopes a music site
 * has no business with is how people are taught not to read consent screens.
 */
export function googleAuthUrl(input: { origin: string; state: string }) {
  const url = new URL(GOOGLE_AUTH);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", googleRedirectUri(input.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  // Shows the account chooser rather than silently reusing whichever Google
  // account the browser happens to be signed into.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Exchange the authorization code and read the profile behind it.
 *
 * An unverified address is refused. Google returns one for some account types,
 * and treating it as proof would mean anybody willing to type an address they
 * do not own could take over the account belonging to whoever does.
 */
export async function exchangeGoogleCode(input: {
  code: string;
  origin: string;
}): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(input.origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}).`);

  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Google returned no access token.");

  const profileRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) throw new Error(`Google userinfo failed (${profileRes.status}).`);

  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.email) throw new Error("Google returned no email address.");
  if (profile.email_verified === false) {
    throw new Error("That Google account's email address is not verified.");
  }
  return profile;
}

/** Turn a Google profile into an account. */
export async function userFromGoogle(profile: GoogleProfile): Promise<User> {
  return users.upsertByEmail({
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    googleSub: profile.sub,
  });
}

/* ─────────────────────────────────────────────────────────────────── OTP */

/**
 * Six digits, from the cryptographic generator.
 *
 * `randomInt`, not `Math.random()`: this is a credential. `Math.random` is
 * seeded predictably enough that somebody who has watched a few codes can
 * narrow the next one — which, for a six-digit secret, is the whole of it.
 */
export function newOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Codes are stored hashed, salted with the address.
 *
 * The salt means two people issued the same six digits do not produce the same
 * hash, so the table cannot be read as "these two rows share a code".
 * `COOKIE_SECRET` is reused as pepper, so somebody holding the database but
 * not the environment cannot precompute the million possible hashes.
 */
export function hashOtp(email: string, code: string): string {
  const pepper =
    process.env.COOKIE_SECRET ?? "the-cluster-dev-secret-change-in-production";
  return createHash("sha256")
    .update(`${pepper}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

/**
 * Compare in constant time.
 *
 * A plain `===` on strings returns as soon as two characters differ, and how
 * long it took says how many leading characters were right. Against six digits
 * that turns a million guesses into a few thousand requests.
 */
export function otpMatches(email: string, code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(email, code));
  const stored = Buffer.from(storedHash);
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

/**
 * Send the code, or fall back to the server log.
 *
 * With no `RESEND_API_KEY` the code is printed rather than mailed, so the flow
 * is walkable end to end before any mail provider exists. It reports whether
 * delivery actually happened and the caller tells the visitor the truth —
 * "check the server console" is a fine thing to say to the one person who can
 * see it, and a terrible thing to hide.
 */
export async function deliverOtp(email: string, code: string): Promise<boolean> {
  if (!hasMailer()) {
    console.info(`[auth] one-time code for ${email}: ${code}`);
    return false;
  }

  const from = process.env.OTP_FROM_EMAIL || "onboarding@resend.dev";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${code} — your code for The Cluster`,
      text: [
        `${code}`,
        "",
        "That is your one-time code for The Cluster. It is good for ten minutes.",
        "If you did not ask for it you can ignore this — nobody gets in without it.",
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    // Logged rather than thrown: the code is already issued, and a mail
    // provider having a bad minute should not read to the visitor as their
    // address being wrong.
    console.error(`[auth] Resend refused the code for ${email} (${res.status}).`);
    return false;
  }
  return true;
}
