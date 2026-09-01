/**
 * THE DNA OF DOTM — the About page as a route the visitor travels rather
 * than a biography they have to read.
 *
 * `year` and `metric` are empty wherever the real figure is unconfirmed. The
 * timeline hides empty values instead of showing a plausible-looking date,
 * because this is the first thing a new visitor uses to judge the story.
 */

export type MilestoneKind = "origin" | "release" | "milestone" | "broadcast" | "now";

export interface Milestone {
  id: string;
  /** `YYYY`, or empty while unconfirmed. */
  year: string;
  label: string;
  detail: string;
  /** Headline number for this beat, e.g. "100K". Empty when unconfirmed. */
  metric: string;
  kind: MilestoneKind;
}

export const dnaTimeline: Milestone[] = [
  {
    id: "origin",
    year: "",
    label: "Origin",
    detail: "The first bars, written before anyone was listening.",
    metric: "",
    kind: "origin",
  },
  {
    id: "first-release",
    year: "",
    label: "First release",
    detail: "The catalogue starts. Independent, self-produced.",
    metric: "",
    kind: "release",
  },
  {
    id: "first-100k",
    year: "",
    label: "First 100K listeners",
    detail: "The point the audience stopped being friends and family.",
    metric: "100K",
    kind: "milestone",
  },
  {
    id: "mtv-hustle",
    year: "",
    label: "MTV Hustle",
    detail: "Season 04. National television, live performance, original tracks.",
    metric: "S04",
    kind: "broadcast",
  },
  {
    id: "therapy-session",
    year: "",
    label: "Therapy Session pt.1",
    detail: "The first body of work built as a project rather than singles.",
    metric: "",
    kind: "release",
  },
  {
    id: "bhala-kyun",
    year: "",
    label: "Bhala Kyun",
    detail: "The track that reached furthest past the existing audience.",
    metric: "",
    kind: "release",
  },
  {
    id: "brand-era",
    year: "",
    label: "Nothing × CMF",
    detail: "Campaign face for CMF Phone 2 — artist as collaborator, not soundtrack.",
    metric: "",
    kind: "milestone",
  },
  {
    id: "today",
    year: "",
    label: "Today",
    detail: "Finding Peace, the Cluster, and whatever is being built in the dark.",
    metric: "",
    kind: "now",
  },
];
