import type { MediaProvider } from "@/lib/db/types";

/**
 * Fan submissions are links, not uploads. This turns a pasted URL into a
 * provider plus the id needed to embed it. Only Instagram and YouTube are
 * accepted: every saved link must have a predictable, safe widget size.
 */

export interface ParsedMedia {
  provider: MediaProvider;
  embedId: string;
  /** Normalised URL to store and link out to. */
  url: string;
}

export function parseMediaUrl(raw: string): ParsedMedia | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? { provider: "youtube", embedId: id, url: u.toString() } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id =
      u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    return id ? { provider: "youtube", embedId: id, url: u.toString() } : null;
  }
  if (host === "instagram.com") {
    const id = u.pathname.match(/\/(?:p|reel|reels|tv)\/([^/?]+)/)?.[1];
    return id ? { provider: "instagram", embedId: id, url: u.toString() } : null;
  }

  return null;
}

/** Player URL for an embeddable provider, or null when only a link is possible. */
export function embedUrlFor(provider: string, embedId: string): string | null {
  if (provider === "youtube" && embedId) {
    return `https://www.youtube-nocookie.com/embed/${embedId}`;
  }
  if (provider === "instagram" && embedId) {
    return `https://www.instagram.com/p/${embedId}/embed`;
  }
  return null;
}
