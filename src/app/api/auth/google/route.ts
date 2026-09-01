import { NextResponse } from "next/server";
import { googleAuthUrl, hasGoogleCredentials, newState, parsePersona } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ten minutes is longer than anybody spends on a Google account chooser. */
const STATE_TTL_S = 600;

export const GOOGLE_STATE_COOKIE = "cluster_oauth_state";
export const GOOGLE_NEXT_COOKIE = "cluster_oauth_next";

/**
 * Which door started the round trip.
 *
 * Carried in a cookie for the same reason `next` is: Google echoes `state`
 * back and nothing else, so anything the callback needs has to be parked
 * server-side before the browser leaves. The callback mints the session with
 * it, which is what stops a DOTM sign-in handing back a DEV session.
 */
export const GOOGLE_PERSONA_COOKIE = "cluster_oauth_persona";

/**
 * Start the Google round trip.
 *
 * `state` is minted here, sent to Google, and written at the same moment into
 * a short-lived httpOnly cookie. The callback requires the two to match.
 * Without that, anybody can point a victim's browser at the callback carrying
 * their own authorization code and the victim ends up signed into the
 * attacker's account without noticing — a login CSRF.
 *
 * `next` is where to return afterwards, and it is kept in a cookie rather than
 * round-tripped through Google. Google echoes `state` back verbatim and
 * nothing else, and packing a destination into `state` would mean validating a
 * redirect target that has been outside our hands — so it stays server-side,
 * and the callback still refuses anything that is not a local path.
 *
 * A 503 when Google is unconfigured, rather than a redirect carrying an empty
 * client id — which Google answers with its own error page, and which reads to
 * a visitor as the site being broken rather than as setup left undone.
 */
export async function GET(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const state = newState();
  const next = url.searchParams.get("next") ?? "";

  // Refused rather than defaulted: a session belongs to one desktop, and
  // guessing which would let somebody past a gate they never satisfied.
  const persona = parsePersona(url.searchParams.get("persona"));
  if (!persona) {
    return NextResponse.json(
      { ok: false, error: "Which door? Expected persona 'dev' or 'dotm'." },
      { status: 400 },
    );
  }

  const response = NextResponse.redirect(googleAuthUrl({ origin: url.origin, state }));

  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_S,
  };
  response.cookies.set(GOOGLE_STATE_COOKIE, state, options);
  response.cookies.set(GOOGLE_PERSONA_COOKIE, persona, options);
  if (next) response.cookies.set(GOOGLE_NEXT_COOKIE, next, options);

  return response;
}
