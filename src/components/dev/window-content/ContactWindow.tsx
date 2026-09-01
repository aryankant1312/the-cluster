"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type SubscribeStatus = "idle" | "loading" | "done";

function LoaderDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function ContactWindow({ onBook }: { onBook?: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSubscribe = () => {
    if (status !== "idle" || !email.trim()) return;
    setStatus("loading");
    const loadTimer = setTimeout(() => {
      setStatus("done");
      const resetTimer = setTimeout(() => {
        setStatus("idle");
        setEmail("");
      }, 1800);
      timersRef.current.push(resetTimer);
    }, 3500);
    timersRef.current.push(loadTimer);
  };

  return (
    // Landscape: the details on the left, the two things a visitor can
    // actually do on the right. Stacked in a 480px window the Subscribe box
    // sat below the fold, and that was the half nobody saw.
    // Both halves stretch to the window's full height now, rather than sitting
    // as two short blocks in a tall frame: the details space themselves down
    // the left, and the booking door plus the newsletter share the right.
    //
    // THE GRID BLEEDS PAST THE WINDOW'S PADDING. `DevWindow` wraps its content
    // in `p-3`, which is right for a form and wrong for a photograph — inset by
    // twelve pixels the picture reads as an image pasted into a panel rather
    // than as the panel itself. The negative margin cancels that padding and
    // the two `calc` sizes hand the width and height back, so the grid fills
    // the window's padding box exactly and neither axis can overflow into a
    // scrollbar. Each column carries its own padding instead, and the gap goes
    // with it: the seam between dark and light IS the divider now.
    // Reading surface. See `.long-text` in globals.css.
    <div className="long-text -m-3 grid h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] grid-cols-1 md:grid-cols-2">
      {/*
        THE LEFT HALF IS THE PHOTOGRAPH, and every colour in it is taken from
        the photograph rather than from the persona's light-blue window.

        The picture is near-black and faintly warm — its median pixel is
        #130d0d and its highlights land around #bab3b2 — so the grade over it is
        that same warm near-black, the rule under the heading is that highlight,
        and the type is white rather than the black it is everywhere else in
        this window. Navy on this would be invisible; black on it would be gone.

        `object-position` is pulled above centre: the frame is square, this
        column is a wide letterbox, and a centred crop takes a band across the
        hands. Thirty-two percent down keeps both faces — the painted one and
        the real one — inside the crop at every window size.
      */}
      <section className="relative flex min-w-0 flex-col overflow-hidden p-6 md:p-8">
        <Image
          src="/images/dev/contact-photo.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(min-width: 768px) 38vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "50% 32%" }}
        />

        {/* The grade. Heaviest where the type starts and lightest at the far
            edge, so the picture stays legible where nothing is written over it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(8,5,5,0.90) 0%, rgba(12,8,8,0.76) 46%, rgba(22,16,16,0.52) 100%)",
          }}
        />
        {/* And a shade along the seam, so the panel reads as recessed into the
            window rather than as a rectangle laid on top of it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            boxShadow:
              "inset -14px 0 26px -18px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(186,179,178,0.10)",
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Bigger, but lighter. At bold it competed with the values beneath
              it for the same job — this names the column, it is not the content
              of it, and size alone says that clearly enough. */}
          <h3 className="shrink-0 font-chrome text-lg font-normal tracking-[0.2em] text-white sm:text-xl">
            GET IN TOUCH
          </h3>
          {/* The photograph's own highlight, not the persona's navy. */}
          <div aria-hidden="true" className="mt-2 h-[3px] w-14 shrink-0 bg-[#bab3b2]" />

          {/* `justify-around` in a full-height column, so the rows use the
              space the window actually has instead of bunching at the top and
              leaving two thirds of the panel empty. */}
          <dl className="flex min-h-0 flex-1 flex-col justify-around py-2">
            <ContactRow
              label="MAIL"
              value="dotmoriginal@gmail.com"
              href="mailto:dotmoriginal@gmail.com"
            />
            <ContactRow label="PHONE" value="+91 9667374331" href="tel:+919667374331" />
            {/* Instagram used to sit here as a third row. It is a place to
                follow rather than a way to reach anyone, and this column is the
                second one — the Live Stats window already carries the Instagram
                link next to the figure that gives it a reason to exist. */}
          </dl>
        </div>
      </section>

      {/* No dividing rule any more: the dark panel's own edge is the divider,
          and a hairline beside it would only draw a second one. */}
      <section className="flex min-w-0 flex-col gap-5 p-6 md:p-8">
        {/* Booking is a different job from a general hello, so it gets its own
            door rather than being buried in a free-text message. It takes the
            larger share of the column — a thin bar floating in a tall empty
            panel read as an afterthought rather than the primary action. */}
        {onBook && (
          <button
            type="button"
            onClick={onBook}
            // `flex-[1.6]`, up from 1.15: the door takes appreciably more of
            // the column than the newsletter below it, which is the order of
            // importance the two actually have.
            className="win98-border win98-press flex min-h-0 w-full flex-[1.6] flex-col items-center justify-center gap-2 bg-persona-surface px-4 font-chrome text-black hover:bg-persona-surface-alt active:translate-y-px"
          >
            <span className="text-2xl font-black tracking-[0.16em] sm:text-3xl">
              BOOK DOTM →
            </span>
            {/* Raised with it. Left at 11px under type this size it stopped
                reading as the button's own subtitle and started reading as
                fine print underneath it. */}
            <span className="text-[13px] tracking-wide text-black/60 sm:text-sm">
              Shows · festivals · brand work · features
            </span>
          </button>
        )}

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 border-t border-black/20 pt-5">
          <div>
            {/* Bold type in this pixel face closes its own counters up at small
                sizes, so the letters run together. Tracking them apart is what
                lets the weight read as emphasis instead of as a smudge. */}
            <p className="font-chrome text-sm font-bold tracking-[0.12em] text-black">
              Subscribe to DOTM&apos;s newsletter
            </p>
            <p className="mt-1 font-body text-xs text-black/55">
              Drops, show dates and the occasional easter egg.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mymail@example.com"
              disabled={status !== "idle"}
              autoComplete="email"
              className="win98-border bg-white flex-1 min-w-0 px-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={status !== "idle" || !email.trim()}
              className={cn(
                // Unbolded. Pixelpurl ships a single weight, so `font-bold`
                // here was the browser synthesising a heavier face by smearing
                // the strokes sideways — which on a bitmap letterform closes
                // its counters and reads as a blur rather than as emphasis.
                // The heading above keeps its bold because it is a heading; a
                // button label is not.
                "win98-border win98-press shrink-0 w-28 px-2 py-2.5 text-sm font-chrome flex items-center justify-center gap-1.5 transition-colors",
                status === "done"
                  ? "bg-green-600 text-white"
                  : "bg-persona-surface text-black disabled:opacity-50",
              )}
            >
              {status === "loading" && <LoaderDots />}
              {status === "done" && "Done!"}
              {status === "idle" && "Subscribe"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    // Label above value rather than beside it. Inline, the longest value —
    // the email — pushed past the column and truncated; stacked, each value
    // gets the full width and can be set at a size worth reading.
    <div className="min-w-0">
      {/* `uppercase` does the casing here, so a caller passing "Mail" and one
          passing "MAIL" render identically and the row cannot drift. */}
      {/* White, not navy. This row now sits on a near-black photograph rather
          than on the window's light blue, and #0a2f5c on that is a hair over
          1:1 — legible nowhere. 60% white lands around 8:1 against the graded
          plate, which leaves the label plainly secondary to the value without
          dropping it out of sight. */}
      <dt className="font-chrome text-[11px] font-normal uppercase tracking-[0.24em] text-white/60">
        {label}
      </dt>
      <dd className="mt-1 min-w-0">
        {/* Up a step in size and down to normal weight. Two rows of bold at
            this size read as shouting, and with only two rows left there is
            room to set them larger without the column running long.
            The underline takes the photograph's own highlight; hovering warms
            it rather than colouring it, which is all the picture will carry. */}
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="block truncate font-chrome text-xl font-normal tracking-tight text-white underline decoration-[#bab3b2] decoration-2 underline-offset-[5px] transition-colors hover:text-[#e8dfd9] hover:decoration-white sm:text-2xl"
        >
          {value}
        </a>
      </dd>
    </div>
  );
}
