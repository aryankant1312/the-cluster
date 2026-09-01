"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  "devilonthemic — DOTM, Devil on the Mic — is a Delhi hip-hop artist, rapper and songwriter who broke wider after MTV Hustle Season 4 in 2024. The debut EP 666 — The Beginning carried “D.O.T.M” and “Thak Thak”; the singles “Bhala Kyun” and “Paranoid” carried the rest.";

const EMAIL = "dotmoriginal@gmail.com";
const PHONE = "+91 9667374331";
const INSTAGRAM_URL = "https://www.instagram.com/devilonthemic/";

type SubscribeState = "idle" | "sending" | "done" | "error";

export function ContactCard({ onBook }: { onBook?: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubscribeState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
    if (state === "sending" || !email.trim()) return;
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
    <div className="h-full w-full overflow-y-auto bg-[#0a0a0b] text-white">
      {/* Landscape: the poster, the details and the portrait sit side by
          side. Stacked in one column the card became a scroll — and a
          contact card you have to scroll is a form again, which is the one
          thing the poster treatment exists to avoid. */}
      {/* The photograph is the widest column now, not the narrowest. It was
          `1.05 / 1 / 0.7` — a portrait squeezed into the offcut of a layout
          built around type. The poster column gives up the most, because a
          headline set in `clamp()` shrinks gracefully and a face does not. */}
      <div className="grid min-h-full grid-cols-1 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(380px,1.4fr)]">
        {/* ── Type side ──────────────────────────────────────────────── */}
        {/* No rule against the details column either. The two of them are one
            block of type read left to right, and a hairline between them cut
            it in half — the same argument that already keeps a border off the
            photograph's edge, applied one column earlier. The stacked rule
            below stays: there the columns really are separate rows. */}
        <div className="min-w-0 border-b border-white/10 p-7 md:border-b-0 md:p-8">
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
            className="mt-5 font-sans text-[clamp(2rem,4vw,3.6rem)] font-black uppercase leading-[0.84] tracking-[-0.03em]"
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

          <div aria-hidden="true" className="mt-5 h-[3px] w-full bg-[#ff2244]" />

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">
            Rapper · Producer · Composer · Delhi, IN
          </p>

          {/* Reading surface. See `.long-text` in globals.css. */}
          <p className="long-text mt-6 max-w-prose font-body text-[15px] leading-relaxed text-white/70">
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
        <div className="flex min-w-0 flex-col justify-center border-b border-white/10 p-7 md:border-b-0 md:p-8">
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
              className="group mt-5 flex w-full items-center justify-between border-2 border-[#ff2244] bg-[#ff2244] px-5 py-3 text-left transition-colors hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]"
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
          <div className="mt-5 border border-white/15 p-4">
            <label
              htmlFor="dotm-newsletter"
              className="block font-mono text-[10px] uppercase tracking-[0.28em] text-white/55"
            >
              Newsletter
            </label>
            <p className="mt-1.5 font-body text-xs text-white/60">
              Drops, show dates and the occasional easter egg. No noise.
            </p>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
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
        <aside className="relative min-h-[280px] overflow-hidden bg-[#0a0a0b]">
          <Image
            src="/images/dotm/contact-photo.jpg"
            alt="DOTM with a rotary telephone"
            fill
            sizes="(min-width: 768px) 46vw, 100vw"
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

          {/*
            The scan tile, shrunk and turned to glass.

            It used to run the full width of the column with a 64px code in it,
            which laid an opaque black slab across the bottom third of the
            photograph. It is an `inline-flex` sized to its own contents now, so
            it takes only the corner — and it is glass rather than paint:
            `backdrop-blur` with a saturate, a lit top edge and a soft drop, so
            the picture stays legible *through* it instead of being covered.

            `saturate` on top of the blur is what separates glass from frosted
            plastic — it keeps the warm browns behind the tile alive rather than
            washing them grey.

            The code itself keeps its white plate. A QR is read by a camera, not
            by a person, and a transparent one over a photograph does not scan.
          */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/25 p-2 transition-[border-color] hover:border-[#ff2244] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                background:
                  "linear-gradient(140deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(16px) saturate(160%)",
                WebkitBackdropFilter: "blur(16px) saturate(160%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.4), 0 10px 26px -12px rgba(0,0,0,0.85)",
              }}
            >
              <Image
                src="/images/dotm/instagram-qr.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-md bg-white p-0.5"
              />
              <span className="min-w-0 pr-1">
                <span className="block font-mono text-[8px] uppercase tracking-[0.24em] text-white/65">
                  Scan
                </span>
                <span className="block truncate font-sans text-[13px] font-bold uppercase tracking-wide text-white">
                  @devilonthemic
                </span>
              </span>
            </a>
          </div>
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
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
          {label}
        </dt>
        <dd className="mt-1 min-w-0">
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="block truncate font-mono text-[15px] text-white underline decoration-[#ff2244] decoration-2 underline-offset-4 hover:text-[#ff2244]"
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
