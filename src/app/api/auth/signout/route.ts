import { NextResponse } from "next/server";
import {
  endCurrentSession,
  parsePersona,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(request: Request) {
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
  response.cookies.set("cluster_session_dev", "", sessionCookieOptions(0));
  response.cookies.set("cluster_session_dotm", "", sessionCookieOptions(0));
  return response;
}
