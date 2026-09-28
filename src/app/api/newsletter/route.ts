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

const EMAIL_SHAPE = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

async function notifySubscriber(email: string, source: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NEWSLETTER_FROM ?? process.env.BOOKING_FROM ?? "THE CLUSTER <onboarding@resend.dev>",
        to: [process.env.NEWSLETTER_EMAIL ?? process.env.BOOKING_EMAIL ?? "dotmoriginal@gmail.com"],
        reply_to: email,
        subject: `New newsletter subscriber — ${source || "website"}`,
        text: `A visitor subscribed to the DOTM newsletter.\n\nEmail: ${email}\nSource: ${source || "website"}`,
        html: `<!doctype html><html><body style="margin:0;background:#f3f4f6;color:#171717;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#111;color:#fff;padding:24px;border-top:6px solid #ff0033"><div style="font-size:12px;letter-spacing:2px;color:#ff6b83">NEWSLETTER</div><h1 style="margin:8px 0 0;font-size:24px">New subscriber</h1></div><div style="background:#fff;padding:24px;border:1px solid #e5e7eb"><p style="margin:0 0 8px;color:#666;font-size:13px">EMAIL</p><p style="margin:0;font-size:18px;font-weight:700">${escapeHtml(email)}</p><p style="margin:24px 0 8px;color:#666;font-size:13px">SOURCE</p><p style="margin:0">${escapeHtml(source || "website")}</p></div></div></body></html>`,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

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
    const emailed = created ? await notifySubscriber(email, source) : true;
    return NextResponse.json({ ok: true, created, emailed });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't save that right now. Try again in a moment." },
      { status: 503 },
    );
  }
}
