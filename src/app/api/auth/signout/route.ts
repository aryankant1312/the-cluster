import { NextResponse } from "next/server";
import {
  endCurrentSession,
  parsePersona,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * End the session.
 *
 * Two steps, and both matter. The row is deleted, which is what actually
 * revokes the session — a cookie the browser already holds would otherwise
 * keep working until it expired. Then the cookie is cleared, so the browser
 * stops sending a value that no longer resolves to anything.
 *
 * POST rather than GET, so that an `<img src="/api/auth/signout">` on any page
 * anywhere cannot sign this site's visitors out. Logging somebody out is a
 * small harm, but it is still an action, and actions do not belong on a verb
 * browsers will follow unprompted.
 *
 * Always answers `ok`. Signing out when you were not signed in is not a
 * failure: the state you asked for is the state you end in.
 */
export async function POST(request: Request) {
  /**
   * One door, not both.
   *
   * Somebody who signed in at DEV and at DOTM made two decisions and is now
   * undoing one of them. Ending both would mean a visitor leaving DOTM
   * discovers, next time they open DEV, that they have been signed out of
   * somewhere they never left.
   */
  const body = (await request.json().catch(() => ({}))) as { persona?: unknown };
  const persona = parsePersona(body.persona);
  if (!persona) {
    return NextResponse.json(
      { ok: false, error: "Which door? Expected persona 'dev' or 'dotm'." },
      { status: 400 },
    );
  }

  await endCurrentSession(persona);

  const response = NextResponse.json({ ok: true });
  // `maxAge: 0` through the same options builder rather than a bare delete, so
  // the clearing cookie carries the path and flags the original was set with.
  // A mismatched delete leaves the original in place and the visitor stays
  // signed in.
  response.cookies.set(sessionCookieName(persona), "", sessionCookieOptions(0));
  return response;
}
