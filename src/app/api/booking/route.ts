import { NextResponse } from "next/server";
import { bookings } from "@/lib/db/repositories";
import { ENQUIRY_LABELS, ENQUIRY_TYPES, type EnquiryType } from "@/lib/db/types";

export const runtime = "nodejs";

const MAX = { short: 120, long: 2000 } as const;

function clean(v: unknown, limit: number = MAX.short): string {
  return typeof v === "string" ? v.trim().slice(0, limit) : "";
}

function looksLikeEmail(v: string): boolean {
  return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(v);
}

function looksLikeName(v: string): boolean {
  return /\p{L}/u.test(v);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

/**
 * Notification is best-effort and deliberately non-fatal: the request is
 * already durable in the database by the time this runs. A missing key or a
 * Resend outage must never cost a booking — it just shows as un-emailed in
 * the admin inbox.
 */
async function notify(summary: string, html: string, subject: string, replyTo: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_EMAIL ?? "dotmoriginal@gmail.com";
  if (!key) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Resend only permits arbitrary from-addresses on a verified domain;
        // until one is set up this falls back to their sandbox sender.
        from: process.env.BOOKING_FROM ?? "THE CLUSTER <onboarding@resend.dev>",
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        text: summary,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, errors: { form: "Malformed request." } },
      { status: 400 },
    );
  }

  const enquiryType = clean(body.enquiry_type) as EnquiryType;
  const source = clean(body.source, 40) || "website-booking";
  const input = {
    enquiry_type: enquiryType,
    city: clean(body.city),
    event_date: clean(body.event_date, 10),
    event_type: clean(body.event_type),
    expected_audience: clean(body.expected_audience),
    budget_range: clean(body.budget_range),
    contact_name: clean(body.contact_name),
    contact_email: clean(body.contact_email),
    contact_phone: clean(body.contact_phone),
    message: clean(body.message, MAX.long),
  };

  const errors: Record<string, string> = {};
  if (!ENQUIRY_TYPES.includes(enquiryType)) errors.enquiry_type = "Pick what you're after.";
  if (!looksLikeName(input.contact_name)) errors.contact_name = "Enter a name using letters.";
  if (!looksLikeEmail(input.contact_email) && !/^\d{7,15}$/.test(input.contact_phone)) {
    errors.contact_email = "Enter a valid email address or phone number.";
  }
  if (input.contact_phone && !/^\d{7,15}$/.test(input.contact_phone)) {
    errors.contact_phone = "Use 7–15 digits only.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const row = await bookings.create(input);

  const summary = [
    `New booking request — ${ENQUIRY_LABELS[enquiryType]}`,
    "",
    `From:      ${input.contact_name}${input.contact_email ? ` <${input.contact_email}>` : ""}`,
    input.contact_phone ? `Phone:     ${input.contact_phone}` : null,
    `City:      ${input.city || "—"}`,
    `Date:      ${input.event_date || "—"}`,
    `Event:     ${input.event_type || "—"}`,
    `Audience:  ${input.expected_audience || "—"}`,
    `Budget:    ${input.budget_range || "—"}`,
    "",
    input.message || "(no message)",
    "",
    `Reference: ${row.id}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const subject = `Booking: ${ENQUIRY_LABELS[enquiryType]} — ${input.city || "no city"}`;
  const detailRows = [
    ["Source", source],
    ["Request type", ENQUIRY_LABELS[enquiryType]],
    ["Name", input.contact_name],
    ["Email", input.contact_email],
    ["Phone", input.contact_phone || "—"],
    ["City", input.city || "—"],
    ["Date", input.event_date || "—"],
    ["Event", input.event_type || "—"],
    ["Expected audience", input.expected_audience || "—"],
    ["Budget", input.budget_range || "—"],
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;color:#171717;font-family:Arial,sans-serif"><div style="max-width:680px;margin:0 auto;padding:32px 16px"><div style="background:#111;color:#fff;padding:24px;border-top:6px solid #ff0033"><div style="font-size:12px;letter-spacing:2px;color:#ff6b83">NEW WEBSITE QUERY</div><h1 style="margin:8px 0 0;font-size:24px">${escapeHtml(ENQUIRY_LABELS[enquiryType])}</h1></div><div style="background:#fff;padding:24px;border:1px solid #e5e7eb"><table role="presentation" style="width:100%;border-collapse:collapse">${detailRows.map(([label, value]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #eee;color:#666;width:34%">${escapeHtml(label)}</td><td style="padding:9px 0;border-bottom:1px solid #eee;font-weight:600">${escapeHtml(value)}</td></tr>`).join("")}</table><h2 style="margin:24px 0 8px;font-size:16px">Message</h2><div style="white-space:pre-wrap;line-height:1.6;background:#f8f8f8;padding:16px">${escapeHtml(input.message || "No additional message.")}</div><p style="margin:22px 0 0;color:#666;font-size:12px">Reference: ${escapeHtml(row.id)} · Reply to this email to respond directly to ${escapeHtml(input.contact_name)}.</p></div></div></body></html>`;
  if (await notify(summary, html, subject, input.contact_email)) {
    await bookings.markEmailed(row.id);
  }

  return NextResponse.json({ ok: true, id: row.id });
}
