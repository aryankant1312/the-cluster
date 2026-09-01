/**
 * SHARING A SKY — the URL round-trip, and the print.
 *
 * A drawn sky is a name, an optional dedication, and a list of edges between
 * catalogue star indices. That is small enough to live entirely in a URL, so
 * there is no backend here and no row written anywhere: the link *is* the
 * storage.
 *
 * This only works because `catalog.ts` is deterministic — index 412 has to be
 * the same star in the recipient's browser as in the author's. See the note at
 * the top of that module before changing its seed or star count.
 *
 * WHAT A LINK DOES NOT GRANT. The sky lives inside the Vault, behind a
 * four-digit code. Opening a shared link opens the Vault and asks for the code
 * exactly as it always does; the sky is replayed only once it is entered.
 * Sharing a drawing is not sharing a key, and a URL is readable by everyone it
 * is forwarded to, so it must never be the thing that authorises entry.
 */

import { STAR_COUNT } from "./catalog";

/** Query parameter carrying an encoded sky. */
export const SKY_PARAM = "sky";

const MAX_NAME = 60;
const MAX_STORY = 160;

/** Guard against a hand-edited link asking the renderer to draw a million lines. */
const MAX_EDGES = 4000;

export interface SharedSky {
  name: string;
  story?: string;
  edges: Array<[number, number]>;
}

/** The wire shape. Keys are one character because the whole thing is a URL. */
interface Wire {
  v: 1;
  n: string;
  s?: string;
  e: Array<[number, number]>;
}

/* ── base64url ──────────────────────────────────────────────────────────── */

/*
 * `btoa` is Latin-1 only, and a sky called "Kavya's" or "L'Étoile" is entirely
 * expected, so the JSON is UTF-8 encoded before it is base64'd. Going straight
 * to `btoa` throws an InvalidCharacterError on the first non-ASCII byte — the
 * share button would simply fail for exactly the names people want most.
 *
 * base64url rather than base64: `+` and `/` both need percent-encoding in a
 * query string, and `=` padding is noise. Stripping them keeps the link
 * copy-pasteable out of a chat client that stops selecting at a punctuation
 * mark.
 */

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ── Encode / decode ────────────────────────────────────────────────────── */

export function encodeSky(sky: SharedSky): string {
  const wire: Wire = {
    v: 1,
    n: sky.name.slice(0, MAX_NAME),
    e: sky.edges.slice(0, MAX_EDGES),
  };
  const story = sky.story?.trim();
  if (story) wire.s = story.slice(0, MAX_STORY);
  return toBase64Url(JSON.stringify(wire));
}

/**
 * Decode a `?sky=` value, or null.
 *
 * Every field is validated rather than trusted. This string arrives from a URL,
 * which means it can be anything at all — truncated by a chat client, edited by
 * hand, or written by a future version of this format. An edge naming star
 * 90,000 would index past the catalogue and put `undefined` into the
 * renderer's hot loop, so out-of-range pairs are dropped individually, and a
 * payload that is not recognisably a sky returns null for the caller to ignore.
 */
export function decodeSky(raw: string): SharedSky | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(raw));
  } catch {
    // Not base64, not JSON, or truncated in transit. Nothing to recover.
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const wire = parsed as Partial<Wire>;
  if (wire.v !== 1 || !Array.isArray(wire.e)) return null;

  const edges: Array<[number, number]> = [];
  for (const edge of wire.e.slice(0, MAX_EDGES)) {
    if (!Array.isArray(edge) || edge.length !== 2) continue;
    const [a, b] = edge;
    if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
    if (a < 0 || b < 0 || a >= STAR_COUNT || b >= STAR_COUNT) continue;
    // A star joined to itself is not a line: it draws as a zero-length segment
    // and still counts toward the figure size, so it is dropped.
    if (a === b) continue;
    edges.push([a, b]);
  }
  if (edges.length === 0) return null;

  return {
    name: typeof wire.n === "string" ? wire.n.slice(0, MAX_NAME) : "",
    story: typeof wire.s === "string" ? wire.s.slice(0, MAX_STORY) : undefined,
    edges,
  };
}

/** The current page's `?sky=`, decoded, or null. Safe to call on the server. */
export function readSkyFromLocation(): SharedSky | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(SKY_PARAM);
  return raw ? decodeSky(raw) : null;
}

/**
 * An absolute link to this sky, on the page the visitor is currently on.
 *
 * Built from `origin + pathname` rather than from `href`, so opening a shared
 * link and sharing it again does not append a second `?sky=` to the first.
 */
export function skyShareUrl(sky: SharedSky): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?${SKY_PARAM}=${encodeSky(sky)}`;
}

/**
 * Remove `?sky=` from the address bar without navigating.
 *
 * Called once the shared sky has been replayed. Leaving it there means a
 * refresh silently discards whatever the visitor drew afterwards and restores
 * the sky they were sent, which reads as the page eating their work.
 */
export function clearSkyParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SKY_PARAM)) return;
  url.searchParams.delete(SKY_PARAM);
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

/* ── The print ──────────────────────────────────────────────────────────── */

/** 4K, in the spec's sense: 3840 across. */
const EXPORT_WIDTH = 3840;
const EXPORT_HEIGHT = 2160;

export interface ExportPoint {
  /** Position in 0–1 of the export frame. */
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
}

export interface ExportRequest {
  name: string;
  story?: string;
  stars: ExportPoint[];
  edges: Array<[ExportPoint, ExportPoint]>;
}

/**
 * Draw the sky at 3840×2160 on an offscreen canvas and hand back a PNG blob.
 *
 * Re-projected by the caller into normalised coordinates rather than scaled up
 * from the visible canvas: upscaling a 1200px canvas to 4K gives a 4K-sized
 * image of a 1200px drawing, with every star a soft square. Redrawing at the
 * target size is the only way the export is actually sharp.
 *
 * Returns null when the browser refuses to produce a blob, which in practice
 * means the canvas was tainted — there is nothing useful to do about that
 * beyond telling the caller it did not happen.
 */
export async function exportSkyPng(request: ExportRequest): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Ground: the same deep-space wash the live canvas uses.
  const sky = ctx.createRadialGradient(
    EXPORT_WIDTH / 2,
    EXPORT_HEIGHT / 2,
    0,
    EXPORT_WIDTH / 2,
    EXPORT_HEIGHT / 2,
    EXPORT_WIDTH * 0.72,
  );
  sky.addColorStop(0, "#1e1b4b");
  sky.addColorStop(0.45, "#0b0f29");
  sky.addColorStop(1, "#030712");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  drawGrid(ctx);

  for (const star of request.stars) {
    const x = star.x * EXPORT_WIDTH;
    const y = star.y * EXPORT_HEIGHT;
    const r = star.size * 3.2;
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (r > 4) {
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
      halo.addColorStop(0, star.color);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = star.alpha * 0.28;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Drawn lines, over the stars.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 26;
  for (const [a, b] of request.edges) {
    ctx.beginPath();
    ctx.moveTo(a.x * EXPORT_WIDTH, a.y * EXPORT_HEIGHT);
    ctx.lineTo(b.x * EXPORT_WIDTH, b.y * EXPORT_HEIGHT);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  drawTitle(ctx, request.name, request.story);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** A faint celestial grid, so the print reads as a chart and not as wallpaper. */
function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.11)";
  ctx.lineWidth = 1.5;
  // Twenty-four columns and twelve rows: one column an hour of right ascension,
  // one row fifteen degrees of declination.
  const cols = 24;
  const rows = 12;
  for (let i = 1; i < cols; i++) {
    const x = (i / cols) * EXPORT_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, EXPORT_HEIGHT);
    ctx.stroke();
  }
  for (let i = 1; i < rows; i++) {
    const y = (i / rows) * EXPORT_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(EXPORT_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Title plate, bottom left, clear of the middle of the drawing. */
function drawTitle(ctx: CanvasRenderingContext2D, name: string, story?: string) {
  const trimmed = name.trim();
  const title = trimmed ? `The ${trimmed} Constellation` : "An Unnamed Constellation";

  ctx.save();
  ctx.textBaseline = "alphabetic";

  ctx.font = "600 116px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 28;
  ctx.fillText(title, 190, EXPORT_HEIGHT - 260);

  if (story?.trim()) {
    ctx.font = "italic 56px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
    ctx.fillText(story.trim(), 190, EXPORT_HEIGHT - 172);
  }

  ctx.font = "500 38px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.72)";
  ctx.fillText("THE CLUSTER  ·  THE VAULT", 190, EXPORT_HEIGHT - 100);

  ctx.restore();
}
