import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("Set NEWSLETTER_TOKEN_SECRET to a random secret of at least 32 characters.");
  return value;
}
export function unsubscribeToken(email: string) {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${payload}.${createHmac("sha256",secret()).update(payload).digest("base64url")}`;
}
export function tokenEmail(token: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const actual = Buffer.from(signature,"base64url");
  const expected = createHmac("sha256",secret()).update(payload).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) return null;
  const email = Buffer.from(payload,"base64url").toString();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
export function unsubscribeUrl(email: string) {
  const origin = process.env.NEWSLETTER_SITE_URL || "https://dotm.in";
  const url = new URL("/api/newsletter/unsubscribe",origin);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Newsletter URL must use HTTPS.");
  url.searchParams.set("token",unsubscribeToken(email));
  return url.toString();
}
