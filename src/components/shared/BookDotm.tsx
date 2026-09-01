"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { ENQUIRY_LABELS, ENQUIRY_TYPES, type EnquiryType } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/**
 * BOOK DOTM — a two-step enquiry flow rather than a generic contact box.
 *
 * Step one asks the only question that changes everything downstream (what
 * are you actually after?), which lets step two ask for the details that
 * enquiry type genuinely needs and skip the rest. Promoters, brands and
 * journalists all land here, and none of them should have to read past
 * fields meant for someone else.
 */

const AUDIENCE_OPTIONS = ["Under 500", "500 – 2,000", "2,000 – 5,000", "5,000 – 20,000", "20,000+"];
const BUDGET_OPTIONS = [
  "Under ₹50k",
  "₹50k – ₹1L",
  "₹1L – ₹3L",
  "₹3L – ₹10L",
  "₹10L+",
  "Prefer to discuss",
];

/**
 * One line under each enquiry type, so the choice is made from what the work
 * actually is rather than from guessing what a two-word label covers. This is
 * the first question asked and it decides every field that follows, which
 * makes it the worst possible place to leave someone unsure.
 */
const ENQUIRY_HINTS: Record<EnquiryType, string> = {
  live_show: "A club night, college fest or venue date",
  festival: "A multi-artist lineup or ticketed festival",
  brand_collab: "Campaign, endorsement or branded content",
  private_event: "Wedding, corporate, or a closed guest list",
  feature: "A verse, a hook, or production on your track",
  interview: "Press, podcast, radio or documentary",
  other: "Anything that doesn't fit the boxes above",
};

/** Persistent helper copy per field — not placeholder-only. */
const FIELD_HINTS = {
  city: "Where it's happening. Nearest big city is fine.",
  event_date: "Leave blank if it's flexible — that's often better.",
  event_type: "Club night, college fest, launch party…",
  expected_audience: "A rough headcount is plenty at this stage.",
  budget_range: "A bracket, not a final number. It sets the scope.",
  contact_name: "Who the reply should be addressed to.",
  contact_email: "The reply lands here — worth double-checking.",
  contact_phone: "Optional, but it speeds things up a lot.",
  message: "Lineup, venue size, the vibe, deadlines — anything that helps.",
} as const;

type DetailField = "city" | "date" | "eventType" | "audience" | "budget";

/** Which detail fields actually matter for each enquiry type. */
const FIELDS_FOR: Record<EnquiryType, ReadonlyArray<DetailField>> = {
  live_show: ["city", "date", "eventType", "audience", "budget"],
  festival: ["city", "date", "audience", "budget"],
  brand_collab: ["city", "date", "budget"],
  private_event: ["city", "date", "audience", "budget"],
  feature: ["budget"],
  interview: ["city", "date"],
  other: ["city", "date", "budget"],
};

interface Values {
  city: string;
  event_date: string;
  event_type: string;
  expected_audience: string;
  budget_range: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  message: string;
}

const EMPTY: Values = {
  city: "",
  event_date: "",
  event_type: "",
  expected_audience: "",
  budget_range: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  message: "",
};

export function BookDotm() {
  const { persona } = usePersona();
  const isDotm = persona === "dotm";
  const wm = useWindowManager();

  /**
   * Back to Contact, from every step.
   *
   * Booking is opened *from* the contact window, and until now the only way
   * back was to close this window and find that one again — a dead end at the
   * exact moment someone decides they would rather just send an email. It goes
   * to Contact rather than one step back on purpose: step one has no previous
   * step, and step two already carries its own "change what you're asking for"
   * control. One button that always means the same thing beats one that means
   * two different things depending on where you are.
   */
  const backToContact = () => {
    wm.closeWindow("book");
    wm.openWindow("contact");
  };

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [enquiry, setEnquiry] = useState<EnquiryType | null>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const set = (key: keyof Values, v: string) => setValues((p) => ({ ...p, [key]: v }));
  const shows = (f: DetailField) => enquiry !== null && FIELDS_FOR[enquiry].includes(f);

  const submit = async () => {
    setSending(true);
    setErrors({});
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, enquiry_type: enquiry }),
      });
      const data = (await res.json()) as
        | { ok: true; id: string }
        | { ok: false; errors: Record<string, string> };

      if (data.ok) {
        setReference(data.id);
        setStep(2);
      } else {
        setErrors(data.errors);
      }
    } catch {
      setErrors({ form: "Couldn't reach the server. Try again in a moment." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        // Reading surface: a form. See `.long-text` in globals.css.
        "long-text flex h-full w-full flex-col overflow-hidden",
        isDotm ? "bg-[#0b0b0c] text-white" : "bg-persona-window-bg text-black",
      )}
    >
      {/* `relative`, so the back button can sit in the top-left corner without
          pushing the centred title off centre — which is what putting it in the
          flow would do. */}
      <header className="relative shrink-0 px-5 pt-5 pb-3 text-center">
        <button
          type="button"
          onClick={backToContact}
          className={cn(
            "absolute left-5 top-5 inline-flex items-center gap-1.5 font-chrome uppercase tracking-[0.14em]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isDotm
              ? "rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:border-white/40 hover:text-white focus-visible:ring-white focus-visible:ring-offset-[#0b0b0c]"
              : "win98-border win98-press bg-persona-surface px-2.5 py-1 text-[11px] text-black hover:bg-persona-surface-alt focus-visible:ring-[#0a2f5c] focus-visible:ring-offset-persona-window-bg",
          )}
        >
          <span aria-hidden="true">←</span>
          Contact
        </button>

        <h2
          className={cn(
            "font-chrome uppercase tracking-[0.2em]",
            isDotm ? "text-2xl" : "text-xl",
          )}
        >
          Book <span className={isDotm ? "text-[#ff0033]" : undefined}>DOTM</span>
        </h2>
        <Steps step={step} isDotm={isDotm} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {/* The window is landscape now, so the content gets a measure rather
            than stretching every field to the full width. */}
        <div className="mx-auto w-full max-w-5xl">
        <AnimatePresence mode="popLayout">
          {step === 0 && (
            <motion.div
              key="what"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              <Legend isDotm={isDotm}>What are you looking for?</Legend>
              <p
                className={cn(
                  "mt-2 font-body text-sm",
                  isDotm ? "text-white/50" : "text-black/55",
                )}
              >
                Pick the closest one — it decides which questions you get asked
                next, so you only fill in what actually applies.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ENQUIRY_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setEnquiry(type);
                      setStep(1);
                    }}
                    className={cn(
                      "group px-4 py-3 text-left transition",
                      isDotm
                        ? "rounded-lg bg-white/5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-[#ff0033]"
                        : "win98-border win98-press bg-persona-surface hover:bg-persona-surface-alt",
                    )}
                  >
                    <span
                      className={cn(
                        "block font-body text-sm font-semibold",
                        isDotm && "group-hover:text-[#ff4d6a]",
                      )}
                    >
                      {ENQUIRY_LABELS[type]}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block font-body text-xs leading-snug",
                        isDotm ? "text-white/45" : "text-black/55",
                      )}
                    >
                      {ENQUIRY_HINTS[type]}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && enquiry && (
            <motion.form
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <Legend isDotm={isDotm}>{ENQUIRY_LABELS[enquiry]}</Legend>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className={cn(
                    "font-body text-xs underline",
                    isDotm ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black",
                  )}
                >
                  Change
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shows("city") && (
                  <Text
                    id="city"
                    label="City"
                    value={values.city}
                    onChange={(v) => set("city", v)}
                    isDotm={isDotm}
                    hint={FIELD_HINTS.city}
                  />
                )}
                {shows("date") && (
                  <Text
                    id="event_date"
                    label="Date"
                    type="date"
                    value={values.event_date}
                    onChange={(v) => set("event_date", v)}
                    isDotm={isDotm}
                    hint={FIELD_HINTS.event_date}
                  />
                )}
                {shows("eventType") && (
                  <Text
                    id="event_type"
                    label="Event type"
                    value={values.event_type}
                    onChange={(v) => set("event_type", v)}
                    isDotm={isDotm}
                    hint={FIELD_HINTS.event_type}
                  />
                )}
                {shows("audience") && (
                  <Select
                    id="expected_audience"
                    label="Expected audience"
                    value={values.expected_audience}
                    onChange={(v) => set("expected_audience", v)}
                    options={AUDIENCE_OPTIONS}
                    isDotm={isDotm}
                    hint={FIELD_HINTS.expected_audience}
                  />
                )}
                {shows("budget") && (
                  <Select
                    id="budget_range"
                    label="Budget range"
                    value={values.budget_range}
                    onChange={(v) => set("budget_range", v)}
                    options={BUDGET_OPTIONS}
                    isDotm={isDotm}
                    hint={FIELD_HINTS.budget_range}
                  />
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Text
                  id="contact_name"
                  label="Your name"
                  required
                  autoComplete="name"
                  value={values.contact_name}
                  onChange={(v) => set("contact_name", v)}
                  error={errors.contact_name}
                  isDotm={isDotm}
                  hint={FIELD_HINTS.contact_name}
                />
                <Text
                  id="contact_email"
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={values.contact_email}
                  onChange={(v) => set("contact_email", v)}
                  error={errors.contact_email}
                  isDotm={isDotm}
                  hint={FIELD_HINTS.contact_email}
                />
                <Text
                  id="contact_phone"
                  label="Phone"
                  type="tel"
                  autoComplete="tel"
                  value={values.contact_phone}
                  onChange={(v) => set("contact_phone", v)}
                  isDotm={isDotm}
                  hint={FIELD_HINTS.contact_phone}
                />
              </div>

              <div className="mt-4">
                <Field
                  id="message"
                  label="Anything else"
                  isDotm={isDotm}
                  hint={FIELD_HINTS.message}
                >
                  <textarea
                    id="message"
                    rows={4}
                    value={values.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="The more context, the faster the reply."
                    className={cn(inputClass(isDotm), "resize-none")}
                  />
                </Field>
              </div>

              {errors.form && (
                <p role="alert" className="mt-4 font-body text-sm text-[color:var(--color-danger)]">
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className={cn(
                  "mt-6 w-full py-3 font-chrome text-sm uppercase tracking-[0.2em] transition disabled:opacity-50",
                  isDotm
                    ? "rounded-lg bg-[#ff0033] text-white hover:bg-[#d4002b]"
                    : "win98-border win98-press bg-persona-surface text-black",
                )}
              >
                {sending ? "Sending…" : "Send request"}
              </button>

              {/* Says what happens next. "Send" on its own leaves people
                  wondering whether anyone actually receives this. */}
              <p
                className={cn(
                  "mt-3 text-center font-body text-xs",
                  isDotm ? "text-white/40" : "text-black/50",
                )}
              >
                Goes straight to DOTM&apos;s inbox. You&apos;ll get a reference number
                on the next screen — nothing is shared with anyone else.
              </p>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="py-10 text-center"
              role="status"
            >
              <p
                className={cn(
                  "font-chrome text-xl uppercase tracking-[0.2em]",
                  isDotm && "text-[#ff0033]",
                )}
              >
                Request received
              </p>
              <p
                className={cn(
                  "mx-auto mt-3 max-w-sm font-body text-sm",
                  isDotm ? "text-white/70" : "text-black/70",
                )}
              >
                It&apos;s logged and on its way to the inbox. Expect a reply to{" "}
                <span className="font-semibold">{values.contact_email}</span>.
              </p>
              {reference && (
                <p
                  className={cn(
                    "mt-4 font-chrome text-xs tracking-widest",
                    isDotm ? "text-white/40" : "text-black/45",
                  )}
                >
                  REF {reference}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setEnquiry(null);
                  setValues(EMPTY);
                  setReference(null);
                }}
                className={cn(
                  "mt-6 px-5 py-2 font-body text-sm underline",
                  isDotm ? "text-white/70 hover:text-white" : "text-black/70 hover:text-black",
                )}
              >
                Send another
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ primitives */

function inputClass(isDotm: boolean) {
  return cn(
    "w-full px-3 py-2 font-body text-sm outline-none",
    isDotm
      ? "rounded-md bg-white/5 text-white ring-1 ring-white/15 focus:ring-2 focus:ring-[#ff0033]"
      : "win98-border bg-white text-black focus:ring-2 focus:ring-[#0a2f5c]",
  );
}

function Steps({ step, isDotm }: { step: number; isDotm: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1 w-8 rounded-full transition-colors",
            i <= step
              ? isDotm
                ? "bg-[#ff0033]"
                : "bg-[#0a2f5c]"
              : isDotm
                ? "bg-white/15"
                : "bg-black/20",
          )}
        />
      ))}
    </div>
  );
}

function Legend({ children, isDotm }: { children: React.ReactNode; isDotm: boolean }) {
  return (
    <p
      className={cn(
        "font-chrome text-sm uppercase tracking-[0.2em]",
        isDotm ? "text-white/70" : "text-black/70",
      )}
    >
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  isDotm,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  isDotm: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={cn(
          "mb-1 block font-chrome text-[11px] uppercase tracking-[0.18em]",
          isDotm ? "text-white/55" : "text-black/60",
        )}
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p
          className={cn(
            "mt-1 font-body text-[11px]",
            isDotm ? "text-white/35" : "text-black/45",
          )}
        >
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 font-body text-[11px] text-[color:var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function Text({
  id,
  label,
  value,
  onChange,
  isDotm,
  type = "text",
  hint,
  error,
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  isDotm: boolean;
  type?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} isDotm={isDotm}>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(isDotm)}
      />
    </Field>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  isDotm,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  isDotm: boolean;
  hint?: string;
}) {
  return (
    <Field id={id} label={label} isDotm={isDotm} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(isDotm)}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default BookDotm;
