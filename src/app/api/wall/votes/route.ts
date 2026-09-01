import { NextResponse } from "next/server";
import { hashIp, wallTileVotes } from "@/lib/db/repositories";
import { clusterWallTiles } from "@/content/cluster-wall.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Up and down votes on the Cluster Wall's tiles.
 *
 * SEPARATE FROM `/api/votes`, WHICH IS THE CITY BOARD. That one is deliberately
 * uncapped — every tap counts, because it is a hype meter. This is a score, and
 * a score somebody can run up by holding a button down is not a score. Here one
 * voter holds one position per tile, and pressing the same arrow again takes it
 * back rather than adding to it.
 *
 * WHO A VOTER IS. The hashed IP — what the wall's posts, its reports and the
 * city board already use. It is not identity: a household shares one, and a
 * phone changes one on the way to work. But this is a picture wall rather than
 * an election, and the alternatives are a cookie anybody can clear or making
 * people sign in to press an arrow. The raw address is hashed on arrival and
 * never stored, exactly as on every other route here.
 *
 * VOTES FOR TILES THAT NO LONGER EXIST ARE DROPPED ON READ. The wall is
 * generated from whatever sits in `public/images/cluster-wall/`, so a tile can
 * leave between one deploy and the next. Its rows stay in the table, cost
 * nothing, and are filtered out here rather than migrated away.
 */

/** Raw addresses are hashed immediately and never stored. */
function voterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

const VALID_IDS = new Set(clusterWallTiles.map((t) => t.id));

/**
 * Every known tile: its baseline plus whatever has actually been voted.
 *
 * The seed is a floor rather than a substitute — a real upvote adds to it and
 * a real downvote subtracts, so the number on screen moves for the person who
 * pressed the arrow. Clamped at zero, because a tile with a small seed and
 * many downvotes should read as nought rather than as a negative count.
 */
function board(
  tallied: Record<string, { up: number; down: number }>,
  seeds: Record<string, { up: number; down: number }>,
) {
  return Object.fromEntries(
    clusterWallTiles.map((t) => {
      const seed = seeds[t.id] ?? { up: 0, down: 0 };
      const real = tallied[t.id] ?? { up: 0, down: 0 };
      return [
        t.id,
        { up: Math.max(0, seed.up + real.up), down: Math.max(0, seed.down + real.down) },
      ];
    }),
  );
}

/** A wall with no database behind it still draws — every tile simply sits at zero. */
function emptyBoard() {
  return Object.fromEntries(clusterWallTiles.map((t) => [t.id, { up: 0, down: 0 }]));
}

export async function GET(request: Request) {
  try {
    const hash = voterHash(request);
    const [tallied, seeds, mine] = await Promise.all([
      wallTileVotes.tally(),
      wallTileVotes.seeds(),
      wallTileVotes.mine(hash),
    ]);
    return NextResponse.json(
      { counts: board(tallied, seeds), mine },
      // Per-voter content: `mine` is this browser's own position, and a shared
      // cache handing it to the next visitor would light their arrows with
      // somebody else's votes.
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    // An unreachable database should leave the wall drawable rather than
    // failing the whole window. Counts at zero, nothing lit.
    return NextResponse.json(
      { counts: emptyBoard(), mine: {}, degraded: true },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const tileId = String(body.tile_id ?? "").trim();
  if (!VALID_IDS.has(tileId)) {
    return NextResponse.json(
      { ok: false, error: "That tile isn't on the wall." },
      { status: 422 },
    );
  }

  // Narrowed rather than cast: this goes straight into the table, and
  // "whatever the caller typed" is not a vote.
  const raw = Number(body.value);
  if (raw !== 1 && raw !== -1) {
    return NextResponse.json({ ok: false, error: "A vote is 1 or -1." }, { status: 422 });
  }

  try {
    const position = await wallTileVotes.cast(tileId, raw, voterHash(request));
    const [tallied, seeds] = await Promise.all([
      wallTileVotes.tally(),
      wallTileVotes.seeds(),
    ]);
    return NextResponse.json(
      { ok: true, counts: board(tallied, seeds), position },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't record that vote. Try again in a moment." },
      { status: 503 },
    );
  }
}
