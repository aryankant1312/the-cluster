import { NextResponse } from "next/server";
import {
  adminConfigured,
  createSession,
  destroySession,
  isAuthenticated,
  verifyPassword,
} from "@/lib/admin-auth";
import { bookings, manualStats, newsletter, wall } from "@/lib/db/repositories";
import type { BookingStatus } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Single admin endpoint. Everything except login/logout requires a valid
 * session, checked before any repository call — never after.
 *
 * Booking rows carry real contact details and wall rows carry hashed
 * submitter IPs, so nothing here is reachable without authenticating, and
 * ip_hash is stripped from every response regardless.
 */

async function guard(): Promise<NextResponse | null> {
  if (!adminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Admin is not configured. Set ADMIN_PASSWORD_HASH." },
      { status: 503 },
    );
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;

  const [requests, reported, manual, subscribers] = await Promise.all([
    bookings.list(200),
    wall.reported(),
    manualStats.all(),
    newsletter.list(500),
  ]);

  return NextResponse.json({
    ok: true,
    bookings: requests,
    reported: reported.map(({ ip_hash: _ipHash, ...rest }) => rest),
    manual,
    // Subscriber rows carry a hashed submitter IP, which is an internal
    // moderation detail and never leaves the server — same rule as wall posts.
    subscribers: subscribers.map(({ ip_hash: _ipHash, ...rest }) => rest),
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  // Login is the only unauthenticated action.
  if (action === "login") {
    if (!adminConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Admin is not configured. Set ADMIN_PASSWORD_HASH." },
        { status: 503 },
      );
    }
    if (!verifyPassword(String(body.password ?? ""))) {
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }
    await createSession();
    return NextResponse.json({ ok: true });
  }

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  const blocked = await guard();
  if (blocked) return blocked;

  switch (action) {
    case "remove_post":
      await wall.remove(String(body.post_id ?? ""));
      return NextResponse.json({ ok: true });

    case "booking_status":
      await bookings.setStatus(
        String(body.booking_id ?? ""),
        String(body.status ?? "read") as BookingStatus,
      );
      return NextResponse.json({ ok: true });

    case "set_manual_stat":
      await manualStats.set(String(body.key ?? ""), String(body.value ?? ""));
      return NextResponse.json({ ok: true });

    default:
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
}
