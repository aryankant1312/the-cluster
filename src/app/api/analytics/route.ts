import { NextResponse } from "next/server";
import { currentUserAnyPersona } from "@/lib/auth";
import { analytics, hashIp } from "@/lib/db/repositories";
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventType } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where visits and events are filed.
 *
 * ONE ENDPOINT, TWO JOBS. `start` opens a visit and hands back its id; every
 * other call appends to one already open. They share a route because the
 * client has one buffer and one flush, and the first flush of a visit is both.
 *
 * IDENTITY COMES FROM THE COOKIE, NEVER FROM THE BODY. The client posts no
 * user id, and could not be trusted with one if it did — a browser saying
 * "this is user X" is a browser claiming to be anybody. `currentUser()` reads
 * the signed session instead, which is the only statement about identity worth
 * recording.
 *
 * WHY IT ALWAYS ANSWERS `ok`. A visitor's experience must never degrade
 * because a metric could not be written. A failed insert is logged for whoever
 * runs the site and reported as success to the page, which has nothing useful
 * to do with the news and would only spend a retry on it. This is telemetry:
 * a lost row is worth strictly less than a broken click.
 *
 * The route is a `sendBeacon` target, and browsers cap those bodies at 64 KB,
 * so the batch limit below sits well under it.
 */

/** More than a busy minute produces, and far under the beacon's ceiling. */
const MAX_EVENTS = 60;

const EVENT_TYPES = new Set<string>(ANALYTICS_EVENT_TYPES);

function requesterHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashIp(ip);
}

interface IncomingEvent {
  type: AnalyticsEventType;
  name?: string;
  persona?: string;
  windowId?: string;
  route?: string;
  durationMs?: number | null;
  meta?: unknown;
  at?: string;
}

/**
 * Keep only what is recognised.
 *
 * An unknown `type` is dropped rather than stored, because this table's whole
 * value is in being able to group by it: one caller posting `"windowOpen"`
 * where the rest post `"window_open"` silently halves every answer, and a typo
 * that reaches the database outlives the deploy that introduced it.
 */
function clean(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const type = String(e.type ?? "");
  if (!EVENT_TYPES.has(type)) return null;

  const durationRaw = e.durationMs;
  const duration =
    typeof durationRaw === "number" && Number.isFinite(durationRaw) && durationRaw >= 0
      ? Math.round(durationRaw)
      : null;

  return {
    type: type as AnalyticsEventType,
    name: typeof e.name === "string" ? e.name : undefined,
    persona: typeof e.persona === "string" ? e.persona : undefined,
    windowId: typeof e.windowId === "string" ? e.windowId : undefined,
    route: typeof e.route === "string" ? e.route : undefined,
    durationMs: duration,
    meta: e.meta,
    at: typeof e.at === "string" ? e.at : undefined,
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await currentUserAnyPersona();
  const userId = user?.id ?? "";

  try {
    if (body.action === "start") {
      const sessionId = await analytics.startSession({
        persona: typeof body.persona === "string" ? body.persona : "",
        locale: typeof body.locale === "string" ? body.locale : "",
        referrer: typeof body.referrer === "string" ? body.referrer : "",
        viewport: typeof body.viewport === "string" ? body.viewport : "",
        userAgent: request.headers.get("user-agent") ?? "",
        userId,
        ipHash: requesterHash(request),
      });
      return NextResponse.json({ ok: true, sessionId });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });

    // Somebody signed in part-way through a visit that started anonymous. The
    // visit and everything already filed under it become theirs, so their
    // history reads from the moment they landed rather than from the moment
    // they proved who they were.
    if (userId) await analytics.identify(sessionId, userId);

    const incoming = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
    const events = incoming.map(clean).filter((e): e is IncomingEvent => e !== null);
    await analytics.record(sessionId, userId, events);

    // The last flush of a visit carries this, sent from `visibilitychange`.
    if (body.end === true) await analytics.endSession(sessionId);

    return NextResponse.json({ ok: true, stored: events.length });
  } catch (error) {
    console.error("[analytics] write failed:", error);
    // Deliberately a success. See the note at the top of this file.
    return NextResponse.json({ ok: true, stored: 0 });
  }
}
