"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./ContactCard.module.css";

/**
 * DOTM's contact card, as a brutalist type-poster.
 *
 * The old card was a grey circle with a "D" in it beside four unstyled
 * label/value pairs — a form, not a statement. This treats the name as the
 * artwork: oversized stacked type, hard red-on-black rules, square corners,
 * no soft shadows.
 *
 * The type deliberately steps outside the DOTM persona serif. Cinzel is cut
 * for engraved capitals at display size and goes muddy in a dense contact
 * block, so details are set in a grotesque with a monospace for labels, which
 * is what gives the card its poster feel. The persona serif still carries the
 * bio, so the card stays part of DOTM's world.
 *
 * Booking sits on the card rather than in a window of its own, matching the
 * DEV side where Contact hands straight off to BOOK DOTM.
 */

const BIO =
  "July 2023. A breakup left Dev with nothing to lose and everything to say — so he picked up the mic, and the mic split him in two. DEV is the feeling: soft, raw, up all night. DOTM is the voice: loud, fearless, saying what nobody else will. Two sides, one pen, zero industry backing. The songs travelled. The listeners stayed. And a cult grew around them — CLUSTER, the fanbase that moves like a movement. This is where the spectrum begins. On my way to FINDING PEACE.";

const EMAIL = "dotmoriginal@gmail.com";
const PHONE = "+91 9667374331";
const INSTAGRAM_URL = "https://www.instagram.com/devilonthemic/";

type SubscribeState = "idle" | "sending" | "done" | "error";
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

export function ContactCard({ onBook }: { onBook?: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubscribeState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Reflow first; scale only if a short viewport still cannot fit the card.
  // Increasing the layout dimensions before scaling preserves its full width
  // and retains every word and control instead of clipping the overflow.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const layout = layoutRef.current;
    if (!card || !layout) return;
    let disposed = false;
    const fit = () => {
      if (disposed || !card.clientHeight) return;
      let scale = 1;
      card.style.setProperty("--contact-fit", "1");
      for (let pass = 0; pass < 4; pass += 1) {
        const renderedHeight = layout.scrollHeight * scale;
        if (renderedHeight <= card.clientHeight + 1) break;
        scale *= card.clientHeight / renderedHeight;
        card.style.setProperty("--contact-fit", String(scale));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    document.fonts.ready.then(fit);
    document.fonts.addEventListener("loadingdone", fit);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, [message, state, copied]);

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard blocked (insecure context or denied permission). The value
      // is on screen and selectable, so this does not warrant an error state.
    }
  };

  const subscribe = async () => {
    if (state === "sending") return;
    if (!EMAIL_PATTERN.test(email.trim())) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "dotm-contact" }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (body.ok) {
        setState("done");
        setMessage("You're on the list.");
        setEmail("");
        setTimeout(() => setState("idle"), 2600);
      } else {
        setState("error");
        setMessage(body.error ?? "That didn't go through.");
      }
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Try again in a moment.");
    }
  };

  return (
    <div ref={cardRef} className={cn(styles.card, "bg-[#0a0a0b] text-white")}>
      {/* Landscape: the poster, the details and the portrait sit side by
          side. Stacked in one column the card became a scroll — and a
          contact card you have to scroll is a form again, which is the one
          thing the poster treatment exists to avoid. */}
      {/* Give width back to the biography while retaining the wide portrait. */}
      <div ref={layoutRef} className={styles.layout}>
        {/* ── Type side ──────────────────────────────────────────────── */}
        {/* No rule against the details column either. The two of them are one
            block of type read left to right, and a hairline between them cut
            it in half — the same argument that already keeps a border off the
            photograph's edge, applied one column earlier. The stacked rule
            below stays: there the columns really are separate rows. */}
        <div className={cn(styles.poster, "min-w-0 border-b border-white/10 md:border-b-0")}>
          <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#ff2244]">
            Contact
          </p>

          {/*
            DEVIL / ON / THE / MIC — one word per line, each with its initial
            struck in red.

            WHY THE MARKUP IS SPLIT PER LETTER. The colour break falls inside a
            word, and there is no way to say "first character" in CSS that
            works here: `::first-letter` applies only to the first formatted
            line of a block, so it would colour the D of DEVIL and nothing
            else. Four spans, each carrying its own initial, is the only shape
            that gives every line the same treatment.

            `aria-label` on the heading with the spans hidden: a screen reader
            walking eight fragments announces "D EVIL O N T HE M IC", which is
            not the name. One label reads it the way it is said, and the
            colouring stays what it is — a visual device, with nothing to
            announce.
          */}
          <h2
            aria-label="Devil On The Mic"
            className={cn(styles.heading, "font-sans font-black uppercase leading-[0.84] tracking-[-0.03em]")}
          >
            {[
              ["D", "EVIL"],
              ["O", "N"],
              ["T", "HE"],
              ["M", "IC"],
            ].map(([initial, rest]) => (
              <span key={initial + rest} aria-hidden="true" className="block">
                <span className="text-[#ff2244]">{initial}</span>
                <span className="text-white">{rest}</span>
              </span>
            ))}
          </h2>

          <div aria-hidden="true" className={cn(styles.rule, "h-[3px] w-full bg-[#ff2244]")} />

          <p className={cn(styles.roles, "font-mono text-[11px] uppercase tracking-[0.24em] text-white/55")}>
            Director · Rapper · Producer · Composer · Delhi, IN
          </p>

          {/* Reading surface. See `.long-text` in globals.css. */}
          <p className={cn(styles.bio, "long-text max-w-prose font-body text-white/70")}>
            {BIO}
          </p>
        </div>

        {/* ── Details side ───────────────────────────────────────────── */}
        {/* No right-hand rule. The photograph beside this column is blended
            into the card with a gradient, and a hairline drawn across that
            gradient is the one thing that would give the seam away. The
            stacked-layout rule below it stays — there the photograph sits
            underneath rather than alongside, so there is no gradient for a
            border to contradict. */}
        <div className={cn(styles.details, "flex min-w-0 flex-col border-b border-white/10 md:border-b-0")}>
          <dl className="divide-y divide-white/10 border-y border-white/10">
            <Row
              label="Mail"
              value={EMAIL}
              href={`mailto:${EMAIL}`}
              onCopy={() => copy(EMAIL, "mail")}
              copied={copied === "mail"}
            />
            <Row
              label="Phone"
              value={PHONE}
              href={`tel:${PHONE.replace(/\s+/g, "")}`}
              onCopy={() => copy(PHONE, "phone")}
              copied={copied === "phone"}
            />
            <Row
              label="Instagram"
              value="@devilonthemic"
              href={INSTAGRAM_URL}
              external
              onCopy={() => copy(INSTAGRAM_URL, "ig")}
              copied={copied === "ig"}
            />
          </dl>

          {/* Booking is a different job from a general hello, so it gets its
              own door — the same split the DEV contact window uses. */}
          {onBook && (
            <button
              type="button"
              onClick={onBook}
              className={cn(styles.book, "group flex w-full items-center justify-between border-2 border-[#ff2244] bg-[#ff2244] text-left transition-colors hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]")}
            >
              <span className="min-w-0">
                <span className="block font-sans text-lg font-black uppercase tracking-[0.14em] text-white">
                  Book DOTM
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/75">
                  Shows · festivals · brand work · features
                </span>
              </span>
              <span
                aria-hidden="true"
                className="ml-4 shrink-0 font-sans text-2xl font-black text-white transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          )}

          {/* ── Newsletter ─────────────────────────────────────────── */}
          <div className={cn(styles.newsletter, "border border-white/15")}>
            <label
              htmlFor="dotm-newsletter"
              className="block font-mono text-[10px] uppercase tracking-[0.28em] text-white/55"
            >
              Newsletter
            </label>
            <p className="mt-1.5 font-body text-xs text-white/60">
              Drops, show dates and the occasional easter egg. No noise.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                id="dotm-newsletter"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                placeholder="you@example.com"
                disabled={state === "sending"}
                aria-invalid={state === "error" ? true : undefined}
                className="min-w-0 flex-1 border border-white/20 bg-black px-3 py-2.5 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-[#ff2244] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={subscribe}
                disabled={state === "sending" || !email.trim()}
                className={cn(
                  "shrink-0 px-5 py-2.5 font-sans text-sm font-black uppercase tracking-[0.16em] transition-colors disabled:opacity-40",
                  state === "done"
                    ? "bg-white text-black"
                    : "bg-[#ff2244] text-white hover:bg-white hover:text-black",
                )}
              >
                {state === "sending" ? "Sending" : state === "done" ? "Done" : "Join"}
              </button>
            </div>
            {message && (
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "mt-2 font-mono text-[11px] uppercase tracking-[0.16em]",
                  state === "error" ? "text-[#ff6b7a]" : "text-white/60",
                )}
              >
                {message}
              </p>
            )}
          </div>
        </div>

        {/* ── Photograph ─────────────────────────────────────────────
            The rotary phone, and the reason this column has no frame of its
            own: the card is #0a0a0b and so is most of the photograph's own
            ground, so a pair of gradients running off its edges lets the two
            meet with nothing to see.

            The fade runs from the LEFT on a wide card, where the picture sits
            beside the details, and from the TOP on a narrow one, where it sits
            under them — a left-edge fade on a stacked column would feather the
            wrong side entirely. */}
        <aside className={cn(styles.portrait, "relative overflow-hidden bg-[#0a0a0b]")}>
          <Image
            src="/images/dotm/contact-photo.jpg"
            alt="DOTM with a rotary telephone"
            fill
            sizes="(min-width: 768px) 42vw, 100vw"
            className="object-cover object-center"
          />

          {/* Side blend — wide layout. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                "linear-gradient(to right, #0a0a0b 0%, rgba(10,10,11,0.78) 12%, rgba(10,10,11,0.28) 30%, rgba(10,10,11,0) 52%)",
            }}
          />
          {/* Top blend — stacked layout. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 md:hidden"
            style={{
              background:
                "linear-gradient(to bottom, #0a0a0b 0%, rgba(10,10,11,0.7) 10%, rgba(10,10,11,0) 34%)",
            }}
          />
          {/* Foot blend, both layouts — also what the tile below sits on. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #0a0a0b 0%, rgba(10,10,11,0.55) 16%, rgba(10,10,11,0) 44%)",
            }}
          />

        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  href,
  external,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className={cn(styles.row, "flex items-center justify-between gap-2")}>
      <div className="min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
          {label}
        </dt>
        <dd className="mt-1 min-w-0">
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(styles.contactValue, "block font-mono text-white underline decoration-[#ff2244] decoration-2 underline-offset-4 hover:text-[#ff2244]")}
          >
            {value}
          </a>
        </dd>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="shrink-0 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 transition-colors hover:border-[#ff2244] hover:text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
