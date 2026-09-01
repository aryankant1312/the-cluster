"use client";

import { useCallback, useEffect, useState } from "react";
import { changeKeyFor, statPanels } from "@/content/stat-panels";

/**
 * Admin console: the numbers, the booking inbox, the reported-post queue and
 * the subscriber list.
 *
 * Plain white and deliberately unstyled. This is a tool, not part of the
 * experience, and it should look obviously different from the public site so
 * it is never mistaken for one — the near-black chrome it replaces read like
 * yet another persona surface.
 *
 * Every Live Stats field is generated from `content/stat-panels.ts`, the same
 * module the stats window renders from. Adding a metric there makes a field
 * appear here on its own, which is what stops the two drifting apart — a
 * field with no panel, or a panel with no field, was the failure mode of the
 * hand-written list this replaces.
 */

interface Booking {
  id: string;
  enquiry_type: string;
  city: string;
  event_date: string;
  event_type: string;
  expected_audience: string;
  budget_range: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  message: string;
  status: string;
  created_at: string;
  emailed: number;
}

interface ReportedPost {
  id: string;
  author: string;
  body: string;
  media_url: string;
  created_at: string;
  report_count: number;
}

interface ManualStat {
  key: string;
  value: string;
  updated_at: string;
}

interface Subscriber {
  email: string;
  source: string;
  created_at: string;
}

interface Payload {
  ok: true;
  bookings: Booking[];
  reported: ReportedPost[];
  manual: ManualStat[];
  subscribers: Subscriber[];
}

/**
 * The two desktop counters. These are not Live Stats panels — they drive the
 * figures that animate on the wallpaper — so they stay their own short list.
 */
const DESKTOP_FIELDS: Array<{
  key: string;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: "instagram_followers",
    label: "Instagram followers",
    hint: "Added to YouTube subscribers to make the Cluster figure.",
    placeholder: "48200",
  },
  {
    key: "youtube_subscribers",
    label: "YouTube subscribers",
    hint: "Added to Instagram followers to make the Cluster figure.",
    placeholder: "12400",
  },
  {
    key: "media_outreach",
    label: "Media outreach",
    hint: "Shown as-is. Defaults to 50,00,000 when left blank.",
    placeholder: "5000000",
  },
];

/**
 * The row a typed figure goes into.
 *
 * NOT the metric's own key. `scripts/sync-stats.mjs` writes `cache:<key>`
 * every two days, and the resolver prefers an override over it — so an
 * override has to live somewhere the sync never touches, and has to start
 * empty. Typing into the bare `<key>` row instead would put a permanent
 * thumb on the scale: a number entered once would outrank every future
 * sync, with nothing on screen to say the figure had stopped moving.
 */
const overrideKeyFor = (metricKey: string) => `override:${metricKey}`;

/** What the sync job last collected for a metric, and when. Read-only here. */
const syncedKeyFor = (metricKey: string) => `cache:${metricKey}`;
const fetchedAtKeyFor = (metricKey: string) => `fetched_at:${metricKey}`;

/**
 * Every Live Stats row this page writes: each figure's override, and the
 * percentage change entered beside it.
 *
 * Both are derived from the figures' own keys by the same functions the
 * window and the resolver read them with, so a field here and a pill there
 * can never end up pointing at different rows.
 */
const PANEL_KEYS = statPanels.flatMap((p) =>
  p.metrics.flatMap((m) => [overrideKeyFor(m.key), changeKeyFor(m.key)]),
);

/** Every `manual_stats` key this page can write. */
const ALL_STAT_KEYS: string[] = [...PANEL_KEYS, ...DESKTOP_FIELDS.map((f) => f.key)];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const applyPayload = useCallback((payload: Payload) => {
    setData(payload);
    setAuthed(true);
    setValues(
      Object.fromEntries(
        ALL_STAT_KEYS.map((key) => [
          key,
          payload.manual.find((m) => m.key === key)?.value ?? "",
        ]),
      ),
    );
  }, []);

  /** Re-read everything. Called from handlers after a successful write. */
  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.ok) {
      applyPayload((await res.json()) as Payload);
      return;
    }
    setAuthed(false);
    if (res.status === 503) {
      const body = (await res.json()) as { error: string };
      setError(body.error);
    }
  }, [applyPayload]);

  // The first load, as a promise chain rather than an awaited call: the state
  // updates then land in the network's own callback, which is what an effect
  // is for. An `await` in the effect body reads instead as a synchronous
  // cascade of renders.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin")
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          applyPayload((await res.json()) as Payload);
          return;
        }
        setAuthed(false);
        if (res.status === 503) {
          const body = (await res.json()) as { error: string };
          if (!cancelled) setError(body.error);
        }
      })
      .catch(() => {
        // Unreachable API. The sign-in form is already what renders when
        // `authed` is false, so there is nothing further to do here.
      });
    return () => {
      cancelled = true;
    };
  }, [applyPayload]);

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      setError(body.ok ? null : (body.error ?? "Something went wrong."));
      return body.ok;
    } finally {
      setBusy(false);
    }
  };

  const savedValue = (key: string) => data?.manual.find((m) => m.key === key)?.value ?? "";

  /**
   * Writes only the fields that actually changed. Saving all ten every time
   * bumped `updated_at` on rows nobody had touched, which made the timestamps
   * useless for telling when a figure was last checked.
   */
  const saveStats = async (keys: string[]) => {
    const changed = keys.filter((key) => (values[key] ?? "") !== savedValue(key));
    if (changed.length === 0) {
      setNotice("Nothing changed.");
      return;
    }
    for (const key of changed) {
      if (!(await act({ action: "set_manual_stat", key, value: values[key] ?? "" }))) return;
    }
    await load();
    setNotice(`Saved ${changed.length} figure${changed.length === 1 ? "" : "s"}.`);
  };

  const edit = (key: string) => (value: string) => {
    setNotice(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6 text-gray-900">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act({ action: "login", password })) {
              setPassword("");
              await load();
            }
          }}
          className="w-full max-w-sm rounded-lg border border-gray-300 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold">Cluster admin</h1>
          <label htmlFor="pw" className="mt-4 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded bg-gray-900 py-2 font-medium text-white disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold">Cluster admin</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await act({ action: "logout" });
                setAuthed(false);
                setData(null);
              }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800"
          >
            {notice}
          </p>
        )}

        {/* ── Live Stats panels ─────────────────────────────────────────── */}
        <Section title="Live Stats">
          <p className="mb-5 max-w-2xl text-sm text-gray-600">
            The figures the Stats window shows in both views. None of these has a public
            API, so they are kept by hand here. Leave a field blank and that metric shows a
            dash rather than a number nobody entered. Changes appear on the next page load.
          </p>
          <p className="mb-5 max-w-2xl text-sm text-gray-600">
            <strong className="font-semibold">Change %</strong> is the movement on the
            previous period, and it is what draws the little green or red pill beside the
            figure in the window. Sign it: <code>12</code> or <code>+12</code> reads as up,{" "}
            <code>-4</code> as down, <code>0</code> as held. A trailing <code>%</code> is
            fine. Leave it blank and no pill is drawn at all — which is not the same as
            entering 0, and is the right state for a figure whose movement you have not
            checked.
          </p>

          {statPanels.map((panel) => (
            <div key={panel.id} className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: panel.accent }}
                />
                {panel.label}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {panel.metrics.map((metric) => {
                  const change = changeKeyFor(metric.key);
                  const override = overrideKeyFor(metric.key);
                  const synced = data?.manual.find((m) => m.key === syncedKeyFor(metric.key))?.value;
                  const fetchedAt = data?.manual.find(
                    (m) => m.key === fetchedAtKeyFor(metric.key),
                  )?.value;
                  const overridden = (values[override] ?? "").trim() !== "";
                  return (
                    <div
                      key={metric.key}
                      className="rounded border border-gray-200 p-3"
                    >
                      <div className="grid grid-cols-[1fr_7rem] gap-3">
                        <NumberField
                          id={override}
                          label={metric.label}
                          hint={metric.description}
                          value={values[override] ?? ""}
                          onChange={edit(override)}
                          updatedAt={data?.manual.find((m) => m.key === override)?.updated_at}
                        />
                        <NumberField
                          id={change}
                          label="Change %"
                          hint="vs. previous period"
                          placeholder="+12"
                          inputMode="text"
                          value={values[change] ?? ""}
                          onChange={edit(change)}
                          updatedAt={data?.manual.find((m) => m.key === change)?.updated_at}
                        />
                      </div>

                      {/*
                        What the sync job last collected, always shown even when
                        an override is hiding it. An override that has silently
                        gone stale is the failure this line exists to expose:
                        you can see the two numbers disagree, and by how much.
                      */}
                      <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
                        {synced ? (
                          <>
                            <span className="font-medium text-gray-700">
                              Synced: {Number(synced).toLocaleString("en-IN")}
                            </span>
                            {fetchedAt && (
                              <> · {new Date(fetchedAt).toLocaleDateString()} </>
                            )}
                            {overridden ? (
                              <span className="text-amber-700">
                                — your figure above is being shown instead
                              </span>
                            ) : (
                              <span> — shown on the site</span>
                            )}
                          </>
                        ) : (
                          <>
                            Nothing synced for this one
                            {metric.source === "manual"
                              ? " — no API or public page carries it, so the figure above is the only source."
                              : " yet. Run the sync, or enter a figure above."}
                          </>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveStats(PANEL_KEYS)}
              className="rounded bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Save Live Stats
            </button>

            {/*
              A link out rather than a button that dispatches the workflow from
              here. Dispatching would need a GitHub token stored in Vercel, an
              authenticated endpoint to hold it, and an expiry date to forget —
              three moving parts to save one click.
            */}
            <a
              href="https://github.com/aryankant1312/the-cluster/actions/workflows/sync-stats.yml"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              Refresh the synced figures ↗
            </a>
            <span className="text-xs text-gray-500">
              Runs on its own every two days. Use &ldquo;Run workflow&rdquo; there to fetch now.
            </span>
          </div>
        </Section>

        {/* ── Desktop counters ──────────────────────────────────────────── */}
        <Section title="Desktop counters">
          <p className="mb-4 max-w-2xl text-sm text-gray-600">
            The two figures that animate on the DOTM and DEV wallpapers. Cluster is
            Instagram + YouTube added together.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {DESKTOP_FIELDS.map((field) => (
              <NumberField
                key={field.key}
                id={field.key}
                label={field.label}
                hint={field.hint}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={edit(field.key)}
                updatedAt={data?.manual.find((m) => m.key === field.key)?.updated_at}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveStats(DESKTOP_FIELDS.map((f) => f.key))}
            className="mt-4 rounded bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            Save counters
          </button>
        </Section>

        {/* ── Subscribers ───────────────────────────────────────────────── */}
        <Section title={`Newsletter subscribers (${data?.subscribers.length ?? 0})`}>
          {!data || data.subscribers.length === 0 ? (
            <p className="text-sm text-gray-600">Nobody has signed up yet.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    data.subscribers.map((s) => s.email).join("\n"),
                  )
                }
                className="mb-3 rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Copy all addresses
              </button>
              <ul className="divide-y divide-gray-200 rounded border border-gray-200">
                {data.subscribers.map((s) => (
                  <li
                    key={s.email}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{s.email}</span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {s.source || "unknown"} · {s.created_at.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        {/* ── Moderation ────────────────────────────────────────────────── */}
        <Section title={`Reported posts (${data?.reported.length ?? 0})`}>
          {!data || data.reported.length === 0 ? (
            <p className="text-sm text-gray-600">Nothing flagged.</p>
          ) : (
            <ul className="space-y-3">
              {data.reported.map((p) => (
                <li key={p.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm">
                        {p.body || <em className="text-gray-500">no text</em>}
                      </p>
                      {p.media_url && (
                        <p className="mt-1 truncate text-xs text-gray-600">{p.media_url}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {p.author || "Anonymous"} · {p.report_count} report
                        {p.report_count === 1 ? "" : "s"} · {p.created_at.slice(0, 10)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await act({ action: "remove_post", post_id: p.id });
                        await load();
                      }}
                      className="shrink-0 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Take down
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── Bookings ──────────────────────────────────────────────────── */}
        <Section title={`Booking requests (${data?.bookings.length ?? 0})`}>
          {!data || data.bookings.length === 0 ? (
            <p className="text-sm text-gray-600">No requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.bookings.map((b) => (
                <li key={b.id} className="rounded border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {b.enquiry_type.replace(/_/g, " ")} — {b.city || "no city"}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {b.contact_name} · {b.contact_email}
                        {b.contact_phone && ` · ${b.contact_phone}`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {[b.event_date, b.event_type, b.expected_audience, b.budget_range]
                          .filter(Boolean)
                          .join(" · ") || "no details"}
                      </p>
                      {b.message && <p className="mt-2 text-sm text-gray-700">{b.message}</p>}
                      <p className="mt-2 text-xs text-gray-400">
                        {b.id} · {b.created_at.slice(0, 16).replace("T", " ")} ·{" "}
                        {b.emailed ? "emailed" : "not emailed"}
                      </p>
                    </div>
                    <select
                      aria-label={`Status for ${b.id}`}
                      value={b.status}
                      disabled={busy}
                      onChange={async (e) => {
                        await act({
                          action: "booking_status",
                          booking_id: b.id,
                          status: e.target.value,
                        });
                        await load();
                      }}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      {["new", "read", "replied", "archived"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </main>
  );
}

function NumberField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  updatedAt,
  /**
   * `numeric` for a plain count, `text` for anything that can carry a sign.
   *
   * iOS renders the numeric keypad with no minus key, so a Change % field
   * declared numeric is a field a phone cannot type -4 into.
   */
  inputMode = "numeric",
}: {
  id: string;
  label: string;
  hint: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** ISO-8601 UTC. Shown as a date, so a stale figure is obvious at a glance. */
  updatedAt?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label htmlFor={`stat-${id}`} className="block text-sm font-medium text-gray-800">
        {label}
      </label>
      <input
        id={`stat-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder ?? "—"}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 tabular-nums outline-none focus:border-gray-900"
      />
      <p className="mt-1 text-xs leading-snug text-gray-500">{hint}</p>
      {updatedAt && (
        <p className="mt-0.5 text-xs text-gray-400">Updated {updatedAt.slice(0, 10)}</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
