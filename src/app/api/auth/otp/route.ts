import { NextResponse } from "next/server";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  createSession,
  deliverOtp,
  hashOtp,
  newOtpCode,
  otpMatches,
  parsePersona,
  sessionCookieOptions,
} from "@/lib/auth";
import { hashIp, otps, users } from "@/lib/db/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign in with a one-time code: ask for one, then hand it back.
 *
 * Both halves live in one route because they are one conversation about one
 * address, and splitting them would duplicate the validation, the rate limit
 * and the hashing across two files that then have to agree exactly.
 *
 * WHAT THIS PROVES is that the person can read mail at that address. It is the
 * same proof Google's flow ends with, so it produces the same kind of account:
 * `users.upsertByEmail` merges on the address, and somebody who used Google
 * yesterday and a code today lands on the row they already have.
 *
 * WHAT IT NEVER DOES is tell an anonymous caller whether an address has an
 * account here. "Sent" is the answer either way — requesting a code for
 * somebody else's address must not become a way to find out whether they are a
 * member.
 */

const MAX_EMAIL = 254; // RFC 5321's upper bound on a full address.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/** How often one address may ask. Longer than a slow mail hop, shorter than patience. */
const RESEND_COOLDOWN_MS = 45 * 1000;

function requesterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, MAX_EMAIL);

  if (!EMAIL_SHAPE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That doesn't look like an email address." },
      { status: 422 },
    );
  }

  if (action === "request") return requestCode(request, email);
  if (action === "verify") {
    /**
     * The door, required on verify and irrelevant on request.
     *
     * Asking for a code is not signing in — no session exists yet and the
     * same six digits would be valid at either entrance. It is redeeming
     * one that mints a session, and a session has to belong to a desktop.
     */
    const persona = parsePersona(body.persona);
    if (!persona) {
      return NextResponse.json(
        { ok: false, error: "Which door? Expected persona 'dev' or 'dotm'." },
        { status: 400 },
      );
    }
    return verifyCode(request, email, String(body.code ?? ""), persona);
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}

async function requestCode(request: Request, email: string) {
  /**
   * The cooldown reads the live code's age rather than keeping a counter.
   *
   * `otps.issue` supersedes whatever was outstanding, so without this a
   * "resend" loop is also a way to make this server send unlimited mail to an
   * address nobody at this keyboard controls.
   */
  const live = await otps.pending(email);
  if (live && Date.now() - Date.parse(live.created_at) < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - Date.parse(live.created_at))) / 1000,
    );
    return NextResponse.json(
      { ok: false, error: `A code is already on its way. Try again in ${wait}s.` },
      { status: 429 },
    );
  }

  const code = newOtpCode();
  await otps.issue({
    email,
    codeHash: hashOtp(email, code),
    ttlMs: OTP_TTL_MS,
    ipHash: requesterHash(request),
  });

  // `delivered: false` means the code went to the server console instead,
  // because no mail provider is configured. The panel says so plainly — the
  // only person who can read that console is whoever is running the site, and
  // hiding it from them helps nobody.
  const delivered = await deliverOtp(email, code);

  return NextResponse.json({ ok: true, delivered, expiresInMs: OTP_TTL_MS });
}

async function verifyCode(
  request: Request,
  email: string,
  rawCode: string,
  persona: "dev" | "dotm",
) {
  const code = rawCode.replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) {
    return NextResponse.json({ ok: false, error: "Codes are six digits." }, { status: 422 });
  }

  const pending = await otps.pending(email);
  if (!pending) {
    return NextResponse.json(
      { ok: false, error: "That code has expired. Ask for another." },
      { status: 410 },
    );
  }

  /**
   * Five guesses, and then the code is spent.
   *
   * This is what makes six digits a credential rather than a formality: a
   * million possibilities is minutes of scripted guessing, and five tries is
   * not. The code is consumed on the last failure rather than merely refused,
   * so an attacker has to ask for a new one — which the cooldown above
   * rations.
   */
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await otps.consume(pending.id);
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Ask for a new code." },
      { status: 429 },
    );
  }

  if (!otpMatches(email, code, pending.code_hash)) {
    await otps.recordAttempt(pending.id);
    const left = OTP_MAX_ATTEMPTS - (pending.attempts + 1);
    return NextResponse.json(
      {
        ok: false,
        error:
          left > 0 ? `That code is wrong. ${left} tries left.` : "That code is wrong.",
      },
      { status: 401 },
    );
  }

  await otps.consume(pending.id);
  const user = await users.upsertByEmail({ email });
  const cookie = await createSession(user.id, persona, {
    userAgent: request.headers.get("user-agent") ?? "",
    ipHash: requesterHash(request),
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
  });
  response.cookies.set(cookie.name, cookie.value, sessionCookieOptions(cookie.maxAge));
  return response;
}
