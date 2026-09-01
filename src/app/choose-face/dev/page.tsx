"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DotmDailyLogo } from "@/components/dev/DotmDailyLogo";
import { SignInIcon } from "@/components/auth/SignInIcon";
import { useAuth, useAuthScope } from "@/components/providers/AuthProvider";
import { Blink, DEV_BLINK_MS } from "@/components/shared/Blink";

/**
 * DEV boot sequence (retro-98 inspired):
 *
 *   bios  — black BIOS/spec screen; the header lands, then the body types
 *           itself out on a terminal cadence
 *   blink — a first-person blink: lids close over the sheet, open on the login
 *   login — XP-style password prompt; dots auto-type, waits for Confirm
 *
 * THERE WAS A FOURTH BEAT, AND IT IS GONE. `bounce` held the DOTM mark over a
 * crowd shot with its 666 coin bouncing twice, between the sheet and the
 * blink. It was removed on request: it sat between a visitor and the way in,
 * and every second of it was a second spent watching rather than arriving.
 * The blink is kept because it is the handover itself rather than a screen —
 * the lids now close on the spec sheet instead of on the mark.
 *
 * `BouncingCoinLogo` and `/images/dev/boot-crowd.jpg` are left on disk,
 * unreferenced. Reinstating the beat is a phase member and this block again.
 *
 * Then → /dev.
 *
 * TYPE SCALE. The header and the spec sheet used to be a 36/24 pair, which in
 * VT323 — a pixel face with a small x-height for its em — read as roughly
 * double, not one and a half. The sheet looked like a footnote under a
 * banner. The whole screen is now one tight scale (1 : 0.8 : 0.78), so the
 * heading still leads without the body shrinking away from it.
 *
 * THE BODY TYPES. Revealing whole lines at a stroke is a slideshow; a BIOS
 * post writes itself a character at a time, and that is what the screen is
 * pretending to be. One rAF-driven clock walks a character index across every
 * line, so a dropped frame or a throttled tab changes the pace and never
 * where the text ends up.
 */

/** Info rows for the BIOS screen — the "content" of the boot spec sheet. */
const SPEC_ROWS: Array<[string, string]> = [
  ["File", "DOTM"],
  ["Built with", "Mehnat"],
  ["", ""],
  ["Specialist", "Composer / Lyricist / rapper / Producer"],
  ["Years of Experience", "3"],
  ["Music", "Melodic, Classical, Phonk, Trap, New-school"],
  ["Languages", "Hindi, English"],
];

/** Runs of the footer lines, so a keycap can be bold mid-sentence. */
const FOOTER_LINES: Array<Array<{ text: string; strong?: boolean }>> = [
  [{ text: "Press " }, { text: "F", strong: true }, { text: " to pay respects" }],
  [{ text: "Press " }, { text: "Enter", strong: true }, { text: " to load the website" }],
];

/** Milliseconds per character. ~14ms reads as a fast, confident terminal. */
const MS_PER_CHAR = 14;

/**
 * How often the typewriter samples the clock. Two frames' worth: fast enough
 * that the text arrives in ones and twos rather than in visible chunks, slow
 * enough not to re-render the sheet sixty times a second for it.
 */
const TICK_MS = 32;

/** Beat before the first character, after the header has landed. */
const TYPING_LEAD_IN_MS = 420;

/** How long the sheet sits complete before the lids close over it. */
const HOLD_AFTER_TYPING_MS = 1500;

const PASSWORD_LENGTH = 7;

/**
 * Lids shut and open again. Shared by the animation and its backstop.
 *
 * Lives with the component now — DOTM's doors blink too, and three call sites
 * agreeing on one implementation is what stops them drifting apart.
 */
const BLINK_MS = DEV_BLINK_MS;

interface Keystroke {
  /** +1 types a character, -1 backspaces one. */
  delta: 1 | -1;
  /** Wait before this stroke lands, in ms. */
  delay: number;
}

/**
 * A password being typed by a person rather than by an interval timer:
 * strokes arrive in quick bursts broken by hesitations, and one character too
 * many gets typed near the end and immediately backspaced.
 */
function humanKeystrokes(length: number): Keystroke[] {
  const strokes: Keystroke[] = [];
  const fumbleAt = Math.max(1, Math.floor(length * 0.7));

  for (let i = 0; i < length; i++) {
    const burst = Math.random() < 0.45;
    strokes.push({
      delta: 1,
      delay: burst ? 55 + Math.random() * 45 : 115 + Math.random() * 135,
    });
    if (i === fumbleAt) {
      strokes.push({ delta: 1, delay: 65 + Math.random() * 55 });
      strokes.push({ delta: -1, delay: 250 + Math.random() * 220 });
    }
  }
  return strokes;
}

function PersonGlyph() {
  return (
    <svg viewBox="0 0 64 64" width={88} height={88} aria-hidden="true">
      <circle cx="32" cy="20" r="12" fill="#3f7fd6" />
      <path d="M10 60c0-13 10-22 22-22s22 9 22 22z" fill="#3f7fd6" />
      <path d="M32 38l-8 22h16z" fill="#2b5ea8" />
    </svg>
  );
}

/* ── The typed body ─────────────────────────────────────────────────────── */

type BodyLine =
  | { kind: "row"; label: string; value: string; length: number }
  | { kind: "spacer"; length: 0 }
  | { kind: "note"; runs: Array<{ text: string; strong?: boolean }>; length: number };

/**
 * Every line of the body in one flat list, each carrying how many characters
 * it contributes. The typewriter then only has to know a running total, and
 * the cursor walks straight out of the spec sheet into the footer the way a
 * real post does.
 */
const BODY_LINES: BodyLine[] = [
  ...SPEC_ROWS.map(([label, value]): BodyLine => {
    if (!label) return { kind: "spacer", length: 0 };
    // +1 for the colon that prefixes every value.
    return { kind: "row", label, value, length: label.length + 1 + value.length };
  }),
  ...FOOTER_LINES.map((runs): BodyLine => ({
    kind: "note",
    runs,
    length: runs.reduce((n, r) => n + r.text.length, 0),
  })),
];

const BODY_CHARS = BODY_LINES.reduce((n, line) => n + line.length, 0);

/** Index of the first footer line, which is where the gap above it goes. */
const FIRST_FOOTER = BODY_LINES.length - FOOTER_LINES.length;

/** Character offset at which each line starts. */
const LINE_STARTS = BODY_LINES.reduce<number[]>((acc, _line, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + BODY_LINES[i - 1].length);
  return acc;
}, []);

/** How much of `text` is visible, given a cursor `consumed` characters into it. */
function slice(text: string, consumed: number): string {
  if (consumed <= 0) return "";
  if (consumed >= text.length) return text;
  return text.slice(0, consumed);
}

export default function DevBootPage() {
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const [phase, setPhase] = useState<"bios" | "blink" | "login">("bios");
  const [typed, setTyped] = useState(0);
  const [password, setPassword] = useState("");
  const doneRef = useRef(false);

  const { user } = useAuth();
  // This screen is the DEV door. Tell the auth provider so, or it has
  // no way of knowing which of the two sessions to read.
  useAuthScope("dev");

  // Read by `finish`, which runs from timers and handlers that would otherwise
  // close over whatever `user` was when they were created. Synced in an effect
  // rather than during render: a ref written while rendering is a side effect
  // in a function React may call twice and discard, and `finish` only ever
  // runs from a timer or a click — both long after the commit.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * THE SESSION IS THE WHOLE GATE NOW.
   *
   * There used to be a second condition beside it: a module-scope flag, reset
   * by every document load, answering "has somebody come through this door
   * during *this* page load". A valid thirty-day session was not enough on its
   * own — a hard reload cleared the flag, so a signed-in visitor arriving here
   * found Confirm greyed out and the key nudging at them, and the only way on
   * was another trip to Google. Every reload bought exactly one more round
   * trip, which is the loop this door was reported for.
   *
   * So it is gone, and `user` decides alone. A session already resolved
   * against the database is proof enough; asking again proved nothing the
   * cookie had not already proved.
   */

  /**
   * Reduced motion is honoured by *deriving* the finished state rather than by
   * writing it into state. Both of these are the end of an animation that was
   * never allowed to run; there is nothing to remember about that, so there is
   * nothing to store — and storing it would mean a render whose only job is to
   * catch up with something already known.
   */
  const shownChars = reduced ? BODY_CHARS : typed;
  const shownPassword = reduced ? "•".repeat(PASSWORD_LENGTH) : password;

  /**
   * The way in, now conditional.
   *
   * The XP password screen was always theatre: seven dots type themselves and
   * Confirm let anybody through. It is the same screen, and it is real now —
   * this refuses to advance without a session, and the key that opens one is
   * the tile in the corner.
   *
   * Keeping the costume rather than swapping in a login form was the point.
   * This sequence has spent its whole runtime pretending to be a machine
   * booting, and the screen that was already pretending to ask who you are is
   * the obvious place to actually ask.
   *
   * `userRef` rather than `user`: this is called from a timer and from a click
   * handler, and reading the ref means neither can act on a stale answer
   * captured when the callback was made.
   */
  const finish = useCallback(() => {
    if (doneRef.current) return;
    if (!userRef.current) return;
    doneRef.current = true;
    window.sessionStorage.setItem("dev-welcome", "1");
    router.push("/dev");
  }, [router]);

  /**
   * Signed in, so press Confirm for them.
   *
   * The visitor has already done the work — in the panel, or at the other
   * persona's door, or on a previous visit — and a button that lights up and
   * then waits to be pressed is a toll booth. The beat is there so the change
   * is legible: the control visibly comes alive, and *then* the screen moves.
   *
   * It also covers the case where somebody arrives at this screen with a
   * session already: the boot runs its full sequence and lets itself in at the
   * end, rather than skipping to the desktop and throwing the whole thing
   * away.
   */
  useEffect(() => {
    if (phase !== "login" || !user) return;
    const timer = setTimeout(finish, 600);
    return () => clearTimeout(timer);
  }, [phase, user, finish]);

  /** The typewriter, plus the hold that hands over to the mark. */
  useEffect(() => {
    if (phase !== "bios") return;

    // Reduced motion: the sheet is already complete on screen, so all that is
    // left is the beat before the mark.
    if (reduced) {
      const hold = setTimeout(() => setPhase("blink"), HOLD_AFTER_TYPING_MS);
      return () => clearTimeout(hold);
    }

    let hold: ReturnType<typeof setTimeout>;
    const start = Date.now();

    /**
     * Characters are a function of elapsed wall-clock time, sampled on a
     * timer — not accumulated per tick, and not driven by rAF.
     *
     * Reading elapsed time means a delayed or coalesced tick catches up in
     * one step instead of the sentence finishing late, so a busy main thread
     * changes the smoothness and never the timing. A timer rather than rAF
     * because this needs to run wherever the page is mounted; rAF is
     * suspended outright in a backgrounded or non-compositing context, and a
     * BIOS post that silently never types is worse than one that types a
     * little coarsely.
     */
    const id = setInterval(() => {
      const elapsed = Date.now() - start - TYPING_LEAD_IN_MS;
      const chars = Math.max(0, Math.min(BODY_CHARS, Math.floor(elapsed / MS_PER_CHAR)));
      setTyped(chars);
      if (chars >= BODY_CHARS) {
        clearInterval(id);
        hold = setTimeout(() => setPhase("blink"), HOLD_AFTER_TYPING_MS);
      }
    }, TICK_MS);

    return () => {
      clearInterval(id);
      clearTimeout(hold);
    };
  }, [phase, reduced]);

  /**
   * Timer backstop for the animation-driven handover.
   *
   * The blink advances on its lid animation finishing, which is driven by
   * requestAnimationFrame — which browsers suspend outright in a backgrounded
   * tab. A visitor who switched away for four seconds mid-boot came back to a
   * beat that would never end and a site they could not reach.
   *
   * So the animation reports in, and a timer set to the same duration reports
   * in too; whichever arrives first moves the phase on, and the second is a
   * no-op because `setPhase` to the value already held changes nothing. The
   * animation stays the thing that looks right, and the clock guarantees the
   * boot always ends.
   *
   * There were two of these. The bounce carried one for the same reason, and
   * it went with the beat — see the note on the phase union above.
   */
  useEffect(() => {
    if (phase === "blink") {
      const t = setTimeout(() => setPhase("login"), BLINK_MS + 250);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Enter skips the rest of the sheet and goes straight on.
  useEffect(() => {
    if (phase !== "bios") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") setPhase("blink");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  /**
   * Login: the password types itself on a human cadence, then waits for the
   * user to Confirm.
   *
   * Keyed on "are we at or past the login" rather than on `phase` itself, so
   * the blink handing over from "blink" to "login" does not restart the
   * typing halfway through.
   */
  const loginVisible = phase === "blink" || phase === "login";

  useEffect(() => {
    // Reduced motion: the field already shows a full password.
    if (!loginVisible || reduced) return;

    const strokes = humanKeystrokes(PASSWORD_LENGTH);
    let count = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = (i: number) => {
      if (cancelled || i >= strokes.length) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        count += strokes[i].delta;
        setPassword("•".repeat(count));
        step(i + 1);
      }, strokes[i].delay);
    };

    // Long enough that the first keystroke lands as the eye finishes opening.
    timer = setTimeout(() => step(0), 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loginVisible, reduced]);

  return (
    <main className="boot-dev-fonts relative min-h-screen overflow-hidden bg-black font-body">
      <AnimatePresence mode="wait">
        {phase === "bios" && (
          <motion.div
            key="bios"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            /* A flex column, not a free-floating block with an absolutely
               positioned footer. The footer was pinned to `bottom-10` while
               the spec sheet grew downward from the top, so on any viewport
               shorter than roughly 900px the two collided and the parent's
               `overflow-hidden` silently cut the sheet off. In a column the
               sheet takes whatever room is left and scrolls only if it truly
               cannot fit. */
            className="absolute inset-0 flex flex-col px-8 py-6 text-[#dcdcdc] sm:px-12 sm:py-7"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <PersonGlyph />
                <div className="pt-1 leading-snug">
                  <p className="text-[1.7rem] font-medium text-white sm:text-[2.15rem] md:text-[2.5rem]">
                    Welcome to the cluster
                  </p>
                  <p className="text-[1.35rem] sm:text-[1.7rem] md:text-[2rem]">
                    For a better experience use the desktop version
                  </p>
                </div>
              </div>
              <div className="w-28 shrink-0 sm:w-40">
                <DotmDailyLogo />
              </div>
            </div>

            {/* The sheet and the footer are one typed block. Labels stay
                dimmed and values white, so the two columns separate at a
                glance instead of reading as one grey run of text.

                NO SCROLLBAR, EVER. This screen is a title card and a title
                card does not scroll — a bar down its right edge announced the
                sheet as a document with more below it, which is not what it
                is. The room the bar was compensating for is taken back from
                the gap above: `mt-8 sm:mt-10` under the header was a full
                blank line between "For a better experience" and "File: DOTM",
                which is far more air than a BIOS post has. Pulling the body up
                to the header fits the whole sheet in frame on its own, and
                `overflow-hidden` is the backstop for a viewport short enough
                that it still cannot. */}
            <div className="mt-3 min-h-0 max-w-5xl flex-1 overflow-hidden text-[1.3rem] leading-relaxed sm:mt-4 sm:text-[1.65rem] md:text-[1.95rem]">
              {BODY_LINES.map((line, i) => {
                const consumed = shownChars - LINE_STARTS[i];
                const done = consumed >= line.length;
                // The caret rides whichever line is currently being written.
                const active = consumed > 0 && !done;

                if (line.kind === "spacer") return <div key={i} className="h-6" />;

                if (line.kind === "row") {
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,12rem)_1fr] sm:grid-cols-[minmax(0,22rem)_1fr]"
                    >
                      <span className="text-[#9a9a9a]">{slice(line.label, consumed)}</span>
                      <span className="font-medium text-white">
                        {slice(`:${line.value}`, consumed - line.label.length)}
                        {active && <Caret />}
                      </span>
                    </div>
                  );
                }

                let taken = 0;
                return (
                  <p key={i} className={i === FIRST_FOOTER ? "mt-4" : undefined}>
                    {line.runs.map((run, r) => {
                      const text = slice(run.text, consumed - taken);
                      taken += run.text.length;
                      return run.strong ? (
                        <span key={r} className="font-semibold text-white">
                          {text}
                        </span>
                      ) : (
                        <span key={r}>{text}</span>
                      );
                    })}
                    {active && <Caret />}
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Login ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {loginVisible && (
          <motion.div
            key="login"
            initial={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6"
            style={{
              background: "linear-gradient(180deg, #245edb 0%, #3f8cf3 45%, #4db6e8 100%)",
            }}
          >
            {/* The key, top right.
                Mounted with the login screen rather than on a timer of its
                own: `loginVisible` turns true as the eyelids start to open, so
                the tile is already in place by the time there is anything to
                see. Its nudge is what waits — long enough for the dots to
                finish typing themselves, so the two do not compete. */}
            {phase === "login" && !user && (
              <SignInIcon skin="dev" onSignedIn={finish} nudgeDelayMs={1800} />
            )}

            {/* A shallow focus pull as the eye opens: what you are looking at
                settles into place rather than simply being there. */}
            <motion.div
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative h-40 w-40 border-2 border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
                <Image
                  src="/images/dev/login-user.png"
                  alt="User"
                  fill
                  priority
                  className="object-cover"
                  sizes="160px"
                />
              </div>

              <div className="flex flex-col items-start gap-2">
                <p className="font-chrome text-lg tracking-wide text-white drop-shadow">
                  Enter Password
                </p>
                <div className="flex items-stretch">
                  {/* The dots are drawn, not typed. A bullet in VT323 is a
                      small square-ish speck; these are real circles at a size
                      that reads as a masked character rather than as dirt on
                      the screen — and each one springs in as it lands. */}
                  <div className="flex w-72 items-center gap-2.5 border border-[#7f9db9] bg-white px-3 py-2.5">
                    {Array.from({ length: shownPassword.length }).map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 620, damping: 24 }}
                        className="block h-3 w-3 shrink-0 rounded-full bg-black"
                      />
                    ))}
                    <span className="caret-blink block h-5 w-[3px] shrink-0 bg-black" />
                  </div>
                  {/* Inert until there is a session behind it. Disabled
                      rather than hidden: the button is part of the screen's
                      costume and removing it would leave a gap where the
                      visitor is looking, while a greyed control is exactly
                      what this era did to say "not yet". */}
                  <button
                    type="button"
                    onClick={finish}
                    disabled={!user}
                    title={user ? "Confirm" : "Sign in first — the key is top right"}
                    className="win98-border win98-press bg-persona-surface px-4 font-chrome text-base text-black active:translate-y-px disabled:cursor-not-allowed disabled:text-black/35 disabled:active:translate-y-0"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The blink ─────────────────────────────────────────────────────
          Point of view: two lids sweep shut over the coin and open on the
          login. They sit above everything, so what is underneath can swap
          while the eye is closed — which is the whole reason a blink works as
          a cut. */}
      <AnimatePresence>
        {phase === "blink" && (
          <Blink
            mode="full"
            durationMs={BLINK_MS}
            onDone={() => setPhase("login")}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Caret() {
  return (
    <span className="caret-blink ml-0.5 inline-block h-[0.9em] w-[0.5em] translate-y-[0.08em] bg-[#dcdcdc] align-baseline" />
  );
}
