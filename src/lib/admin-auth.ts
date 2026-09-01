import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin authentication.
 *
 * Deliberately separate from the Vault's four-digit code: that is theatre for
 * visitors, this controls what the public sees. Real password, scrypt hash,
 * httpOnly signed session cookie.
 *
 * The environment holds a hash, never the password itself.
 */

const COOKIE = "cluster_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD_HASH ?? "";
}

/** Stored as `salt:hash`, both hex. */
export function verifyPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) return false;

  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  try {
    const actual = scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuf.length) return false;
    return timingSafeEqual(actual, expectedBuf);
  } catch {
    return false;
  }
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

export async function createSession(): Promise<void> {
  const expires = Date.now() + SESSION_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${expires}.${nonce}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD_HASH) return false;

  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;

  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;

  const expectedSig = Buffer.from(sign(`${expires}.${nonce}`), "hex");
  const actualSig = Buffer.from(signature, "hex");
  if (expectedSig.length !== actualSig.length) return false;
  if (!timingSafeEqual(expectedSig, actualSig)) return false;

  return Number(expires) > Date.now();
}

/** False when no hash is configured — the UI explains rather than 403-ing. */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
}
