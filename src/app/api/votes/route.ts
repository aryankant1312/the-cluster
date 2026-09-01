import { NextResponse } from "next/server";
import { cityVotes, hashIp } from "@/lib/db/repositories";
import { voteCities } from "@/content/vote-cities";

export const runtime = "nodejs";

/**
 * "Where should DOTM play next?" — the vote board.
 *
 * Voting is deliberately uncapped: every tap counts. That makes this a hype
 * meter rather than a poll, so there is no per-voter guard here on purpose.
 * The IP is still hashed and recorded, which costs nothing now and leaves the
 * door open to auditing or de-duplicating later without losing the raw taps.
 *
 * A city's displayed total is its seed value from `content/vote-cities.ts`
 * plus the taps in the database. The seed keeps a fresh install from showing
 * an all-zero board, and never has to be migrated into the table.
 */

/** Raw addresses are hashed immediately and never stored. */
function submitterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

const VALID_IDS = new Set(voteCities.map((c) => c.id));

/** Seed + recorded taps, keyed by city id. */
async function board(): Promise<Record<string, number>> {
  const tapped = await cityVotes.tally();
  return Object.fromEntries(
    voteCities.map((c) => [c.id, c.votes + (tapped[c.id] ?? 0)]),
  );
}

/** The board with no database behind it — seeds only. */
function seedBoard(): Record<string, number> {
  return Object.fromEntries(voteCities.map((c) => [c.id, c.votes]));
}

export async function GET() {
  try {
    return NextResponse.json({ counts: await board() });
  } catch {
    // An unreachable database should degrade to the seed board rather than
    // blanking the leaderboard entirely.
    return NextResponse.json({ counts: seedBoard(), degraded: true });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const cityId = String(body.city_id ?? "").trim();
  if (!VALID_IDS.has(cityId)) {
    return NextResponse.json(
      { ok: false, error: "That city isn't on the board." },
      { status: 422 },
    );
  }

  try {
    await cityVotes.add(cityId, submitterHash(request));
    return NextResponse.json({ ok: true, counts: await board() });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't record that vote. Try again in a moment." },
      { status: 503 },
    );
  }
}
