import { NextResponse } from "next/server";
import {
  createSession,
  demoModeEnabled,
  parsePersona,
  sessionCookieOptions,
} from "@/lib/auth";
import { hashIp, users } from "@/lib/db/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The stand-in identity provider, for before Google is configured.
 *
 * It is not a mock. It creates a real account, opens a real session and sets
 * the real cookie, so everything downstream — the gate in `proxy.ts`, the
 * analytics join, the avatar in the dock, signing out — runs through exactly
 * the code a Google sign-in will use. The only thing it skips is the trip to
 * Google. When credentials land in the environment this route stops arming
 * itself and nothing else changes.
 *
 * DELIBERATELY OBVIOUS. `demo@cluster.local` is not a deliverable address and
 * the display name says what it is, so a demo session can never be mistaken in
 * the analytics for a real visitor.
 *
 * The guard lives in `demoModeEnabled`, which refuses to arm in production
 * unless `AUTH_DEMO_MODE=1` is set deliberately — because the ordinary way to
 * arrive here in production is by forgetting an environment variable, and the
 * failure mode of that must not be a front door that opens for anybody.
 */

const DEMO_EMAIL = "demo@cluster.local";
const DEMO_NAME = "Demo Visitor";

export async function POST(request: Request) {
  if (!demoModeEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Demo sign-in is off. Use Google, or a one-time code." },
      { status: 403 },
    );
  }

  /**
   * Which door is asking.
   *
   * Refused rather than defaulted. A session has to belong to one desktop, and
   * picking one on the caller's behalf would quietly hand out a DEV session to
   * somebody standing at DOTM — who would then be let straight past a gate
   * they never satisfied. The panel always sends it; anything that does not is
   * not the panel.
   */
  const body = (await request.json().catch(() => ({}))) as { persona?: unknown };
  const persona = parsePersona(body.persona);
  if (!persona) {
    return NextResponse.json(
      { ok: false, error: "Which door? Expected persona 'dev' or 'dotm'." },
      { status: 400 },
    );
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  const user = await users.upsertByEmail({ email: DEMO_EMAIL, name: DEMO_NAME });
  const cookie = await createSession(user.id, persona, {
    userAgent: request.headers.get("user-agent") ?? "",
    ipHash: hashIp(ip),
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
  });
  response.cookies.set(cookie.name, cookie.value, sessionCookieOptions(cookie.maxAge));
  return response;
}
