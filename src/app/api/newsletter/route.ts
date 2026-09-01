import { NextResponse } from "next/server";
import { hashIp, newsletter } from "@/lib/db/repositories";

export const runtime = "nodejs";

/**
 * Newsletter sign-up.
 *
 * Both personas' contact surfaces post here. Re-subscribing is intentionally
 * a success rather than an error — telling someone "you are already on the
 * list" leaks who is on it, and the caller has no use for the distinction.
 * The `created` flag is returned for the admin view's benefit only.
 */

const MAX_EMAIL = 254; // RFC 5321 upper bound on a full address.

/** Deliberately permissive: shape only, no deliverability guesswork. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

function submitterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().slice(0, MAX_EMAIL);
  const source = String(body.source ?? "").trim().slice(0, 40);

  if (!EMAIL_SHAPE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That doesn't look like an email address." },
      { status: 422 },
    );
  }

  try {
    const created = await newsletter.subscribe(email, source, submitterHash(request));
    return NextResponse.json({ ok: true, created });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't save that right now. Try again in a moment." },
      { status: 503 },
    );
  }
}
