"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersona } from "@/components/providers/PersonaProvider";
import { embedUrlFor } from "@/lib/media-embed";
import { cn } from "@/lib/utils";

/**
 * THE CLUSTER WALL — one mixed feed where a scrawled line sits next to a
 * photo, the way a real graffiti wall works. Text notes and media links
 * share the same stream at different card sizes.
 *
 * Submissions are links rather than uploads, publish immediately, and carry
 * a report control. Reporting flags for review; it never hides a post on its
 * own.
 */

/** Server shape minus ip_hash, which the API strips before responding. */
interface WallPostView {
  id: string;
  author: string;
  body: string;
  media_url: string;
  media_provider: string;
  media_embed_id: string;
  status: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ClusterWallFeed() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";

  const [posts, setPosts] = useState<WallPostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wall");
      const data = (await res.json()) as { posts: WallPostView[] };
      setPosts(data.posts);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body: message, media_url: link }),
      });
      const data = (await res.json()) as
        | { ok: true; post: WallPostView }
        | { ok: false; error: string };
      if (data.ok) {
        setPosts((prev) => [data.post, ...prev]);
        setMessage("");
        setLink("");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Couldn't reach the wall. Try again in a moment.");
    } finally {
      setSending(false);
    }
  };

  const report = async (id: string) => {
    setReported((prev) => new Set(prev).add(id));
    try {
      await fetch("/api/wall/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, reason: "" }),
      });
    } catch {
      /* the optimistic state is enough; a lost report is not worth a dialog */
    }
  };

  const mutedText = isDotm ? "text-white/40" : "text-black/45";

  return (
    <div
      className={cn(
        // Reading surface: posts are prose. See `.long-text` in globals.css.
        "long-text h-full w-full overflow-y-auto",
        isDotm ? "bg-[#0a0a0b] text-white" : "bg-persona-window-bg text-black",
      )}
    >
      <div className="mx-auto max-w-5xl px-5 py-8">
        <header className="text-center">
          <h2
            className={cn(
              "font-chrome text-2xl uppercase tracking-[0.24em] sm:text-3xl",
              isDotm && "text-[#ff0033]",
            )}
          >
            Post anything
          </h2>
          <p className={cn("mt-2 font-body text-xs", isDotm ? "text-white/45" : "text-black/50")}>
            Leave something behind
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className={cn(
            "mt-6 p-4",
            isDotm
              ? "rounded-[var(--radius-window)] bg-white/5 ring-1 ring-white/10"
              : "win98-border bg-persona-surface",
          )}
        >
          <label htmlFor="wall-message" className="sr-only">
            What does DOTM&apos;s music mean to you?
          </label>
          <textarea
            id="wall-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={400}
            placeholder="What does DOTM's music mean to you?"
            className={cn(
              "w-full resize-none px-3 py-2 font-body text-sm outline-none",
              isDotm
                ? "rounded-md bg-black/40 text-white ring-1 ring-white/15 placeholder:text-white/30 focus:ring-2 focus:ring-[#ff0033]"
                : "win98-border bg-white text-black placeholder:text-black/35",
            )}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Your name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={40}
              placeholder="Name (optional)"
              className={cn(
                "px-3 py-2 font-body text-sm outline-none",
                isDotm
                  ? "rounded-md bg-black/40 text-white ring-1 ring-white/15 placeholder:text-white/30"
                  : "win98-border bg-white text-black placeholder:text-black/35",
              )}
            />
            <input
              aria-label="Instagram or YouTube link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              inputMode="url"
              placeholder="Instagram / YouTube link (optional)"
              className={cn(
                "px-3 py-2 font-body text-sm outline-none",
                isDotm
                  ? "rounded-md bg-black/40 text-white ring-1 ring-white/15 placeholder:text-white/30"
                  : "win98-border bg-white text-black placeholder:text-black/35",
              )}
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 font-body text-xs text-[color:var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || (!message.trim() && !link.trim())}
            className={cn(
              "mt-3 w-full py-2.5 font-chrome text-xs uppercase tracking-[0.22em] transition disabled:opacity-40",
              isDotm
                ? "rounded-md bg-[#ff0033] text-white hover:bg-[#d4002b]"
                : "win98-border win98-press bg-persona-surface-alt text-black",
            )}
          >
            {sending ? "Posting…" : "Leave it on the wall"}
          </button>
          <p className={cn("mt-2 font-body text-[11px]", isDotm ? "text-white/35" : "text-black/45")}>
            Posts appear immediately. Anyone can flag one for review.
          </p>
        </form>

        <section className="mt-8">
          {loading ? (
            <p className={cn("py-10 text-center font-body text-sm", mutedText)}>Loading the wall…</p>
          ) : failed ? (
            <p className={cn("py-10 text-center font-body text-sm", mutedText)}>
              Couldn&apos;t load the wall.
            </p>
          ) : posts.length === 0 ? (
            <p className={cn("py-10 text-center font-body text-sm", mutedText)}>
              Nothing on the wall yet. Be the first.
            </p>
          ) : (
            <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  isDotm={isDotm}
                  reported={reported.has(post.id)}
                  onReport={() => void report(post.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({
  post,
  isDotm,
  reported,
  onReport,
}: {
  post: WallPostView;
  isDotm: boolean;
  reported: boolean;
  onReport: () => void;
}) {
  const embed = embedUrlFor(post.media_provider, post.media_embed_id);

  return (
    <li
      className={cn(
        "overflow-hidden",
        isDotm
          ? "rounded-[var(--radius-window)] bg-white/5 ring-1 ring-white/10"
          : "win98-border bg-persona-surface",
      )}
    >
      {embed && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embed}
            title={post.author ? `Shared by ${post.author}` : "Fan submission"}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="p-4">
        {post.body && <p className="font-body text-sm leading-relaxed">{post.body}</p>}

        {post.media_url && !embed && (
          <a
            href={post.media_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={cn(
              "mt-2 block truncate font-body text-xs underline",
              isDotm ? "text-white/60" : "text-black/60",
            )}
          >
            {post.media_url}
          </a>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p
            className={cn(
              "min-w-0 truncate font-chrome text-[11px] uppercase tracking-[0.16em]",
              isDotm ? "text-white/45" : "text-black/50",
            )}
          >
            {post.author || "Anonymous"} · {timeAgo(post.created_at)}
          </p>
          <button
            type="button"
            onClick={onReport}
            disabled={reported}
            className={cn(
              "shrink-0 font-body text-[11px] underline disabled:no-underline",
              isDotm ? "text-white/35 hover:text-white/70" : "text-black/40 hover:text-black/70",
            )}
          >
            {reported ? "Flagged" : "Report"}
          </button>
        </div>
      </div>
    </li>
  );
}

export default ClusterWallFeed;
