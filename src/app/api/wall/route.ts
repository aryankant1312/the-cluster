import { NextResponse } from "next/server";
import { hashIp, wall } from "@/lib/db/repositories";
import { parseMediaUrl } from "@/lib/media-embed";
import type { MediaProvider } from "@/lib/db/types";
import {
  RATE_LIMIT,
  containsBlockedWord,
  looksLikeSpam,
  rateLimitSince,
} from "@/lib/moderation";

export const runtime = "nodejs";

const MAX_AUTHOR = 40;
const MAX_BODY = 400;

/** Raw addresses are hashed immediately and never stored. */
function submitterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

export async function GET() {
  const posts = await wall.listVisible(200);
  // ip_hash is an internal moderation detail; it never leaves the server.
  return NextResponse.json({
    posts: posts.map(({ ip_hash: _ipHash, ...rest }) => rest),
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const author = String(body.author ?? "").trim().slice(0, MAX_AUTHOR);
  const message = String(body.body ?? "").trim().slice(0, MAX_BODY);
  const rawMedia = String(body.media_url ?? "").trim();

  if (!message && !rawMedia) {
    return NextResponse.json(
      { ok: false, error: "Leave a message or a link — ideally both." },
      { status: 422 },
    );
  }

  let mediaUrl = "";
  let mediaProvider: MediaProvider | "" = "";
  let mediaEmbedId = "";

  if (rawMedia) {
    const parsed = parseMediaUrl(rawMedia);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "That link didn't look like a valid web address." },
        { status: 422 },
      );
    }
    mediaUrl = parsed.url;
    mediaProvider = parsed.provider;
    mediaEmbedId = parsed.embedId;
  }

  if (containsBlockedWord(message) || containsBlockedWord(author)) {
    return NextResponse.json(
      { ok: false, error: "That wording won't make it onto the wall." },
      { status: 422 },
    );
  }
  if (looksLikeSpam(message)) {
    return NextResponse.json(
      { ok: false, error: "Too many links in one message." },
      { status: 422 },
    );
  }

  const ipHash = submitterHash(request);
  const recent = await wall.countSince(ipHash, rateLimitSince());
  if (recent >= RATE_LIMIT.maxPosts) {
    return NextResponse.json(
      { ok: false, error: "You've posted a few times just now — give it a minute." },
      { status: 429 },
    );
  }

  const post = await wall.create({
    author,
    body: message,
    media_url: mediaUrl,
    media_provider: mediaProvider,
    media_embed_id: mediaEmbedId,
    ip_hash: ipHash,
  });

  const { ip_hash: _ipHash, ...safe } = post;
  return NextResponse.json({ ok: true, post: safe });
}
