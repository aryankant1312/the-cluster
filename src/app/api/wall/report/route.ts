import { NextResponse } from "next/server";
import { hashIp, wall } from "@/lib/db/repositories";

export const runtime = "nodejs";

function submitterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

/**
 * Flags a post for review. Reporting never hides anything on its own — that
 * would hand any single visitor a delete button. The post stays up and
 * surfaces in the admin queue, ordered by report count.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const postId = String(body.post_id ?? "").trim();
  const reason = String(body.reason ?? "").trim().slice(0, 200);
  if (!postId) {
    return NextResponse.json({ ok: false, error: "Missing post id." }, { status: 422 });
  }

  await wall.report(postId, reason, submitterHash(request));
  return NextResponse.json({ ok: true });
}
