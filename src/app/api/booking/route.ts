import { NextResponse } from "next/server";
import { bookings } from "@/lib/db/repositories";
import { ENQUIRY_LABELS, ENQUIRY_TYPES, type EnquiryType } from "@/lib/db/types";

export const runtime = "nodejs";

const MAX = { short: 120, long: 2000 } as const;

function clean(v: unknown, limit: number = MAX.short): string {
  return typeof v === "string" ? v.trim().slice(0, limit) : "";
}

/** Deliberately permissive — rejecting unusual but valid addresses loses work. */
function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Notification is best-effort and deliberately non-fatal: the request is
 * already durable in the database by the time this runs. A missing key or a
 * Resend outage must never cost a booking — it just shows as un-emailed in
 * the admin inbox.
 */
async function notify(summary: string, subject: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_EMAIL;
  if (!key || !to) return false;

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
        subject,
        text: summary,
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
  if (!input.contact_name) errors.contact_name = "Tell us who you are.";
  if (!looksLikeEmail(input.contact_email)) errors.contact_email = "Needs a valid email.";
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const row = await bookings.create(input);

  const summary = [
    `New booking request — ${ENQUIRY_LABELS[enquiryType]}`,
    "",
    `From:      ${input.contact_name} <${input.contact_email}>`,
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
  if (await notify(summary, subject)) {
    await bookings.markEmailed(row.id);
  }

  return NextResponse.json({ ok: true, id: row.id });
}
