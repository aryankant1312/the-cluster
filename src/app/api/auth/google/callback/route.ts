import { NextResponse } from "next/server";
import {
  createSession,
  exchangeGoogleCode,
  parsePersona,
  sessionCookieOptions,
  userFromGoogle,
} from "@/lib/auth";
import { hashIp } from "@/lib/db/repositories";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_PERSONA_COOKIE,
  GOOGLE_STATE_COOKIE,
} from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One cookie, out of the raw request header.
 *
 * Read from the header rather than through `cookies()` because this handler
 * also has to *clear* two cookies on its response, and mixing the request
 * store with response mutations in one handler is how a cookie ends up set and
 * deleted in the same reply.
 */
function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/**
 * Only local paths are accepted as a destination.
 *
 * `next` arrives from a cookie this site set, so it is not directly attacker
 * controlled — but "not directly" is not a security argument, and an open
 * redirect on a login callback is the classic way to make a phishing link look
 * like it belongs to the site being impersonated. A leading `//` is refused
 * along with absolute URLs: browsers read `//evil.example` as protocol-
 * relative and go there.
 */
function safeNext(value: string): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function requesterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

/**
 * Google sends the visitor back here.
 *
 * Failures redirect rather than render. Somebody who declined the consent
 * screen, or whose code expired while they read it, should land back at the
 * door they started from carrying a note — not on a JSON error page, which
 * from inside a costumed boot sequence looks like the site fell over.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(readCookie(request, GOOGLE_NEXT_COOKIE));

  const fail = (reason: string) => {
    const back = new URL(next, url.origin);
    back.searchParams.set("auth_error", reason);
    const response = NextResponse.redirect(back);
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    response.cookies.delete(GOOGLE_NEXT_COOKIE);
    response.cookies.delete(GOOGLE_PERSONA_COOKIE);
    return response;
  };

  // They said no on the consent screen. Not an error worth a stack trace —
  // they changed their mind, which is allowed.
  if (url.searchParams.get("error")) return fail("cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, GOOGLE_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("state");
  }

  /**
   * The door this trip started at.
   *
   * Without it there is no honest answer to "which desktop does this session
   * open", and the two available guesses are both wrong half the time. A
   * missing cookie means the round trip took longer than its ten-minute TTL or
   * the browser dropped it, and starting over at the door is the only correct
   * recovery.
   */
  const persona = parsePersona(readCookie(request, GOOGLE_PERSONA_COOKIE));
  if (!persona) return fail("persona");

  try {
    const profile = await exchangeGoogleCode({ code, origin: url.origin });
    const user = await userFromGoogle(profile);
    const cookie = await createSession(user.id, persona, {
      userAgent: request.headers.get("user-agent") ?? "",
      ipHash: requesterHash(request),
    });

    const response = NextResponse.redirect(new URL(next, url.origin));
    response.cookies.set(cookie.name, cookie.value, sessionCookieOptions(cookie.maxAge));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    response.cookies.delete(GOOGLE_NEXT_COOKIE);
    response.cookies.delete(GOOGLE_PERSONA_COOKIE);
    return response;
  } catch (error) {
    // The thrown message can carry a token or a client id, so it is logged
    // here and never handed back to the browser.
    console.error("[auth] Google callback failed:", error);
    return fail("exchange");
  }
}
