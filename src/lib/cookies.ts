import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.COOKIE_SECRET ?? "the-cluster-dev-secret-change-in-production";

function digest(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function signCookieValue(value: string): string {
  return `${value}.${digest(value)}`;
}

export function verifyCookieValue(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const separatorIndex = signed.lastIndexOf(".");
  if (separatorIndex === -1) return null;
  const value = signed.slice(0, separatorIndex);
  const sig = signed.slice(separatorIndex + 1);
  const expected = digest(value);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  return value;
}
